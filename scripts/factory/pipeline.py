"""Pipeline: plan → implement → gate → review → patch (≤ N) → PR.

State machine is intentionally short. Each step writes to the SQLite store
and appends an event so a later run can pick up where this one left off.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from .state import Store
from .task import Task
from .workers import (
    GateOutcome,
    GateWorker,
    Worker,
    WorkerResult,
    resolve_worker,
)
from .worktree import (
    WorktreeError,
    commit_all,
    create_worktree,
    diff_stat,
    push_branch,
)

if TYPE_CHECKING:
    from .worktree import WorktreeInfo


PLAN_PROMPT = """\
You are the planning agent in a software-engineering factory.

Goal:
{goal}

Working directory: {cwd}
Repo branch: {branch} (from base {base_branch}).
Risk level: {risk}.

Produce a numbered plan (5-10 steps) that another agent will implement. Each
step must be: small, testable, reversible. Name the files you'd touch.
End with a one-paragraph summary of the riskiest decision in the plan.
"""

IMPLEMENT_PROMPT = """\
You are the implementation agent. Carry out the plan below as edits to the
working directory. After editing, do nothing else — the factory will run
gates and review.

Goal:
{goal}

Plan from the planner:
{plan}

Constraints:
- Stay within {cwd}.
- Do not run package installs unless the plan calls for it.
- Do not push or open PRs.
"""

REVIEW_PROMPT = """\
You are the review agent. The implementer has edited the worktree at {cwd}.

Diff summary against base {base_branch}:
{diff_stat}

Gate results:
{gate_results}

Original goal:
{goal}

Task: read the diff and report findings in this exact shape:

  STATUS: CLEAN | NEEDS_PATCH | REJECT
  FINDINGS:
  - <bullet 1>
  - <bullet 2>

