"""Pipeline: plan -> implement -> gate -> review -> patch (<= N) -> commit -> PR.

State machine is short and re-entrant. Each step writes to the SQLite store
and appends an event so a later `run_pipeline(..., resume_from=...)` call can
pick up where this one left off. Per-run `trace_id` lets `factory --trace`
group events by pipeline invocation.
"""

from __future__ import annotations

import subprocess
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from procurement_lab.run_evidence import (
    REPO_NAME,
    SANDBOX_PENDING_PLACEHOLDER,
    aggregate_gate_results,
    build_repo_uri,
    build_run_evidence_fields,
    emit_event,
    emit_run,
    make_event,
    now_iso,
    to_relative_repo_path,
)

from .artifacts import ArtifactStore
from .blast_radius import BlastRadiusFinding, evaluate_blast_radius
from .contract import (
    ContractViolation,
    validate_artifact_content,
    validate_contract,
    validate_first_action,
    validate_interfaces,
    validate_test_bite,
    validate_unhappy_path_actions,
)
from .defects import (
    DefectEntry,
    append_defect,
    mark_gate_defects_resolved,
    read_defects,
    unresolved_defects,
)
from .handoffs import write_handoff_packet
from .learning import recurring_failures
from .next_features import update_status_md
from .state import Store
from .stop_reasons import StopReason
from .task import Task
from .triage import Triage, classify_terminal_state
from .workers import (
    GateOutcome,
    GateWorker,
    Worker,
    WorkerResult,
    resolve_worker,
)
from .worktree import (
    WorktreeError,
    WorktreeInfo,
    commit_all,
    create_worktree,
    diff_content,
    diff_stat,
    has_uncommitted_changes,
    push_branch,
)

# ------------------------------------------------------------------ run evidence

# Where the run-evidence emitter writes its append-only ledger and final
# Run record. These mirror the directories walked by
# scripts/validate_run_evidence.py.
REPO_ROOT = Path(__file__).resolve().parents[2]
EVENT_LEDGER_DIR = REPO_ROOT / "ops" / "event-ledger"
RUN_RECORDS_DIR = REPO_ROOT / "ops" / "run-records"
FACTORY_DEFECTS_DIR = REPO_ROOT / "ops" / "factory-defects"
HANDOFFS_DIR = REPO_ROOT / "ops" / "handoffs"

# Known factory workers form the canonical tool surface for hashing.
KNOWN_WORKERS = ("claude_code", "codex", "stub")

# Default actor for emitted events. The factory itself is a system actor;
# downstream consumers dispatch on event.type.
FACTORY_ACTOR_KIND = "system"
FACTORY_ACTOR_ID = "procurement-lab-factory"


# ------------------------------------------------------------------ prompts


PLAN_PROMPT = """\
You are the planning agent in a software-engineering factory.

Your working directory IS {cwd}. The git branch is {branch} (from base
{base_branch}). Risk level: {risk}.

Use the Bash tool with `ls -la` and `cat` to see what files already exist
in the working directory BEFORE planning. Then read the relevant existing
content (scaffold READMEs, foundation specs, etc.) so your plan is grounded
in what is actually there.

GOAL (what to ship):
{goal}

{contract}
Your plan's FILES TO CREATE list must cover every required artifact and module
source in the definition of done above.

Produce a numbered plan (5-12 steps). Format each step as:

  N. <ACTION> <PATH> -- <one-sentence reason>

where ACTION is one of:
  CREATE   - new file at PATH that does not exist yet
  EDIT     - modify an existing file at PATH
  RUN      - execute a command (lint, test, build)

End the plan with two explicit lists:

  FILES TO CREATE:
  - <path>
  - <path>

  FILES THAT MUST NOT BE MODIFIED:
  - <every file outside the plan's CREATE/EDIT lists>

This second list is a guard for the implementer. If the goal says "draft
specs/0002-design/", do NOT include specs/0001-foundation/ files in the
EDIT list -- they go in the MUST-NOT list.

Finally, one paragraph naming the riskiest decision in the plan.
"""

IMPLEMENT_PROMPT_BASE = """\
You are the implementation agent in a software-engineering factory. Your
working directory IS {cwd}.

USE YOUR FILE-EDITING TOOLS to make the changes:
- Use the Write tool to CREATE new files at the exact paths in
  "FILES TO CREATE".
- Use the Edit tool to MODIFY existing files only when the plan lists them
  explicitly.
- Use the Bash tool for RUN steps (lint, test, build).
- DO NOT touch any file in the plan's "FILES THAT MUST NOT BE MODIFIED"
  list. This is the most common failure mode -- agents drift into editing
  the scaffold's existing specs instead of creating new ones.

After making the edits, verify your own work:
- Run `ls -la <directory>` to confirm each "FILES TO CREATE" file exists.
- If a CREATE file is missing, retry the Write call. Do not stop until
  every CREATE file is on disk.
- Print a short summary in this exact shape:

    CREATED:
    - <path>
    - <path>
    EDITED:
    - <path>
    SKIPPED:
    - <path: reason>

GOAL (what to ship):
{goal}

{contract}
Constraints:
- Stay within {cwd}.
- Do not run `pip install`, `npm install`, or `uv sync` unless the plan
  has a RUN step that calls for it.
- Do not push, open PRs, or invoke `gh` -- the factory does that.
- If you cannot complete a CREATE step (e.g. missing data, tool not
  available), STOP and write a single-line ERROR: <reason> to stdout so
  the review step can see it; do not silently skip.
"""

IMPLEMENT_PROMPT = (
    IMPLEMENT_PROMPT_BASE
    + """

PLAN (from the planner):
{plan}
"""
)

# Patch-round prompt: keeps every piece of the round-0 prompt (working dir,
# tool guidance, anti-pattern warnings, verification checklist) PLUS adds
# the reviewer's findings. Without the full context the agent has nothing
# to ground its patch in and tends to no-op or re-introduce the same bugs.
IMPLEMENT_PATCH_PROMPT = (
    IMPLEMENT_PROMPT_BASE
    + """

ORIGINAL PLAN (from the planner):
{plan}

PRIOR REVIEW FINDINGS to address in this round:
{findings}

Apply patches that address each finding. If a finding is wrong or already
resolved, write a one-line note in your output naming the finding and the
reason -- but the default action is to fix.
"""
)

REVIEW_PROMPT = """\
You are the review agent. The implementer edited the worktree at {cwd}.

Diff summary against base {base_branch}:
{diff_stat}

Full diff (read the actual code — do not approve a change you have not read):
{diff_body}

Gate results:
{gate_results}

Original goal:
{goal}

The diff above is the change. Use Bash for `git status --porcelain` or the full
`git diff {base_branch}...HEAD` only if the diff was truncated and you need more.

Task: read the changes against the goal and the gate results, then report
in this EXACT shape. The FIRST LINE of your reply MUST be one of:

  STATUS: CLEAN
  STATUS: NEEDS_PATCH
  STATUS: REJECT

Followed by:

  FINDINGS:
  - <bullet 1>
  - <bullet 2>

If you write prose instead of the structured header, the parser falls
back to NEEDS_PATCH and the factory burns a patch round. Output the
literal `STATUS: <verdict>` line FIRST, then your analysis.

Verdict rules (apply them strictly; the factory respects your verdict):

- "CLEAN" -- the artifact is shippable. Use this when:
    * every must-pass gate passed, AND
    * the diff matches the goal, AND
    * no files outside scope were modified, AND
    * any remaining issues are polish (typos, prose improvements, minor
      consistency nits, deferred-to-v0.2 ideas).
  Polish findings are encouraged but DO NOT block. List them under
  FINDINGS so the operator sees them, but still return CLEAN.

- "NEEDS_PATCH" -- ONLY when something materially blocks shipping:
    * a required file is missing (gate `*-exists` failed),
    * a test fails or a build error appears,
    * a scaffold file was modified outside the plan's EDIT list,
    * a security or safety issue (committed secret, unsafe `eval`, etc.),
    * an internal contradiction so severe that a downstream implementer
      could not act on the artifact without guessing.
  Do NOT use NEEDS_PATCH for nice-to-have stylistic improvements,
  alternative phrasings, or speculative future-version concerns.

- "REJECT" -- the plan itself is wrong; the factory stops.

Be terse. The factory caps patch rounds; spending all of them on polish
prevents the actual blocking issues from being caught. Bias toward CLEAN
when gates pass.

If CLEAN, list 1-2 things you actually checked by reading the diff (not
vague affirmations) -- this prevents rubber-stamping.
"""


# ------------------------------------------------------------------ result


@dataclass
class PipelineResult:
    ok: bool
    final_status: Literal["done", "failed", "blocked", "awaiting_approval", "rejected"]
    summary: str
    awaiting_checkpoint: str | None = None
    trace_id: str | None = None
    triage: Triage | None = None
    stop_reason: StopReason | None = None


# ------------------------------------------------------------------ run-evidence ledger


@dataclass
class _RunEvidence:
    """Holds the run-id, ledger path, and the events emitted so far.

    The pipeline writes to two surfaces: the in-process SQLite store
    (existing, used for resume) and the run-evidence ledger files
    (cross-repo Event/Run schemas). This helper owns the second surface so
    the call sites stay tidy and gate aggregation can read back its own
    events without re-parsing the JSONL file.
    """

    run_id: str
    spec_id: str
    workspace_id: str
    started_at: str
    ledger_path: Path
    record_path: Path
    worktree_path: Path | None
    events: list[dict[str, Any]]

    def emit(
        self,
        event_type: str,
        payload: dict[str, Any],
        *,
        parent_event_id: str | None = None,
        artifact_id: str | None = None,
    ) -> dict[str, Any]:
        """Build and persist one Event record. Returns the event for chaining."""
        event = make_event(
            event_type=event_type,
            actor_kind=FACTORY_ACTOR_KIND,
            actor_id=FACTORY_ACTOR_ID,
            payload=payload,
            run_id=self.run_id,
            spec_id=self.spec_id,
            artifact_id=artifact_id,
            parent_event_id=parent_event_id,
        )
        emit_event(event, self.ledger_path)
        self.events.append(event)
        return event