Be terse. "CLEAN" means the diff is shippable. "NEEDS_PATCH" means the
implementer should fix the findings and resubmit. "REJECT" means the plan
itself was wrong — the factory will stop and surface to a human.
"""


@dataclass
class PipelineResult:
    ok: bool
    final_status: str
    summary: str


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
            lines.append(f"        stderr head: {outcome.stderr.strip().splitlines()[0][:140]}")
    return "\n".join(lines)


def _open_pr(
    worktree: "WorktreeInfo", task: Task, plan: str, review: str
) -> str | None:
    """Open a draft PR via gh. Returns the URL on success, None on failure."""
    body_parts = [
        f"## Goal\n\n{task.goal}\n",
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
    if task.pr.draft:
        argv.append("--draft")
    try:
        result = subprocess.run(  # noqa: S603
            argv,
            cwd=str(worktree.path),
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return None
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            line = line.strip()
            if line.startswith("https://"):
                return line
        return result.stdout.strip() or None
    return None


def run_pipeline(
    task: Task,
    *,
    store: Store,
    dry_run: bool = False,
) -> PipelineResult:
    """Run a single task pipeline to completion (or to first hard failure)."""
    store.upsert_task(task.id, task.title, task.id)
    store.append_event(task.id, "pipeline.start", {"dry_run": dry_run, "risk": task.risk})

    # --- worktree ---
    repo = task.repo_path()
    if dry_run:
        # Don't touch git state in dry-run; pretend we have a worktree at the repo path.
        from .worktree import WorktreeInfo as _WI

        wt = _WI(
            path=repo,
            branch=f"factory/{task.id}",
            base_branch=task.base_branch,
        )
        store.update_task(
            task.id,
            status="running",
            current_step="plan",
            worktree_path=str(wt.path),
            branch=wt.branch,
        )
        store.append_event(
            task.id, "worktree.skipped", {"reason": "dry_run", "path": str(wt.path)}
        )
    else:
        try:
            wt = create_worktree(repo, task.id, task.base_branch)
        except WorktreeError as cause:
            store.update_task(task.id, status="failed", failure_reason=str(cause))
            store.append_event(task.id, "worktree.error", {"error": str(cause)})
            return PipelineResult(ok=False, final_status="failed", summary=str(cause))
        store.update_task(
            task.id,
            status="running",
            current_step="plan",
            worktree_path=str(wt.path),
            branch=wt.branch,
        )
        store.append_event(
            task.id, "worktree.ready", {"path": str(wt.path), "branch": wt.branch}
        )

    # --- plan ---
    planner = resolve_worker(task.planner, allow_stub_fallback=True)
    plan_prompt = PLAN_PROMPT.format(
        goal=task.goal,
        cwd=wt.path,
        branch=wt.branch,
        base_branch=wt.base_branch,
        risk=task.risk,
    )
    plan_result = (
        _run_worker(planner, plan_prompt, wt.path)
        if not dry_run
        else WorkerResult(ok=True, stdout=f"[dry-run plan via {planner.name}]")
    )
    if not plan_result.ok:
        store.update_task(task.id, status="failed", failure_reason=plan_result.stderr)
        store.append_event(task.id, "plan.failed", {"stderr": plan_result.stderr[:500]})
        return PipelineResult(ok=False, final_status="failed", summary=plan_result.stderr)
    plan_text = plan_result.stdout
    store.update_task(task.id, plan=plan_text, current_step="implement")
    store.append_event(
        task.id,
        "plan.done",
        {"worker": planner.name, "len": len(plan_text)},
    )

    # --- implement / patch loop ---
    implementer = resolve_worker(task.implementer, allow_stub_fallback=True)
    reviewer = resolve_worker(task.review.reviewer, allow_stub_fallback=True)
    gate_runner = GateWorker()
    last_review = ""
    for round_idx in range(task.review.max_patch_rounds + 1):
        prompt = (
            IMPLEMENT_PROMPT.format(goal=task.goal, plan=plan_text, cwd=wt.path)
            if round_idx == 0
            else (
                "The reviewer flagged issues. Address them and update the worktree.\n\n"
                f"Findings:\n{last_review}"
            )
        )
        impl_result = (
            _run_worker(implementer, prompt, wt.path)
            if not dry_run
            else WorkerResult(
                ok=True, stdout=f"[dry-run implement round {round_idx} via {implementer.name}]"
            )
        )
        if not impl_result.ok:
            store.update_task(task.id, status="failed", failure_reason=impl_result.stderr)
            store.append_event(
                task.id,
                "implement.failed",
                {"round": round_idx, "stderr": impl_result.stderr[:500]},
            )
            return PipelineResult(
                ok=False, final_status="failed", summary=impl_result.stderr
            )
        store.append_event(
            task.id,
            "implement.done",
            {"round": round_idx, "worker": implementer.name},
        )

        # --- gates ---
        store.update_task(task.id, current_step=f"gate (round {round_idx})")
        if dry_run:
            gates_ok, outcomes = True, []
        else:
            gates_ok, outcomes = gate_runner.run_gates(task.gates, cwd=wt.path)
        store.append_event(
            task.id,
            "gates.done",
            {
                "round": round_idx,
                "ok": gates_ok,
                "outcomes": [
                    {"name": o.name, "ok": o.ok, "must_pass": o.must_pass}
                    for o in outcomes
                ],
            },
        )
        if not gates_ok:
            # ask the reviewer to look at the failed gates and produce findings
            review_prompt = REVIEW_PROMPT.format(
                cwd=wt.path,
                base_branch=wt.base_branch,
                diff_stat=diff_stat(wt.path, wt.base_branch) or "(no diff yet)",
                gate_results=_format_gate_results(outcomes),
                goal=task.goal,
            )
            review_result = (
                _run_worker(reviewer, review_prompt, wt.path)
                if not dry_run
                else WorkerResult(
                    ok=True, stdout="STATUS: NEEDS_PATCH\nFINDINGS:\n- [dry-run]"
                )
            )
            last_review = review_result.stdout
            store.update_task(task.id, review=last_review)
            if round_idx >= task.review.max_patch_rounds:
                store.update_task(
                    task.id,
                    status="blocked",
                    failure_reason="gates failing after max patch rounds",
                )
                return PipelineResult(
                    ok=False,
                    final_status="blocked",
                    summary="gates failing after max patch rounds",
                )
            continue

        # --- review the clean diff ---
        review_prompt = REVIEW_PROMPT.format(
            cwd=wt.path,
            base_branch=wt.base_branch,
            diff_stat=diff_stat(wt.path, wt.base_branch) or "(no diff yet)",
            gate_results=_format_gate_results(outcomes),
            goal=task.goal,
        )
        review_result = (
            _run_worker(reviewer, review_prompt, wt.path)
            if not dry_run
            else WorkerResult(
                ok=True, stdout=f"STATUS: CLEAN\nFINDINGS:\n- [dry-run via {reviewer.name}]"
            )
        )
        last_review = review_result.stdout
        store.update_task(task.id, review=last_review)
        store.append_event(
            task.id,
            "review.done",
            {"round": round_idx, "worker": reviewer.name, "head": last_review[:160]},
        )
        upper = last_review.upper()
        if "STATUS: CLEAN" in upper or "STATUS:CLEAN" in upper:
            break
        if "STATUS: REJECT" in upper:
            store.update_task(
                task.id,
                status="blocked",
                failure_reason="reviewer returned REJECT",
            )
            return PipelineResult(
                ok=False, final_status="blocked", summary="reviewer rejected the plan"
            )
        if round_idx >= task.review.max_patch_rounds:
            store.update_task(
                task.id,
                status="blocked",
                failure_reason="reviewer kept asking for patches",
            )
            return PipelineResult(
                ok=False,
                final_status="blocked",
                summary="exceeded max patch rounds with NEEDS_PATCH",
            )

    # --- commit + (optional) PR ---
    sha = commit_all(wt.path, f"factory: {task.title}") if not dry_run else None
    store.append_event(task.id, "commit.done", {"sha": sha, "dry_run": dry_run})
    pr_url: str | None = None
    if task.pr.open and not dry_run:
        if push_branch(wt.path, wt.branch):
            pr_url = _open_pr(wt, task, plan_text, last_review)
            if pr_url:
                store.update_task(task.id, pr_url=pr_url)
    store.update_task(task.id, status="done", current_step="done", pr_url=pr_url)
    store.append_event(task.id, "pipeline.done", {"pr_url": pr_url})
    summary = f"done: branch {wt.branch}" + (f"; PR {pr_url}" if pr_url else "")
    return PipelineResult(ok=True, final_status="done", summary=summary)