def _new_run_evidence(
    task: Task,
    worktree: WorktreeInfo | None,
    spec_path: str | None,
    *,
    ledger_dir: Path = EVENT_LEDGER_DIR,
    records_dir: Path = RUN_RECORDS_DIR,
) -> _RunEvidence:
    """Allocate a run_id and the ledger/record file paths for one pipeline run."""
    run_id = f"run-{uuid.uuid4().hex[:12]}"
    spec_id = spec_path or task.id
    # workspace_id is a workspace identifier per DEC-FACTORY-010, not a file
    # path. Pin it to the repo name so packet consumers can route on it
    # without parsing an absolute Windows path that varies per checkout.
    workspace_id = REPO_NAME
    return _RunEvidence(
        run_id=run_id,
        spec_id=spec_id,
        workspace_id=workspace_id,
        started_at=now_iso(),
        ledger_path=ledger_dir / f"{run_id}.jsonl",
        record_path=records_dir / f"{run_id}.json",
        worktree_path=worktree.path if worktree is not None else None,
        events=[],
    )


def _gate_check_event_type(outcome: GateOutcome) -> str:
    return "gate.check.passed" if outcome.ok else "gate.check.failed"


def _persist_run_evidence(
    evidence: _RunEvidence,
    *,
    task: Task,
    spec_path: str | None,
    final_status: str,
    plan_text: str,
    triage: Triage | None = None,
) -> None:
    """Build the Run record, write it, and emit gate.run.evidence_recorded.

    This is the single terminal point for run-evidence emission. Every
    pipeline return path that has reached the point where ``evidence``
    exists calls this so the ledger and Run record stay in lockstep.
    """
    run = _finalize_run_record(
        evidence=evidence,
        task=task,
        spec_path=spec_path,
        final_status=final_status,
        plan_text=plan_text,
        triage=triage,
    )
    emit_run(run, evidence.record_path)
    populated = [
        name
        for name in (
            "prompt_snapshot_hash",
            "tool_schemas_snapshot_hash",
            "determinism",
            "checkpoint_ref",
            "sandbox_image_ref",
            "gate_results_summary",
        )
        if name in run
    ]
    evidence.emit(
        "gate.run.evidence_recorded",
        {"run_id": evidence.run_id, "fields_populated": populated},
    )


def _finalize_run_record(
    *,
    evidence: _RunEvidence,
    task: Task,
    spec_path: str | None,
    final_status: str,
    plan_text: str,
    triage: Triage | None = None,
) -> dict[str, Any]:
    """Assemble the final Run record dict, populate replay-equivalence fields."""
    status: str = final_status
    # Map pipeline statuses into Run.status enum values.
    status_map = {
        "done": "done",
        "blocked": "needs_review",
        "awaiting_approval": "needs_review",
        "rejected": "cancelled",
        "failed": "failed",
        "running": "running",
    }
    run_status = status_map.get(status, "needs_review")
    finished_at = now_iso()

    # Use task.goal alone (NOT goal + plan_text) so the final Run record's
    # prompt_snapshot_hash matches the hash emitted on pipeline.start. The
    # DEC-FACTORY-008 cross-check requires the two to be byte-equal. The
    # plan text is a derived artifact already recorded in the artifact
    # store, so omitting it here does not lose evidence.
    prompt_text = task.goal
    workers = list(KNOWN_WORKERS)
    # v2-lite: include test_matrix gates in the snapshot so the pipeline.start
    # hash matches the final Run hash (same method on both sides).
    gate_names = [g.display_name() for g in task.all_gates()]
    evidence_fields = build_run_evidence_fields(
        prompt_text=prompt_text,
        system_prompt=None,
        workers=workers,
        gates=gate_names,
        worktree_path=evidence.worktree_path,
        gate_events=evidence.events,
    )

    inputs: list[dict[str, str]] = []
    if spec_path is not None:
        # Convert absolute spec paths into repo:// URIs so the run record
        # is portable across machines. The SHA is the worktree HEAD at
        # emit time; the finalize step rewrites it to the
        # sample-containing commit after that commit lands.
        inputs.append({"kind": "task", "ref": _input_ref_for(spec_path, evidence)})

    run_events: list[dict[str, Any]] = []
    if triage is not None:
        run_events.append(
            {
                "timestamp": finished_at,
                "kind": "terminal_triage",
                "payload": {"triage": triage, "final_status": final_status},
            }
        )

    run: dict[str, Any] = {
        "id": evidence.run_id,
        "spec_id": evidence.spec_id,
        "agent_id": f"procurement-lab-factory@{task.implementer}",
        "runtime": "procurement-lab-factory",
        "workspace_id": evidence.workspace_id,
        "started_at": evidence.started_at,
        "finished_at": finished_at,
        "status": run_status,
        "inputs": inputs,
        # Full event timeline lives in the JSONL ledger keyed by
        # ops/event-ledger/<run_id>.jsonl. Run.events carries only compact
        # record-local annotations such as terminal triage.
        "events": run_events,
        "outputs": [],
    }
    run.update(evidence_fields.fields)
    # DEC-FACTORY-010 sandbox_image_ref off-by-one fix (Option A: two-pass
    # emit). The build_run_evidence_fields helper computes the sandbox
    # ref from `git rev-parse HEAD`, but that resolves to the PARENT
    # commit of the one that will ultimately carry the sample. Replace
    # the populated value with a PENDING placeholder; the
    # scripts/finalize_sandbox_ref.py helper rewrites the record after
    # the regeneration commit lands.
    if "sandbox_image_ref" in run:
        run["sandbox_image_ref"] = SANDBOX_PENDING_PLACEHOLDER
    return run


def _input_ref_for(spec_path: str, evidence: _RunEvidence) -> str:
    """Best-effort conversion of an input spec path into a repo:// URI.

    Falls back to the raw spec path when no derivable SHA exists (no
    worktree, or git lookup failed). The fallback keeps the validator
    tolerant of legacy paths during migration; consumers that strictly
    require URI form should use the finalize step's rewrite pass.
    """
    rel = to_relative_repo_path(spec_path)
    sha = _emit_time_head_sha(evidence.worktree_path)
    if sha is None:
        return spec_path
    return build_repo_uri(sha, rel)


def _emit_time_head_sha(worktree_path: Path | None) -> str | None:
    """Return ``git rev-parse HEAD`` for the worktree, or None on failure."""
    if worktree_path is None:
        return None
    try:
        result = subprocess.run(  # noqa: S603
            ["git", "-C", str(worktree_path), "rev-parse", "HEAD"],  # noqa: S607
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            timeout=10,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None
    head = result.stdout.strip()
    if result.returncode != 0 or not head:
        return None
    return head


# ------------------------------------------------------------------ helpers


def _run_worker(worker: Worker, prompt: str, cwd: Path) -> WorkerResult:
    return worker.run(prompt, cwd=cwd, timeout=1800)


def _format_gate_results(outcomes: list[GateOutcome]) -> str:
    if not outcomes:
        return "(no gates)"
    lines: list[str] = []
    for outcome in outcomes:
        marker = "ok" if outcome.ok else "FAIL"
        lines.append(f"  [{marker}] {outcome.name} ({outcome.cmd})")
        if not outcome.ok and outcome.stderr.strip():
            head = outcome.stderr.strip().splitlines()[0][:140]
            lines.append(f"        stderr head: {head}")
    return "\n".join(lines)


def _task_has_contract_gates(task: Task) -> bool:
    return bool(
        task.active
        or task.expected_artifacts
        or task.module_map
        or task.test_bite.enabled
        or task.unhappy_path_actions
    )


def _run_contract_gates(
    task: Task,
    repo_root: Path,
    *,
    behavioral: bool = True,
) -> list[GateOutcome]:
    """Convert active-MVP contract checks into ordinary gate outcomes.

    ``behavioral`` controls whether the behavioral validators (which import the
    real modules and execute the first-user-action) run. They need a real
    implementation, so orchestration tests that use stub fixtures pass
    behavioral=False to exercise the gate flow without real execution; real
    factory runs keep it True.
    """
    violations = validate_contract(
        repo_root,
        active=task.active,
        artifacts=task.expected_artifacts,
        modules=task.module_map,
    )
    if violations:
        return [_violation_to_outcome(violation) for violation in violations]

    # Presence passed -> behavioral checks (gap-register fix #3). A presence gate
    # is satisfied by a 1-byte stub with the right name; these catch the slop it
    # misses: declared interfaces must actually exist, committed artifacts must be
    # real (not stub/placeholder), and the first-user-action must run.
    if behavioral:
        found: list[ContractViolation] = []
        if task.module_map:
            found.extend(validate_interfaces(repo_root, task.module_map))
        if task.expected_artifacts:
            found.extend(validate_artifact_content(repo_root, task.expected_artifacts))
        if task.first_user_action:
            found.extend(validate_first_action(repo_root, task.first_user_action))
        if task.test_bite.enabled:
            found.extend(validate_test_bite(repo_root, task.module_map, task.test_bite))
        if task.unhappy_path_actions:
            found.extend(validate_unhappy_path_actions(repo_root, task.unhappy_path_actions))
        if found:
            return [_violation_to_outcome(violation) for violation in found]

    outcomes: list[GateOutcome] = []
    if task.active:
        outcomes.append(
            GateOutcome(
                name="contract:active-repo-files",
                cmd="factory contract active-repo-files",
                ok=True,
                must_pass=True,
                stdout="PRODUCT_BRIEF.md, SYSTEM_MAP.md, and STATUS.md present",
                stderr="",
            )
        )
    if task.expected_artifacts:
        outcomes.append(
            GateOutcome(
                name="contract:expected-artifacts",
                cmd="factory contract expected-artifacts",
                ok=True,
                must_pass=True,
                stdout="expected artifacts present",
                stderr="",
            )
        )
    if task.module_map:
        outcomes.append(
            GateOutcome(
                name="contract:module-map",
                cmd="factory contract module-map",
                ok=True,
                must_pass=True,
                stdout="module sources present",
                stderr="",
            )
        )
    if task.test_bite.enabled:
        outcomes.append(
            GateOutcome(
                name="contract:test-bite",
                cmd="factory contract test-bite",
                ok=True,
                must_pass=True,
                stdout="mutated module sources caused tests to fail",
                stderr="",
            )
        )
    if task.unhappy_path_actions:
        outcomes.append(
            GateOutcome(
                name="contract:unhappy-path",
                cmd="factory contract unhappy-path",
                ok=True,
                must_pass=True,
                stdout="configured unhappy-path commands failed cleanly",
                stderr="",
            )
        )
    return outcomes


def _violation_to_outcome(violation: ContractViolation) -> GateOutcome:
    return GateOutcome(
        name=violation.gate_name(),
        cmd="factory contract",
        ok=False,
        must_pass=violation.required,
        stdout="",
        stderr=violation.message,
    )


def _run_pre_commit_hard_gates(task: Task, worktree: WorktreeInfo) -> list[GateOutcome]:
    findings = evaluate_blast_radius(
        worktree.path,
        base_branch=worktree.base_branch,
        spec=task.blast_radius,
    )
    if not findings:
        return [
            GateOutcome(
                name="precommit:hard-gates",
                cmd="factory pre-commit hard gates",
                ok=True,
                must_pass=True,
                stdout="blast radius, diff size, and sensitive-disclosure checks passed",
                stderr="",
            )
        ]
    return [_blast_radius_finding_to_outcome(finding) for finding in findings]


def _blast_radius_finding_to_outcome(finding: BlastRadiusFinding) -> GateOutcome:
    suffix = _safe_kind(finding.path) if finding.path else "summary"
    return GateOutcome(
        name=f"precommit:{finding.code}:{suffix}",
        cmd="factory pre-commit hard gates",
        ok=False,
        must_pass=True,
        stdout="",
        stderr=finding.message,
    )


def _append_gate_defects(
    task: Task,
    outcomes: list[GateOutcome],
    *,
    round_idx: int,
    defects_dir: Path,
) -> None:
    for outcome in outcomes:
        if outcome.ok:
            continue
        append_defect(
            task.id,
            DefectEntry(
                kind="gate.failed",
                gate_or_finding=outcome.name,
                round=round_idx,
                phase=getattr(task, "phase", "impl"),
                persona=getattr(task, "persona", "default"),
                summary=outcome.stderr.strip() or f"gate {outcome.name} failed",
            ),
            defects_dir,
        )


def _append_review_defect(
    task: Task,
    *,
    kind: str,
    finding: str,
    round_idx: int,
    defects_dir: Path,
) -> None:
    append_defect(
        task.id,
        DefectEntry(
            kind=kind,
            gate_or_finding=finding.splitlines()[0][:120] if finding else kind,
            round=round_idx,
            phase=getattr(task, "phase", "impl"),
            persona=getattr(task, "persona", "default"),
            summary=finding.strip()[:500] if finding else kind,
        ),
        defects_dir,
    )


def _write_terminal_handoff(
    *,
    task: Task,
    status: str,
    summary: str,
    trace_id: str | None,
    target_repo: Path,
    triage: Triage | None,
    stop_reason: StopReason | None,
    handoff_dir: Path,
    defects_dir: Path,
    next_items: list[str] | None = None,
) -> None:
    defects = unresolved_defects(task.id, defects_dir)
    write_handoff_packet(
        task_id=task.id,
        title=task.title,
        status=status,
        summary=summary,
        trace_id=trace_id,
        target_repo=target_repo,
        handoff_dir=handoff_dir,
        triage=triage,
        stop_reason=stop_reason,
        defects=defects,
        next_items=next_items,
    )


def _has_material_diff(worktree: WorktreeInfo) -> bool:
    """Return True when the implementation produced committed or pending changes."""
    return has_uncommitted_changes(worktree.path) or bool(
        diff_stat(worktree.path, worktree.base_branch)
    )


def _gate_results_for_artifact(outcomes: list[GateOutcome]) -> str:
    """Verbose version stored in artifacts (includes full stdout/stderr)."""
    if not outcomes:
        return "(no gates)"
    chunks: list[str] = []
    for outcome in outcomes:
        chunks.append(f"=== gate: {outcome.name} ===")
        chunks.append(f"cmd: {outcome.cmd}")
        chunks.append(f"ok: {outcome.ok}  must_pass: {outcome.must_pass}")
        if outcome.stdout.strip():
            chunks.append("--- stdout ---")
            chunks.append(outcome.stdout)
        if outcome.stderr.strip():
            chunks.append("--- stderr ---")
            chunks.append(outcome.stderr)
        chunks.append("")
    return "\n".join(chunks)


def _open_pr(
    worktree: WorktreeInfo,
    task: Task,
    plan: str,
    review: str,
    *,
    triage: Triage = "PASS",
) -> str | None:
    # An INVESTIGATE triage ships only as a draft with a do-not-merge banner
    # (gap-register fix #5): the work passed must-pass gates but carries review
    # caveats or advisory failures a human should clear before merge.
    banner = (
        "> **INVESTIGATE** — the factory flagged review caveats or advisory gate "
        "failures. Do not merge without a human check.\n\n"
        if triage == "INVESTIGATE"
        else ""
    )
    body_parts = [
        f"{banner}## Goal\n\n{task.goal}\n",
        f"## Plan\n\n{plan or '(no plan recorded)'}\n",
        f"## Review\n\n{review or '(no review recorded)'}\n",
        "## Provenance\n\nfactory: scripts/factory\n",
    ]
    body = "\n".join(body_parts)
    title = task.pr.title_template.format(title=task.title)
    argv = [
        "gh",
        "pr",
        "create",
        "--title",
        title,
        "--body",
        body,
        "--base",
        task.pr.base,
    ]
    if task.pr.draft or triage == "INVESTIGATE":
        argv.append("--draft")
    try:
        result = subprocess.run(  # noqa: S603
            argv,
            cwd=str(worktree.path),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
    except FileNotFoundError:
        return None
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            stripped = line.strip()
            if stripped.startswith("https://"):
                return stripped
        return result.stdout.strip() or None
    return None


def _record_worker_event(
    store: Store,
    task: Task,
    kind: str,
    round_idx: int,
    worker: Worker,
    result: WorkerResult,
    trace_id: str,
    artifact_ref: dict[str, Any] | None = None,
) -> None:
    payload: dict[str, Any] = {
        "round": round_idx,
        "worker": worker.name,
        "thread_id": result.thread_id,
        "run_id": result.run_id,
        "model": result.metadata.get("model"),
        "duration_ms": result.metadata.get("duration_ms"),
        # v2-lite: phase + persona on every worker event so attribution can
        # group events by SDLC stage without re-reading the task row.
        "phase": getattr(task, "phase", None),
        "persona": getattr(task, "persona", None),
    }
    cost_usd = _worker_cost_usd(result)
    if cost_usd is not None:
        payload["cost_usd"] = cost_usd
    if artifact_ref is not None:
        payload["artifact"] = artifact_ref
    store.append_event(task.id, kind, payload, trace_id=trace_id)
    if result.thread_id or result.run_id:
        store.update_task(
            task.id,
            last_thread_id=result.thread_id,
            last_run_id=result.run_id,
        )


def _worker_cost_usd(result: WorkerResult) -> float | None:
    for key in ("cost_usd", "total_cost_usd"):
        value = result.metadata.get(key)
        if isinstance(value, bool):
            continue
        if isinstance(value, (int, float)):
            return float(value)
    return None


def _emit_stop_event(
    store: Store,
    task: Task,
    *,
    trace_id: str | None,
    reason: StopReason,
    summary: str,
    extra: dict[str, Any] | None = None,
) -> None:
    payload: dict[str, Any] = {
        "reason": reason,
        "summary": summary,
    }
    if extra:
        payload.update(extra)
    store.append_event(task.id, "stop", payload, trace_id=trace_id)


def _effective_max_patch_rounds(task: Task) -> int:
    if task.budget.max_patch_rounds is None:
        return task.review.max_patch_rounds
    return min(task.review.max_patch_rounds, task.budget.max_patch_rounds)


def _budget_limit_hit(
    task: Task,
    *,
    started_monotonic: float,
    patch_rounds: int,
    gate_failures: int,
    cost_usd: float,
) -> dict[str, Any] | None:
    budget = task.budget
    elapsed_ms = int((time.monotonic() - started_monotonic) * 1000)
    if budget.max_wall_clock_ms is not None and elapsed_ms > budget.max_wall_clock_ms:
        return {
            "cap": "max_wall_clock_ms",
            "limit": budget.max_wall_clock_ms,
            "observed": elapsed_ms,
        }
    if budget.max_patch_rounds is not None and patch_rounds > budget.max_patch_rounds:
        return {
            "cap": "max_patch_rounds",
            "limit": budget.max_patch_rounds,
            "observed": patch_rounds,
        }
    if budget.max_gate_failures is not None and gate_failures > budget.max_gate_failures:
        return {
            "cap": "max_gate_failures",
            "limit": budget.max_gate_failures,
            "observed": gate_failures,
        }
    if budget.max_cost_usd is not None and cost_usd > budget.max_cost_usd:
        return {
            "cap": "max_cost_usd",
            "limit": budget.max_cost_usd,
            "observed": round(cost_usd, 6),
        }
    return None


def _failure_stop_reason(failure_reason: str | None, *, default: StopReason) -> StopReason:
    reason = (failure_reason or "").lower()
    if "429" in reason or "rate limit" in reason or "rate-limited" in reason:
        return "provider_rate_limited"
    if "budget" in reason or "token limit" in reason:
        return "budget_exhausted"
    if "scope" in reason or "forbidden path" in reason or "allowed_paths" in reason:
        return "scope_violation"
    return default


def _completion_stop_reason(
    task: Task,
    last_outcomes: list[GateOutcome],
    last_review: str,
) -> StopReason:
    if read_defects(task.id, FACTORY_DEFECTS_DIR):
        return "completed_with_rework"
    if any(not outcome.ok for outcome in last_outcomes):
        return "completed_with_rework"
    review_status = _combined_review_status(last_review) if last_review else "CLEAN"
    return "completed_clean" if review_status == "CLEAN" else "completed_with_rework"


def _resolve_worktree(
    task: Task, *, dry_run: bool, store: Store, trace_id: str
) -> tuple[WorktreeInfo | None, str | None]:
    """Return (worktree, error_message). On success error is None."""
    repo = task.repo_path()
    if dry_run:
        wt = WorktreeInfo(
            path=repo,
            branch=f"factory/{task.id}",
            base_branch=task.base_branch,
        )
        store.append_event(
            task.id,
            "worktree.skipped",
            {"reason": "dry_run", "path": str(wt.path)},
            trace_id=trace_id,
        )
        return wt, None
    try:
        wt = create_worktree(repo, task.id, task.base_branch)
    except WorktreeError as cause:
        store.append_event(task.id, "worktree.error", {"error": str(cause)}, trace_id=trace_id)
        return None, str(cause)
    store.append_event(
        task.id,
        "worktree.ready",
        {"path": str(wt.path), "branch": wt.branch},
        trace_id=trace_id,
    )
    return wt, None


# ------------------------------------------------------------------ main entry


def run_pipeline(
    task: Task,
    *,
    store: Store,
    dry_run: bool = False,
    behavioral_contract: bool = True,
    resume_from: str | None = None,
    resume_comment: str | None = None,
    artifact_store: ArtifactStore | None = None,
    spec_path: str | None = None,
    event_ledger_dir: Path | None = None,
    run_records_dir: Path | None = None,
) -> PipelineResult:
    """Run a single task pipeline.

    On first invocation, `resume_from` is None. If the pipeline pauses at a
    checkpoint, the task row is left in `awaiting_approval` status with
    `awaiting_checkpoint` set. A later call with `resume_from` = the
    checkpoint name picks up at the next step.

    The run-evidence ledger writes to ``event_ledger_dir`` and
    ``run_records_dir``; both default to the repo-relative directories
    walked by ``scripts/validate_run_evidence.py``. Tests pass tmp paths to
    keep fixture runs out of committed history.
    """
    trace_id = uuid.uuid4().hex
    pipeline_started_monotonic = time.monotonic()
    artifacts = artifact_store or ArtifactStore()
    store.upsert_task(task.id, task.title, spec_path or task.id)
    store.append_event(
        task.id,
        "pipeline.start",
        {
            "dry_run": dry_run,
            "risk": task.risk,
            "resume_from": resume_from,
            "comment": resume_comment,
            # v2-lite: persisted on the pipeline.start event for run-evidence
            # consumers that don't want to JOIN against the tasks table.
            "phase": getattr(task, "phase", None),
            "persona": getattr(task, "persona", None),
            "test_matrix_size": len(getattr(task, "test_matrix", []) or []),
        },
        trace_id=trace_id,
    )
    store.update_task(
        task.id,
        trace_id=trace_id,
        phase=getattr(task, "phase", None),
        persona=getattr(task, "persona", None),
    )

    # --- worktree ---
    worktree, error = _resolve_worktree(task, dry_run=dry_run, store=store, trace_id=trace_id)
    if worktree is None or error is not None:
        stop_reason: StopReason = "worktree_error"
        summary = error or "worktree resolution failed"
        store.update_task(task.id, status="failed", failure_reason=error or "worktree")
        _emit_stop_event(
            store,
            task,
            trace_id=trace_id,
            reason=stop_reason,
            summary=summary,
        )
        _write_terminal_handoff(
            task=task,
            status="failed",
            summary=summary,
            trace_id=trace_id,
            target_repo=task.repo_path(),
            triage="HOLD",
            stop_reason=stop_reason,
            handoff_dir=HANDOFFS_DIR,
            defects_dir=FACTORY_DEFECTS_DIR,
        )
        return PipelineResult(
            ok=False,
            final_status="failed",
            summary=summary,
            trace_id=trace_id,
            triage="HOLD",
            stop_reason=stop_reason,
        )
    store.update_task(
        task.id,
        status="running",
        current_step="plan",
        worktree_path=str(worktree.path),
        branch=worktree.branch,
        awaiting_checkpoint=None,
    )

    # --- run-evidence ledger init ---
    # Allocate a run_id, open the per-run JSONL ledger, and emit the
    # opening pipeline.start event with the canonical prompt + tool-surface
    # hashes embedded in the payload. The full Run record lands at pipeline
    # end; the ledger captures the timeline along the way.
    evidence = _new_run_evidence(
        task,
        worktree,
        spec_path,
        ledger_dir=event_ledger_dir or EVENT_LEDGER_DIR,
        records_dir=run_records_dir or RUN_RECORDS_DIR,
    )
    initial_fields = build_run_evidence_fields(
        prompt_text=task.goal,
        system_prompt=None,
        workers=list(KNOWN_WORKERS),
        gates=[g.display_name() for g in task.all_gates()],
        worktree_path=evidence.worktree_path,
        gate_events=[],
    )
    evidence.emit(
        "pipeline.start",
        {
            "task_id": task.id,
            "trace_id": trace_id,
            "dry_run": dry_run,
            "risk": task.risk,
            "prompt_snapshot_hash": initial_fields.fields["prompt_snapshot_hash"],
            "tool_schemas_snapshot_hash": initial_fields.fields["tool_schemas_snapshot_hash"],
        },
    )
    budget_hit = _budget_limit_hit(
        task,
        started_monotonic=pipeline_started_monotonic,
        patch_rounds=0,
        gate_failures=0,
        cost_usd=0.0,
    )
    if budget_hit is not None:
        stop_reason = "budget_exhausted"
        summary = f"budget exhausted before planning ({budget_hit['cap']})"
        store.update_task(task.id, status="blocked", failure_reason=summary)
        _emit_stop_event(
            store,
            task,
            trace_id=trace_id,
            reason=stop_reason,
            summary=summary,
            extra={"budget": budget_hit},
        )
        _persist_run_evidence(
            evidence,
            task=task,
            spec_path=spec_path,
            final_status="blocked",
            plan_text="",
            triage="HOLD",
        )
        _write_terminal_handoff(
            task=task,
            status="blocked",
            summary=summary,
            trace_id=trace_id,
            target_repo=worktree.path,
            triage="HOLD",
            stop_reason=stop_reason,
            handoff_dir=HANDOFFS_DIR,
            defects_dir=FACTORY_DEFECTS_DIR,
        )
        return PipelineResult(
            ok=False,
            final_status="blocked",
            summary=summary,
            trace_id=trace_id,
            triage="HOLD",
            stop_reason=stop_reason,
        )

    # --- plan ---
    if resume_from in (None, "plan_review"):
        if resume_from == "plan_review":
            # Plan was produced before the pause; load from artifacts.
            plan_refs = [ref for ref in artifacts.list(task.id) if ref.kind == "plan"]
            if not plan_refs:
                stop_reason: StopReason = "blocked_other"
                summary = "cannot resume: no stored plan"
                store.update_task(
                    task.id,
                    status="failed",
                    failure_reason="resume plan_review but no plan artifact found",
                )
                _emit_stop_event(
                    store,
                    task,
                    trace_id=trace_id,
                    reason=stop_reason,
                    summary=summary,
                )
                _persist_run_evidence(
                    evidence,
                    task=task,
                    spec_path=spec_path,
                    final_status="failed",
                    plan_text="",
                    triage="HOLD",
                )
                _write_terminal_handoff(
                    task=task,
                    status="failed",
                    summary=summary,
                    trace_id=trace_id,
                    target_repo=worktree.path,
                    triage="HOLD",
                    stop_reason=stop_reason,
                    handoff_dir=HANDOFFS_DIR,
                    defects_dir=FACTORY_DEFECTS_DIR,
                )
                return PipelineResult(
                    ok=False,
                    final_status="failed",
                    summary=summary,
                    trace_id=trace_id,
                    triage="HOLD",
                    stop_reason=stop_reason,
                )
            plan_text = artifacts.read(plan_refs[0])
            store.append_event(
                task.id,
                "checkpoint.resumed",
                {"checkpoint": "plan_review", "comment": resume_comment},
                trace_id=trace_id,
            )
        else:
            planner = resolve_worker(task.planner, allow_stub_fallback=True)
            plan_prompt = PLAN_PROMPT.format(
                goal=task.goal,
                contract=task.to_implement_brief(),
                cwd=worktree.path,
                branch=worktree.branch,
                base_branch=worktree.base_branch,
                risk=task.risk,
            )
            started_event = evidence.emit(
                "tool.call.started",
                {
                    "tool_name": planner.name,
                    "args": {
                        "step": "plan",
                        "arguments_digest": "sha256:plan-prompt",
                    },
                },
            )
            plan_result = (
                _run_worker(planner, plan_prompt, worktree.path)
                if not dry_run
                else WorkerResult(
                    ok=True,
                    stdout=f"[dry-run plan via {planner.name}]\n1. step\n2. step",
                    metadata={
                        "thread_id": f"stub-{planner.name}-thread",
                        "run_id": f"stub-{planner.name}-run",
                        "model": "stub-model",
                        "duration_ms": 0,
                    },
                )
            )
            evidence.emit(
                "tool.call.completed",
                {
                    "tool_name": planner.name,
                    "duration_ms": int(plan_result.metadata.get("duration_ms") or 0),
                    "result": {
                        "step": "plan",
                        "status": "ok" if plan_result.ok else "error",
                    },
                },
                parent_event_id=started_event["event_id"],
            )
            if not plan_result.ok:
                stop_reason = _failure_stop_reason(plan_result.stderr, default="blocked_other")
                store.update_task(task.id, status="failed", failure_reason=plan_result.stderr)
                store.append_event(
                    task.id,
                    "plan.failed",
                    {"stderr": plan_result.stderr[:500]},
                    trace_id=trace_id,
                )
                _persist_run_evidence(
                    evidence,
                    task=task,
                    spec_path=spec_path,
                    final_status="failed",
                    plan_text="",
                    triage="HOLD",
                )
                _emit_stop_event(
                    store,
                    task,
                    trace_id=trace_id,
                    reason=stop_reason,
                    summary=plan_result.stderr,
                )
                _write_terminal_handoff(
                    task=task,
                    status="failed",
                    summary=plan_result.stderr,
                    trace_id=trace_id,
                    target_repo=worktree.path,
                    triage="HOLD",
                    stop_reason=stop_reason,
                    handoff_dir=HANDOFFS_DIR,
                    defects_dir=FACTORY_DEFECTS_DIR,
                )
                return PipelineResult(
                    ok=False,
                    final_status="failed",
                    summary=plan_result.stderr,
                    trace_id=trace_id,
                    triage="HOLD",
                    stop_reason=stop_reason,
                )
            plan_text = plan_result.stdout
            plan_ref = artifacts.write(task.id, "plan", 0, plan_text)
            _record_worker_event(
                store,
                task,
                "plan.done",
                0,
                planner,
                plan_result,
                trace_id,
                artifact_ref=plan_ref.to_dict(),
            )
            store.update_task(task.id, plan=plan_text[:4000])

            if task.has_checkpoint("plan_review"):
                stop_reason = "awaiting_approval"
                summary = f"paused at plan_review (artifact {plan_ref.path})"
                store.update_task(
                    task.id,
                    status="awaiting_approval",
                    current_step="await:plan_review",
                    awaiting_checkpoint="plan_review",
                )
                store.append_event(
                    task.id,
                    "checkpoint.paused",
                    {
                        "checkpoint": "plan_review",
                        "artifact": plan_ref.to_dict(),
                    },
                    trace_id=trace_id,
                )
                evidence.emit(
                    "checkpoint.paused",
                    {"checkpoint": "plan_review"},
                )
                _persist_run_evidence(
                    evidence,
                    task=task,
                    spec_path=spec_path,
                    final_status="awaiting_approval",
                    plan_text=plan_text,
                )
                _emit_stop_event(
                    store,
                    task,
                    trace_id=trace_id,
                    reason=stop_reason,
                    summary=summary,
                )
                _write_terminal_handoff(
                    task=task,
                    status="awaiting_approval",
                    summary=summary,
                    trace_id=trace_id,
                    target_repo=worktree.path,
                    triage=None,
                    stop_reason=stop_reason,
                    handoff_dir=HANDOFFS_DIR,
                    defects_dir=FACTORY_DEFECTS_DIR,
                )
                return PipelineResult(
                    ok=True,
                    final_status="awaiting_approval",
                    summary=summary,
                    awaiting_checkpoint="plan_review",
                    trace_id=trace_id,
                    stop_reason=stop_reason,
                )
    else:
        # resume_from == diff_review or pre_pr; load existing plan
        plan_refs = sorted(
            [ref for ref in artifacts.list(task.id) if ref.kind == "plan"],
            key=lambda r: r.round,
        )
        plan_text = artifacts.read(plan_refs[-1]) if plan_refs else ""

    # --- implement / gate / review loop ---
    last_review = ""
    last_outcomes: list[GateOutcome] = []
    if resume_from in (None, "plan_review"):
        last_review, last_outcomes = _run_implement_loop(
            task=task,
            worktree=worktree,
            plan_text=plan_text,
            store=store,
            artifacts=artifacts,
            trace_id=trace_id,
            dry_run=dry_run,
            behavioral_contract=behavioral_contract,
            evidence=evidence,
            started_monotonic=pipeline_started_monotonic,
        )
        if last_review == "__rejected__":
            stop_reason: StopReason = "review_rejected"
            summary = "reviewer returned REJECT"
            triage = classify_terminal_state(
                final_status="rejected",
                gate_outcomes=last_outcomes,
                review_text=last_review,
                triage_policy=task.triage_policy,
            )
            _persist_run_evidence(
                evidence,
                task=task,
                spec_path=spec_path,
                final_status="rejected",
                plan_text=plan_text,
                triage=triage,
            )
            _emit_stop_event(
                store,
                task,
                trace_id=trace_id,
                reason=stop_reason,
                summary=summary,
            )
            _write_terminal_handoff(
                task=task,
                status="rejected",
                summary=summary,
                trace_id=trace_id,
                target_repo=worktree.path,
                triage=triage,
                stop_reason=stop_reason,
                handoff_dir=HANDOFFS_DIR,
                defects_dir=FACTORY_DEFECTS_DIR,
            )
            return PipelineResult(
                ok=False,
                final_status="rejected",
                summary=summary,
                trace_id=trace_id,
                triage=triage,
                stop_reason=stop_reason,
            )
        if last_review == "__budget_exhausted__":
            stop_reason = "budget_exhausted"
            summary = "budget exhausted"
            row = store.get_task(task.id)
            if row is not None and row.failure_reason:
                summary = row.failure_reason
            triage = classify_terminal_state(
                final_status="blocked",
                gate_outcomes=last_outcomes,
                review_text=last_review,
                triage_policy=task.triage_policy,
            )
            _persist_run_evidence(
                evidence,
                task=task,
                spec_path=spec_path,
                final_status="blocked",
                plan_text=plan_text,
                triage=triage,
            )
            _emit_stop_event(
                store,
                task,
                trace_id=trace_id,
                reason=stop_reason,
                summary=summary,
            )
            _write_terminal_handoff(
                task=task,
                status="blocked",
                summary=summary,
                trace_id=trace_id,
                target_repo=worktree.path,
                triage=triage,
                stop_reason=stop_reason,
                handoff_dir=HANDOFFS_DIR,
                defects_dir=FACTORY_DEFECTS_DIR,
            )
            return PipelineResult(
                ok=False,
                final_status="blocked",
                summary=summary,
                trace_id=trace_id,
                triage=triage,
                stop_reason=stop_reason,
            )
        if last_review == "__blocked__":
            row = store.get_task(task.id)
            stop_reason = _failure_stop_reason(
                row.failure_reason if row is not None else None,
                default="gate_failure",
            )
            summary = "exceeded max patch rounds"
            triage = classify_terminal_state(
                final_status="blocked",
                gate_outcomes=last_outcomes,
                review_text=last_review,
                triage_policy=task.triage_policy,
            )
            _persist_run_evidence(
                evidence,
                task=task,
                spec_path=spec_path,
                final_status="blocked",
                plan_text=plan_text,
                triage=triage,
            )
            _emit_stop_event(
                store,
                task,
                trace_id=trace_id,
                reason=stop_reason,
                summary=summary,
            )
            _write_terminal_handoff(
                task=task,
                status="blocked",
                summary=summary,
                trace_id=trace_id,
                target_repo=worktree.path,
                triage=triage,
                stop_reason=stop_reason,
                handoff_dir=HANDOFFS_DIR,
                defects_dir=FACTORY_DEFECTS_DIR,
            )
            return PipelineResult(
                ok=False,
                final_status="blocked",
                summary=summary,
                trace_id=trace_id,
                triage=triage,
                stop_reason=stop_reason,
            )

        if task.has_checkpoint("diff_review"):
            stop_reason = "awaiting_approval"
            summary = "paused at diff_review"
            review_refs = [ref for ref in artifacts.list(task.id) if ref.kind == "review"]
            last_ref = review_refs[-1].to_dict() if review_refs else None
            store.update_task(
                task.id,
                status="awaiting_approval",
                current_step="await:diff_review",
                awaiting_checkpoint="diff_review",
            )
            store.append_event(
                task.id,
                "checkpoint.paused",
                {"checkpoint": "diff_review", "artifact": last_ref},
                trace_id=trace_id,
            )
            evidence.emit(
                "checkpoint.paused",
                {"checkpoint": "diff_review"},
            )
            _persist_run_evidence(
                evidence,
                task=task,
                spec_path=spec_path,
                final_status="awaiting_approval",
                plan_text=plan_text,
            )
            _emit_stop_event(
                store,
                task,
                trace_id=trace_id,
                reason=stop_reason,
                summary=summary,
            )
            _write_terminal_handoff(
                task=task,
                status="awaiting_approval",
                summary=summary,
                trace_id=trace_id,
                target_repo=worktree.path,
                triage=None,
                stop_reason=stop_reason,
                handoff_dir=HANDOFFS_DIR,
                defects_dir=FACTORY_DEFECTS_DIR,
            )
            return PipelineResult(
                ok=True,
                final_status="awaiting_approval",
                summary=summary,
                awaiting_checkpoint="diff_review",
                trace_id=trace_id,
                stop_reason=stop_reason,
            )

    if resume_from == "diff_review":
        store.append_event(
            task.id,
            "checkpoint.resumed",
            {"checkpoint": "diff_review", "comment": resume_comment},
            trace_id=trace_id,
        )
        # rehydrate the latest review text from the artifact store
        review_refs = sorted(
            [ref for ref in artifacts.list(task.id) if ref.kind == "review"],
            key=lambda r: r.round,
        )
        last_review = artifacts.read(review_refs[-1]) if review_refs else ""

    # --- successful active tasks update their target STATUS.md before commit ---
    next_items: list[str] = []
    if task.active and not dry_run:
        next_items = update_status_md(
            worktree.path,
            deferred_items=[],
            open_defects=unresolved_defects(task.id, FACTORY_DEFECTS_DIR),
        )

    # --- pre-commit hard gates ---
    precommit_outcomes = _run_pre_commit_hard_gates(task, worktree)
    for outcome in precommit_outcomes:
        artifacts.write(
            task.id,
            f"gate-{_safe_kind(outcome.name)}",
            0,
            _gate_results_for_artifact([outcome]),
        )
    store.append_event(
        task.id,
        "precommit.done",
        {
            "ok": all(outcome.ok or not outcome.must_pass for outcome in precommit_outcomes),
            "outcomes": [
                {"name": o.name, "ok": o.ok, "must_pass": o.must_pass}
                for o in precommit_outcomes
            ],
        },
        trace_id=trace_id,
    )
    if evidence is not None:
        for outcome in precommit_outcomes:
            if outcome.ok:
                continue
            payload: dict[str, Any] = {
                "gate_name": outcome.name,
                "details": {
                    "cmd": outcome.cmd,
                    "round": 0,
                    "must_pass": outcome.must_pass,
                },
            }
            if not outcome.ok:
                payload["reason"] = (
                    outcome.stderr.strip().splitlines()[0]
                    if outcome.stderr.strip()
                    else f"gate {outcome.name} failed"
                )[:280]
            evidence.emit(_gate_check_event_type(outcome), payload)
    precommit_ok = all(outcome.ok or not outcome.must_pass for outcome in precommit_outcomes)
    if not precommit_ok:
        stop_reason: StopReason = "scope_violation"
        summary = "pre-commit hard gates failed"
        _append_gate_defects(
            task,
            precommit_outcomes,
            round_idx=0,
            defects_dir=FACTORY_DEFECTS_DIR,
        )
        triage = classify_terminal_state(
            final_status="blocked",
            gate_outcomes=precommit_outcomes,
            review_text=last_review,
            triage_policy=task.triage_policy,
        )
        store.update_task(task.id, status="blocked", failure_reason=summary)
        _persist_run_evidence(
            evidence,
            task=task,
            spec_path=spec_path,
            final_status="blocked",
            plan_text=plan_text,
            triage=triage,
        )
        _emit_stop_event(
            store,
            task,
            trace_id=trace_id,
            reason=stop_reason,
            summary=summary,
        )
        _write_terminal_handoff(
            task=task,
            status="blocked",
            summary=summary,
            trace_id=trace_id,
            target_repo=worktree.path,
            triage=triage,
            stop_reason=stop_reason,
            handoff_dir=HANDOFFS_DIR,
            defects_dir=FACTORY_DEFECTS_DIR,
            next_items=next_items,
        )
        return PipelineResult(
            ok=False,
            final_status="blocked",
            summary=summary,
            trace_id=trace_id,
            triage=triage,
            stop_reason=stop_reason,
        )

    # --- commit ---
    sha = commit_all(worktree.path, f"factory: {task.title}") if not dry_run else None
    store.append_event(
        task.id,
        "commit.done",
        {"sha": sha, "dry_run": dry_run},
        trace_id=trace_id,
    )

    # --- pre_pr checkpoint ---
    if task.pr.open and task.has_checkpoint("pre_pr") and resume_from != "pre_pr":
        stop_reason = "awaiting_approval"
        summary = "paused at pre_pr"
        store.update_task(
            task.id,
            status="awaiting_approval",
            current_step="await:pre_pr",
            awaiting_checkpoint="pre_pr",
        )
        store.append_event(
            task.id, "checkpoint.paused", {"checkpoint": "pre_pr"}, trace_id=trace_id
        )
        evidence.emit(
            "checkpoint.paused",
            {"checkpoint": "pre_pr"},
        )
        _persist_run_evidence(
            evidence,
            task=task,
            spec_path=spec_path,
            final_status="awaiting_approval",
            plan_text=plan_text,
        )
        _emit_stop_event(
            store,
            task,
            trace_id=trace_id,
            reason=stop_reason,
            summary=summary,
        )
        _write_terminal_handoff(
            task=task,
            status="awaiting_approval",
            summary=summary,
            trace_id=trace_id,
            target_repo=worktree.path,
            triage=None,
            stop_reason=stop_reason,
            handoff_dir=HANDOFFS_DIR,
            defects_dir=FACTORY_DEFECTS_DIR,
            next_items=next_items,
        )
        return PipelineResult(
            ok=True,
            final_status="awaiting_approval",
            summary=summary,
            awaiting_checkpoint="pre_pr",
            trace_id=trace_id,
            stop_reason=stop_reason,
        )
    if resume_from == "pre_pr":
        store.append_event(
            task.id,
            "checkpoint.resumed",
            {"checkpoint": "pre_pr", "comment": resume_comment},
            trace_id=trace_id,
        )

    # --- triage BEFORE push/PR (gap-register fix #5) ---
    # Classify once, up front, and let the result gate the PR: a HOLD must not
    # ship at all; an INVESTIGATE ships only as a draft for a human to clear.
    # Previously triage was computed AFTER the PR was already opened, so it
    # gated nothing.
    triage = classify_terminal_state(
        final_status="done",
        gate_outcomes=last_outcomes,
        review_text=last_review,
        triage_policy=task.triage_policy,
    )
    # Fix #4c: a substantive-but-unparseable review fell through to CLEAN in the
    # patch loop (correctly, so it doesn't burn a round), but at the terminal it
    # fails closed — ship as a draft, not merge-ready.
    if triage == "PASS" and _review_is_ambiguous(last_review):
        triage = "INVESTIGATE"

    pr_url: str | None = None
    if triage == "HOLD":
        store.append_event(
            task.id,
            "triage.hold",
            {"reason": "triage HOLD — branch not pushed; needs human review"},
            trace_id=trace_id,
        )
    elif task.pr.open and not dry_run:
        if push_branch(worktree.path, worktree.branch):
            pr_url = _open_pr(worktree, task, plan_text, last_review, triage=triage)
            if pr_url:
                store.update_task(task.id, pr_url=pr_url)

    store.update_task(
        task.id,
        status="done",
        current_step="done",
        pr_url=pr_url,
        awaiting_checkpoint=None,
    )
    store.append_event(
        task.id,
        "pipeline.done",
        {"pr_url": pr_url, "triage": triage},
        trace_id=trace_id,
    )
    # pipeline.done payload requires `status` (schema enum: done|failed|cancelled)
    # and carries `gate_results_summary` cloned from the run's aggregated gate
    # outcomes — this is the cross-check source the Round 3 validator
    # extension enforces against the Run record.
    done_payload: dict[str, Any] = {
        "status": "done",
        "pr_url": pr_url,
        "triage": triage,
    }
    done_summary = aggregate_gate_results(evidence.events)
    if done_summary is not None:
        done_payload["gate_results_summary"] = done_summary
    evidence.emit("pipeline.done", done_payload)
    _persist_run_evidence(
        evidence,
        task=task,
        spec_path=spec_path,
        final_status="done",
        plan_text=plan_text,
        triage=triage,
    )
    summary = f"done: branch {worktree.branch}" + (f"; PR {pr_url}" if pr_url else "")
    stop_reason = _completion_stop_reason(task, last_outcomes, last_review)
    _emit_stop_event(
        store,
        task,
        trace_id=trace_id,
        reason=stop_reason,
        summary=summary,
    )
    _write_terminal_handoff(
        task=task,
        status="done",
        summary=summary,
        trace_id=trace_id,
        target_repo=worktree.path,
        triage=triage,
        stop_reason=stop_reason,
        handoff_dir=HANDOFFS_DIR,
        defects_dir=FACTORY_DEFECTS_DIR,
        next_items=next_items,
    )
    return PipelineResult(
        ok=True,
        final_status="done",
        summary=summary,
        trace_id=trace_id,
        triage=triage,
        stop_reason=stop_reason,
    )


# ------------------------------------------------------------------ subloops


def _run_implement_loop(
    *,
    task: Task,
    worktree: WorktreeInfo,
    plan_text: str,
    store: Store,
    artifacts: ArtifactStore,
    trace_id: str,
    dry_run: bool,
    behavioral_contract: bool = True,
    evidence: _RunEvidence | None = None,
    started_monotonic: float | None = None,
) -> tuple[str, list[GateOutcome]]:
    """Implement -> gates -> review, up to max_patch_rounds.

    Returns (last_review_text, last_gate_outcomes). Special sentinel values:
      "__rejected__" -> reviewer returned REJECT
      "__blocked__"  -> exceeded max patch rounds
      "__budget_exhausted__" -> an explicit budget cap stopped the run
    """
    started_monotonic = started_monotonic if started_monotonic is not None else time.monotonic()
    implementer = resolve_worker(task.implementer, allow_stub_fallback=True)
    # Fix #4a: review must be independent of the implementer. If a configured
    # reviewer is the same worker family as the implementer, swap it to the other
    # family so the implementer never reviews its own work.
    reviewers = [
        resolve_worker(_cross_model(name, task.implementer), allow_stub_fallback=True)
        for name in task.review.reviewers
        if name != "none"
    ]
    gate_runner = GateWorker()
    last_review = ""
    last_outcomes: list[GateOutcome] = []
    max_patch_rounds = _effective_max_patch_rounds(task)
    budget_sets_patch_cap = (
        task.budget.max_patch_rounds is not None
        and task.budget.max_patch_rounds < task.review.max_patch_rounds
    )
    gate_failure_count = 0
    cost_usd = 0.0
    for round_idx in range(max_patch_rounds + 1):
        budget_hit = _budget_limit_hit(
            task,
            started_monotonic=started_monotonic,
            patch_rounds=round_idx,
            gate_failures=gate_failure_count,
            cost_usd=cost_usd,
        )
        if budget_hit is not None:
            store.update_task(
                task.id,
                status="blocked",
                failure_reason=f"budget exhausted: {budget_hit['cap']}",
            )
            store.append_event(
                task.id,
                "budget.exhausted",
                {"round": round_idx, **budget_hit},
                trace_id=trace_id,
            )
            return "__budget_exhausted__", last_outcomes
        # The implementer must see the exact typed contract the gates will enforce,
        # on round 0 AND on patch rounds. Without it the agent omits artifacts it
        # was never shown — the #1 rework source (see docs/factory-gap-register.md).
        contract_brief = task.to_implement_brief()
        if round_idx == 0:
            # Fix #2: close the learning loop. Inject the most common misses on
            # this kind of task (from the defect log) into the round-0 brief so the
            # factory stops re-making the same omissions every batch.
            round0_brief = contract_brief
            recurring = recurring_failures(FACTORY_DEFECTS_DIR, kind=task.template, top_n=8)
            if recurring:
                round0_brief += (
                    "\n## The most common misses on this kind of task — do NOT repeat them:\n"
                    + "\n".join(f"  - {item}" for item in recurring)
                    + "\n"
                )
            prompt = IMPLEMENT_PROMPT.format(
                goal=task.goal, contract=round0_brief, plan=plan_text, cwd=worktree.path
            )
        else:
            prompt = IMPLEMENT_PATCH_PROMPT.format(
                goal=task.goal,
                contract=contract_brief,
                plan=plan_text,
                cwd=worktree.path,
                findings=last_review,
            )
        impl_result = (
            _run_worker(implementer, prompt, worktree.path)
            if not dry_run
            else WorkerResult(
                ok=True,
                stdout=f"[dry-run implement round {round_idx} via {implementer.name}]",
                metadata={
                    "thread_id": f"stub-{implementer.name}-thread-{round_idx}",
                    "run_id": f"stub-{implementer.name}-run-{round_idx}",
                    "model": "stub-model",
                    "duration_ms": 0,
                },
            )
        )
        if not impl_result.ok:
            store.update_task(task.id, status="failed", failure_reason=impl_result.stderr)
            store.append_event(
                task.id,
                "implement.failed",
                {"round": round_idx, "stderr": impl_result.stderr[:500]},
                trace_id=trace_id,
            )
            return "__rejected__", []
        cost_usd += _worker_cost_usd(impl_result) or 0.0
        impl_ref = artifacts.write(task.id, "implement-stdout", round_idx, impl_result.stdout)
        _record_worker_event(
            store,
            task,
            "implement.done",
            round_idx,
            implementer,
            impl_result,
            trace_id,
            artifact_ref=impl_ref.to_dict(),
        )

        store.update_task(task.id, current_step=f"gate (round {round_idx})")
        if not dry_run and not _has_material_diff(worktree):
            gates_ok = False
            outcomes = [
                GateOutcome(
                    name="implementation-diff",
                    cmd="git status --porcelain && git diff --stat <base>...HEAD",
                    ok=False,
                    must_pass=True,
                    stdout="",
                    stderr=(
                        "implementation produced no file changes relative to base; "
                        "refusing to mark a no-op as done"
                    ),
                )
            ]
        elif dry_run:
            # Dry-run keeps the test surface deterministic and offline. We
            # still synthesize per-gate outcomes so the run-evidence ledger
            # carries gate.check.* events; downstream packet generators rely
            # on those to populate gate_results_summary.
            gates_ok = True
            outcomes = [
                GateOutcome(
                    name=g.display_name(),
                    cmd=g.cmd,
                    ok=True,
                    must_pass=g.must_pass,
                    stdout="[dry-run gate stub]",
                    stderr="",
                )
                for g in task.all_gates()
            ]
        else:
            gates_ok, outcomes = gate_runner.run_gates(task.all_gates(), cwd=worktree.path)
            if _task_has_contract_gates(task):
                contract_outcomes = _run_contract_gates(
                    task,
                    worktree.path,
                    behavioral=behavioral_contract,
                )
                outcomes.extend(contract_outcomes)
                gates_ok = gates_ok and all(
                    outcome.ok or not outcome.must_pass for outcome in contract_outcomes
                )
            # Note (#6b): a per-round blast-radius check was considered here but
            # dropped — it collides with the terminal pre-commit gate's clean
            # `scope_violation` stop reason, and the prevention is already handled
            # upstream: fix #1's contract brief tells the implementer the
            # forbidden paths ("Never change: ...") so it doesn't drift into them,
            # and the terminal pre-commit gate is the authoritative final guard.
        for outcome in outcomes:
            artifacts.write(
                task.id,
                f"gate-{_safe_kind(outcome.name)}",
                round_idx,
                _gate_results_for_artifact([outcome]),
            )
        store.append_event(
            task.id,
            "gates.done",
            {
                "round": round_idx,
                "ok": gates_ok,
                # v2-lite: phase + persona on gate events so attribution can
                # group gate failures into their owning SDLC phase.
                "phase": getattr(task, "phase", None),
                "persona": getattr(task, "persona", None),
                "outcomes": [
                    {"name": o.name, "ok": o.ok, "must_pass": o.must_pass} for o in outcomes
                ],
            },
            trace_id=trace_id,
        )
        # v2-lite: when gates fail, also emit a dedicated symptom event so
        # attribution.SYMPTOM_KINDS catches it. The pipeline already retries
        # via the review loop; this event documents the symptom for the
        # ledger, not a control-flow change.
        if not gates_ok:
            gate_failure_count += len([o for o in outcomes if not o.ok and o.must_pass])
            store.append_event(
                task.id,
                "gates.failed",
                {
                    "round": round_idx,
                    "phase": getattr(task, "phase", None),
                    "persona": getattr(task, "persona", None),
                    "failing_gates": [o.name for o in outcomes if not o.ok and o.must_pass],
                },
                trace_id=trace_id,
            )
            _append_gate_defects(
                task,
                outcomes,
                round_idx=round_idx,
                defects_dir=FACTORY_DEFECTS_DIR,
            )
            budget_hit = _budget_limit_hit(
                task,
                started_monotonic=started_monotonic,
                patch_rounds=round_idx,
                gate_failures=gate_failure_count,
                cost_usd=cost_usd,
            )
            if budget_hit is not None:
                store.update_task(
                    task.id,
                    status="blocked",
                    failure_reason=f"budget exhausted: {budget_hit['cap']}",
                )
                store.append_event(
                    task.id,
                    "budget.exhausted",
                    {"round": round_idx, **budget_hit},
                    trace_id=trace_id,
                )
                return "__budget_exhausted__", outcomes
        else:
            mark_gate_defects_resolved(
                task.id,
                [outcome.name for outcome in outcomes if outcome.ok],
                resolved_in_round=round_idx,
                defects_dir=FACTORY_DEFECTS_DIR,
            )
        if evidence is not None:
            for outcome in outcomes:
                payload: dict[str, Any] = {
                    "gate_name": outcome.name,
                    "details": {
                        "cmd": outcome.cmd,
                        "round": round_idx,
                        "must_pass": outcome.must_pass,
                    },
                }
                if not outcome.ok:
                    # gate.check.failed payload requires `reason` per schema.
                    if outcome.stderr.strip():
                        reason = outcome.stderr.strip().splitlines()[0]
                    else:
                        reason = f"gate {outcome.name} failed"
                    payload["reason"] = reason[:280] or f"gate {outcome.name} failed"
                evidence.emit(
                    _gate_check_event_type(outcome),
                    payload,
                )
        last_outcomes = outcomes

        if not gates_ok:
            review_prompt = REVIEW_PROMPT.format(
                cwd=worktree.path,
                base_branch=worktree.base_branch,
                diff_stat=diff_stat(worktree.path, worktree.base_branch) or "(no diff yet)",
                diff_body=diff_content(worktree.path, worktree.base_branch) or "(no diff yet)",
                gate_results=_format_gate_results(outcomes),
                goal=task.goal,
            )
            last_review = _run_reviewers(
                reviewers=reviewers,
                prompt=review_prompt,
                worktree=worktree,
                task=task,
                store=store,
                artifacts=artifacts,
                trace_id=trace_id,
                round_idx=round_idx,
                dry_run=dry_run,
                dry_run_status="NEEDS_PATCH",
            )
            store.update_task(task.id, review=last_review[:4000])
            _append_review_defect(
                task,
                kind="review.needs_patch",
                finding=last_review,
                round_idx=round_idx,
                defects_dir=FACTORY_DEFECTS_DIR,
            )
            if round_idx >= max_patch_rounds:
                failure_reason = (
                    "budget exhausted: max_patch_rounds"
                    if budget_sets_patch_cap
                    else "gates failing after max patch rounds"
                )
                store.update_task(
                    task.id,
                    status="blocked",
                    failure_reason=failure_reason,
                )
                return "__budget_exhausted__" if budget_sets_patch_cap else "__blocked__", outcomes
            continue

        review_prompt = REVIEW_PROMPT.format(
            cwd=worktree.path,
            base_branch=worktree.base_branch,
            diff_stat=diff_stat(worktree.path, worktree.base_branch) or "(no diff yet)",
            diff_body=diff_content(worktree.path, worktree.base_branch) or "(no diff yet)",
            gate_results=_format_gate_results(outcomes),
            goal=task.goal,
        )
        last_review = _run_reviewers(
            reviewers=reviewers,
            prompt=review_prompt,
            worktree=worktree,
            task=task,
            store=store,
            artifacts=artifacts,
            trace_id=trace_id,
            round_idx=round_idx,
            dry_run=dry_run,
            dry_run_status="CLEAN",
        )
        store.update_task(task.id, review=last_review[:4000])
        review_status = _combined_review_status(last_review)
        if review_status == "CLEAN":
            break
        if review_status == "REJECT":
            _append_review_defect(
                task,
                kind="review.rejected",
                finding=last_review,
                round_idx=round_idx,
                defects_dir=FACTORY_DEFECTS_DIR,
            )
            store.update_task(
                task.id,
                status="blocked",
                failure_reason="reviewer returned REJECT",
            )
            return "__rejected__", outcomes
        _append_review_defect(
            task,
            kind="review.needs_patch",
            finding=last_review,
            round_idx=round_idx,
            defects_dir=FACTORY_DEFECTS_DIR,
        )
        if round_idx >= max_patch_rounds:
            failure_reason = (
                "budget exhausted: max_patch_rounds"
                if budget_sets_patch_cap
                else "reviewer kept asking for patches"
            )
            store.update_task(
                task.id,
                status="blocked",
                failure_reason=failure_reason,
            )
            return "__budget_exhausted__" if budget_sets_patch_cap else "__blocked__", outcomes

    return last_review, last_outcomes


def _parse_prose_verdict(text: str) -> Literal["CLEAN", "NEEDS_PATCH", "REJECT"] | None:
    """Fallback: recognize obvious prose verdicts when the strict STATUS: line is absent.

    Reviewers who write paragraphs of analysis often forget the structured
    header. Without this fallback the parser defaults to NEEDS_PATCH and
    the patch loop burns rounds on already-shippable work. (BUG-FAC-005)

    Only fires when ``_combined_review_status`` would otherwise default
    to NEEDS_PATCH. Conservative: requires unambiguous reject/approve
    language, ignores ambiguous "looks good but" prose.
    """
    lower = text.lower()
    # REJECT signals (check first — strongest)
    reject_markers = [
        "verdict: reject",
        "verdict — reject",
        "reject the plan",
        "the plan itself is wrong",
        "reject this",
    ]
    if any(m in lower for m in reject_markers):
        return "REJECT"
    # CLEAN signals: prose like "approve", "ship it", "looks good", "no blocking"
    approve_markers = [
        "approve with",  # "approve with the two issues above addressed"
        "verdict: approve",
        "approve.",
        "ship it",
        "ship as is",
        "ship as-is",
        "ship-ready",
        "ship ready",
        "no blocking",
        "non-blocking",
        "ready to ship",
        "ready to merge",
        "merge as-is",
        "merge as is",
        "lgtm",
        "looks good to me",
    ]
    if any(m in lower for m in approve_markers):
        return "CLEAN"
    # NEEDS_PATCH signals: explicit prose
    patch_markers = [
        "needs changes",
        "needs fixes",
        "needs rework",
        "blocking issue",
        "blocking issues",
        "must fix before",
    ]
    if any(m in lower for m in patch_markers):
        return "NEEDS_PATCH"
    return None


def _has_blocking_signals(text: str) -> bool:
    """Heuristic: reviewer's prose names a hard blocker.

    Only used as the safe-default tilt when no STATUS line and no prose
    verdict markers fire. Conservative: requires explicit blocker language,
    not vague unease.
    """
    lower = text.lower()
    blockers = [
        "must fix before",
        "blocking issue",
        "blocking issues",
        "do not merge",
        "do not ship",
        "security vulnerability",
        "committed secret",
        "build fails",
        "test failure",
        "tests fail",
        "schema violation",
    ]
    return any(b in lower for b in blockers)


_OTHER_FAMILY = {"claude_code": "codex", "codex": "claude_code"}


def _cross_model(reviewer: str, implementer: str) -> str:
    """Force the reviewer to a different worker family than the implementer.

    Same-family self-review is weaker — a model is poor at catching its own blind
    spots. If the configured reviewer matches the implementer, swap to the other
    family; otherwise leave it (e.g. an explicit third option or a stub).
    """
    if reviewer == implementer and reviewer in _OTHER_FAMILY:
        return _OTHER_FAMILY[reviewer]
    return reviewer


def _review_is_ambiguous(review: str) -> bool:
    """A review with real content but no explicit verdict (gap-register fix #4c).

    Such a review is substantive enough to warrant a human look but not clean
    enough to auto-merge. The patch-loop status correctly tilts it to CLEAN (so it
    doesn't burn a round), but at the terminal it should fail closed: ship only as
    a draft (INVESTIGATE), never as merge-ready (PASS). A trivial/empty review is
    not ambiguous — trust the gates and PASS.
    """
    text = (review or "").strip()
    if len(text) < 40:
        return False
    upper = text.upper()
    terminal_markers = (
        "STATUS: CLEAN",
        "STATUS:CLEAN",
        "STATUS: NEEDS_PATCH",
        "STATUS: REJECT",
    )
    if any(marker in upper for marker in terminal_markers):
        return False
    return _parse_prose_verdict(text) is None


def _combined_review_status(review: str) -> Literal["CLEAN", "NEEDS_PATCH", "REJECT"]:
    """Conservative aggregation for one or more review transcripts."""
    upper = review.upper()
    if "STATUS: REJECT" in upper or "STATUS:REJECT" in upper:
        return "REJECT"
    if "STATUS: NEEDS_PATCH" in upper or "STATUS:NEEDS_PATCH" in upper:
        return "NEEDS_PATCH"
    if "STATUS: CLEAN" in upper or "STATUS:CLEAN" in upper:
        return "CLEAN"
    # BUG-FAC-005 fallback: reviewer wrote prose instead of structured header.
    prose = _parse_prose_verdict(review)
    if prose is not None:
        return prose
    # Safe-default tilt: by the time this function fires, must-pass gates have
    # already passed (the pipeline only invokes reviewers after gates clear).
    # If the reviewer's prose does NOT explicitly name a blocker, trust the
    # gates and ship CLEAN. Reviewer findings still land in the artifact for
    # operator follow-up; they just don't burn patch rounds.
    if not _has_blocking_signals(review):
        return "CLEAN"
    return "NEEDS_PATCH"


# Fix #4d: the lens each persona reviewer judges by. persona_reviews were parsed
# (architecture, security) but never run; these give each a focused extra pass.
PERSONA_LENS = {
    "architecture": (
        "module boundaries and layering, coupling, whether the declared public "
        "interfaces are coherent and minimal, and whether new code lands in the "
        "right layer."
    ),
    "security": (
        "input validation, injection, secret/credential handling, unsafe "
        "subprocess/file/network operations, and anything that widens the attack "
        "surface or leaks data."
    ),
}


def _run_reviewers(
    *,
    reviewers: list[Worker],
    prompt: str,
    worktree: WorktreeInfo,
    task: Task,
    store: Store,
    artifacts: ArtifactStore,
    trace_id: str,
    round_idx: int,
    dry_run: bool,
    dry_run_status: str,
) -> str:
    """Run one or more reviewers and return a combined review transcript."""
    if not reviewers:
        return "STATUS: CLEAN\nFINDINGS:\n- review disabled"
    chunks: list[str] = []
    for reviewer_idx, reviewer in enumerate(reviewers):
        result = (
            _run_worker(reviewer, prompt, worktree.path)
            if not dry_run
            else WorkerResult(
                ok=True,
                stdout=(f"STATUS: {dry_run_status}\nFINDINGS:\n- [dry-run via {reviewer.name}]"),
                metadata={
                    "thread_id": f"stub-{reviewer.name}-thread-{round_idx}",
                    "run_id": f"stub-{reviewer.name}-run-{round_idx}",
                    "model": "stub-model",
                    "duration_ms": 0,
                },
            )
        )
        artifact_round = round_idx * 10 + reviewer_idx
        ref = artifacts.write(task.id, "review", artifact_round, result.stdout)
        _record_worker_event(
            store,
            task,
            "review.done",
            round_idx,
            reviewer,
            result,
            trace_id,
            artifact_ref=ref.to_dict(),
        )
        chunks.append(f"=== reviewer: {reviewer.name} ===\n{result.stdout.strip()}")
        if not result.ok:
            chunks.append(f"STATUS: REJECT\nFINDINGS:\n- reviewer failed: {result.stderr[:400]}")

    # Fix #4d: run each configured persona review as a focused extra pass with its
    # own lens and a cross-model reviewer. A security or architecture problem the
    # generalist review missed gets its own verdict, which folds into the combined
    # transcript (and so into _combined_review_status).
    for persona in task.persona_reviews:
        lens = PERSONA_LENS.get(persona.name)
        if not lens:
            continue
        persona_worker = resolve_worker(
            _cross_model(persona.reviewer, task.implementer), allow_stub_fallback=True
        )
        persona_prompt = (
            f"{prompt}\n\nREVIEW LENS — judge ONLY {persona.name}: {lens}\n"
            "Use the same STATUS header format. NEEDS_PATCH only for a real "
            f"{persona.name} problem in the diff."
        )
        result = (
            _run_worker(persona_worker, persona_prompt, worktree.path)
            if not dry_run
            else WorkerResult(
                ok=True,
                stdout=(
                    f"STATUS: {dry_run_status}\nFINDINGS:\n"
                    f"- [dry-run {persona.name} persona via {persona_worker.name}]"
                ),
                metadata={
                    "thread_id": f"stub-{persona.name}-thread-{round_idx}",
                    "run_id": f"stub-{persona.name}-run-{round_idx}",
                    "model": "stub-model",
                    "duration_ms": 0,
                },
            )
        )
        ref = artifacts.write(task.id, f"review-{persona.name}", round_idx, result.stdout)
        _record_worker_event(
            store, task, "review.persona.done", round_idx, persona_worker, result, trace_id,
            artifact_ref=ref.to_dict(),
        )
        chunks.append(
            f"=== persona reviewer: {persona.name} ({persona_worker.name}) ===\n"
            f"{result.stdout.strip()}"
        )
        if not result.ok:
            chunks.append(
                "STATUS: NEEDS_PATCH\nFINDINGS:\n"
                f"- {persona.name} persona review failed: {result.stderr[:300]}"
            )

    return "\n\n".join(chunks)


def _safe_kind(name: str) -> str:
    """Normalize a gate name for use in a filename."""
    out: list[str] = []
    for ch in name:
        if ch.isalnum() or ch in "-_":
            out.append(ch.lower())
        else:
            out.append("-")
    return "".join(out).strip("-") or "gate"


def reject_task(
    store: Store,
    task_id: str,
    *,
    comment: str | None = None,
) -> None:
    """Mark a paused task as rejected without further pipeline work."""
    store.update_task(
        task_id,
        status="rejected",
        current_step="rejected",
        awaiting_checkpoint=None,
        failure_reason=f"rejected by user: {comment}" if comment else "rejected by user",
    )
    store.append_event(task_id, "checkpoint.rejected", {"comment": comment})
