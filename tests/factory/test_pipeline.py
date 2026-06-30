"""Pipeline end-to-end test in dry-run mode against a throwaway git repo.

Covers: R-FACTORY-003, R-FACTORY-RUN-EVIDENCE-001,
R-FACTORY-RUN-EVIDENCE-002, R-FACTORY-RUN-EVIDENCE-015,
R-FACTORY-RUN-EVIDENCE-016.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

import scripts.factory.pipeline as pipeline_module
from scripts.factory.pipeline import run_pipeline
from scripts.factory.state import Store
from scripts.factory.task import BlastRadiusSpec, BudgetSpec, GateSpec, PRSpec, ReviewSpec, Task
from scripts.factory.workers import WorkerResult

from .conftest import LedgerDirs, init_git_repo


@pytest.fixture
def tmp_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    init_git_repo(repo)
    return repo


def test_pipeline_dry_run_completes(tmp_repo: Path, tmp_path: Path) -> None:
    task = Task(
        id="dry-1",
        title="dry pipeline",
        target_repo=str(tmp_repo),
        goal="just check the wiring",
        base_branch="main",
        gates=[GateSpec(cmd='python -c "exit(0)"', name="noop")],
        review=ReviewSpec(reviewer="stub", max_patch_rounds=2),
        pr=PRSpec(open=False),
        planner="stub",
        implementer="stub",
    )
    store = Store(tmp_path / "factory.db")
    try:
        result = run_pipeline(task, store=store, dry_run=True)
        assert result.ok is True
        assert result.final_status == "done"
        row = store.get_task(task.id)
        assert row is not None
        assert row.status == "done"
        events = [event.kind for event in store.events_for(task.id)]
        assert "pipeline.start" in events
        assert "plan.done" in events
        assert "implement.done" in events
        assert "review.done" in events
        assert "pipeline.done" in events
        assert events[-1] == "stop"
        stop_event = store.events_for(task.id)[-1]
        assert stop_event.payload == {
            "reason": "completed_clean",
            "summary": "done: branch factory/dry-1",
        }
    finally:
        store.close()


def test_pipeline_dry_run_records_dual_reviewers(tmp_repo: Path, tmp_path: Path) -> None:
    task = Task(
        id="dual-1",
        title="dual review pipeline",
        target_repo=str(tmp_repo),
        goal="check the dual reviewer wiring",
        base_branch="main",
        gates=[],
        review=ReviewSpec(
            reviewer="stub",
            reviewers=["stub", "stub"],
            max_patch_rounds=1,
        ),
        pr=PRSpec(open=False),
        planner="stub",
        implementer="stub",
    )
    store = Store(tmp_path / "factory.db")
    try:
        result = run_pipeline(task, store=store, dry_run=True)
        assert result.ok is True
        row = store.get_task(task.id)
        assert row is not None and row.review is not None
        assert row.review.count("=== reviewer: stub:stub ===") == 2
        reviews = [event for event in store.events_for(task.id) if event.kind == "review.done"]
        assert len(reviews) == 2
    finally:
        store.close()


def test_pipeline_fails_gracefully_when_base_branch_missing(tmp_repo: Path, tmp_path: Path) -> None:
    """With dry_run=False, the real worktree path is exercised; a missing base
    branch should surface as a graceful failure rather than a crash."""
    task = Task(
        id="real-1",
        title="missing base",
        target_repo=str(tmp_repo),
        goal="x",
        base_branch="nope",
        gates=[],
        review=ReviewSpec(reviewer="stub", max_patch_rounds=1),
        planner="stub",
        implementer="stub",
    )
    store = Store(tmp_path / "factory.db")
    try:
        result = run_pipeline(task, store=store, dry_run=False)
        assert result.ok is False
        assert result.final_status == "failed"
        row = store.get_task(task.id)
        assert row is not None and row.status == "failed"
    finally:
        store.close()


def test_pipeline_blocks_when_implementation_produces_no_diff(
    tmp_repo: Path, tmp_path: Path
) -> None:
    """BUG-FAC-007: green gates alone must not mark a no-op implementation done."""
    task = Task(
        id="noop-implementation",
        title="no-op implementation",
        target_repo=str(tmp_repo),
        goal="create factory-validation/2026-06-20.md",
        base_branch="main",
        gates=[GateSpec(cmd='python -c "exit(0)"', name="noop")],
        review=ReviewSpec(reviewer="stub", max_patch_rounds=0),
        pr=PRSpec(open=False),
        planner="stub",
        implementer="stub",
    )
    store = Store(tmp_path / "factory.db")
    try:
        result = run_pipeline(task, store=store, dry_run=False)
        row = store.get_task(task.id)
    finally:
        store.close()

    assert result.ok is False
    assert result.final_status == "blocked"
    assert result.summary == "exceeded max patch rounds"
    assert row is not None
    assert row.status == "blocked"
    assert row.failure_reason == "gates failing after max patch rounds"


def test_pipeline_budget_gate_failure_cap_emits_stop_reason(
    tmp_repo: Path, tmp_path: Path
) -> None:
    task = Task(
        id="budget-gates",
        title="budget gates",
        target_repo=str(tmp_repo),
        goal="create factory-validation/budget.md",
        base_branch="main",
        gates=[GateSpec(cmd='python -c "exit(0)"', name="noop")],
        review=ReviewSpec(reviewer="stub", max_patch_rounds=3),
        pr=PRSpec(open=False),
        planner="stub",
        implementer="stub",
        budget=BudgetSpec(max_gate_failures=0),
    )
    store = Store(tmp_path / "factory.db")
    try:
        result = run_pipeline(task, store=store, dry_run=False)
        row = store.get_task(task.id)
        events = store.events_for(task.id)
    finally:
        store.close()

    assert result.ok is False
    assert result.final_status == "blocked"
    assert result.stop_reason == "budget_exhausted"
    assert row is not None
    assert row.status == "blocked"
    assert row.failure_reason == "budget exhausted: max_gate_failures"
    stop_events = [event for event in events if event.kind == "stop"]
    assert len(stop_events) == 1
    assert stop_events[0].payload["reason"] == "budget_exhausted"
    assert stop_events[0].payload["summary"] == "budget exhausted: max_gate_failures"


def test_pipeline_precommit_blocks_forbidden_path(
    tmp_repo: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    class EnvWritingWorker:
        name = "stub"

        def run(self, prompt: str, *, cwd: Path, timeout: int = 1800) -> WorkerResult:
            if "implementation agent" in prompt:
                (cwd / ".env").write_text("DEBUG=true\n", encoding="utf-8")
            stdout = "STATUS: CLEAN\nFINDINGS:\n- local test worker"
            if "planning agent" in prompt:
                stdout = "1. CREATE .env -- test forbidden path"
            return WorkerResult(
                ok=True,
                stdout=stdout,
                metadata={"thread_id": "t", "run_id": "r", "duration_ms": 0},
            )

    monkeypatch.setattr(
        pipeline_module,
        "resolve_worker",
        lambda name, allow_stub_fallback=True: EnvWritingWorker(),
    )
    task = Task(
        id="precommit-forbidden",
        title="precommit forbidden",
        target_repo=str(tmp_repo),
        goal="write an env file",
        base_branch="main",
        gates=[],
        review=ReviewSpec(reviewer="stub", max_patch_rounds=0),
        pr=PRSpec(open=False),
        planner="stub",
        implementer="stub",
        blast_radius=BlastRadiusSpec(forbidden_paths=[".env*"], secret_scan=False),
    )
    store = Store(tmp_path / "factory.db")
    try:
        result = run_pipeline(task, store=store, dry_run=False)
        row = store.get_task(task.id)
        events = store.events_for(task.id)
    finally:
        store.close()

    assert result.ok is False
    assert result.final_status == "blocked"
    assert result.stop_reason == "scope_violation"
    assert row is not None
    assert row.status == "blocked"
    assert row.failure_reason == "pre-commit hard gates failed"
    assert any(event.kind == "precommit.done" for event in events)
    stop = [event for event in events if event.kind == "stop"][-1]
    assert stop.payload["reason"] == "scope_violation"


def test_pipeline_dry_run_emits_run_evidence_files(
    tmp_repo: Path,
    tmp_path: Path,
    _redirect_run_evidence_dirs: LedgerDirs,
) -> None:
    """The dry-run pipeline must write one JSONL ledger and one Run record.

    The ledger must contain at least one gate.check.* event and a final
    gate.run.evidence_recorded event; the Run record must carry the two
    always-populated replay-equivalence hashes.
    """
    task = Task(
        id="evidence-1",
        title="evidence smoke",
        target_repo=str(tmp_repo),
        goal="exercise the run-evidence emitter",
        base_branch="main",
        gates=[GateSpec(cmd='python -c "exit(0)"', name="noop-gate")],
        review=ReviewSpec(reviewer="stub", max_patch_rounds=1),
        pr=PRSpec(open=False),
        planner="stub",
        implementer="stub",
    )
    store = Store(tmp_path / "factory.db")
    try:
        result = run_pipeline(task, store=store, dry_run=True, spec_path="specs/0009-factory/")
    finally:
        store.close()
    assert result.ok is True
    assert result.final_status == "done"

    ledgers = list(_redirect_run_evidence_dirs.events.glob("run-*.jsonl"))
    records = list(_redirect_run_evidence_dirs.records.glob("run-*.json"))
    assert len(ledgers) == 1, ledgers
    assert len(records) == 1, records

    events = [
        json.loads(line)
        for line in ledgers[0].read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    event_types = [event["type"] for event in events]
    assert "pipeline.start" in event_types
    assert any(t.startswith("gate.check.") for t in event_types)
    assert "gate.run.evidence_recorded" in event_types
    assert event_types[-1] == "gate.run.evidence_recorded"

    run = json.loads(records[0].read_text(encoding="utf-8"))
    assert run["status"] == "done"
    assert re.match(r"^[a-f0-9]{64}$", run["prompt_snapshot_hash"])
    assert re.match(r"^[a-f0-9]{64}$", run["tool_schemas_snapshot_hash"])
    summary = run["gate_results_summary"]
    assert summary["all_passed"] is True
    assert summary["gates_passed"] == ["noop-gate"]
    assert summary["gates_failed"] == []
    assert run["spec_id"] == "specs/0009-factory/"
    # DEC-FACTORY-010: inputs[].ref is now a repo:// URI carrying the
    # worktree-HEAD SHA. The test pipeline runs against a real worktree
    # so the URI form lands; only fallback callers without a derivable
    # SHA see the raw spec path.
    assert len(run["inputs"]) == 1
    input_ref = run["inputs"][0]["ref"]
    assert run["inputs"][0]["kind"] == "task"
    assert re.match(
        r"^repo://procurement-negotiation-lab@[a-f0-9]{40}/.+",
        input_ref,
    ), f"expected repo:// URI, got {input_ref!r}"
    # DEC-FACTORY-010: workspace_id is the repo name (an identifier, not a
    # filesystem path), and sandbox_image_ref starts as a PENDING repo://
    # URI so the post-commit finalize step can rewrite it.
    assert run["workspace_id"] == "procurement-negotiation-lab"
    assert run["sandbox_image_ref"] == "repo://procurement-negotiation-lab@PENDING/"


def test_review_ambiguity_fails_closed():
    """Fix #4c: a substantive review with no explicit verdict is ambiguous (ships
    as a draft); an explicit CLEAN or a trivial/empty review is not."""
    from scripts.factory.pipeline import _review_is_ambiguous
    # substantive, no verdict -> ambiguous (fail closed)
    assert _review_is_ambiguous(
        "FINDINGS:\n- the cli imports fine but the report only has one row\n"
        "- the validate command was not exercised against the negative case"
    ) is True
    # explicit clean verdict -> not ambiguous
    assert _review_is_ambiguous("STATUS: CLEAN\nFINDINGS:\n- checked the diff, looks right") is False
    # trivial/empty -> trust the gates, not ambiguous
    assert _review_is_ambiguous("ok") is False
    assert _review_is_ambiguous("") is False


def test_open_pr_drafts_on_investigate(monkeypatch):
    """Fix #5: an INVESTIGATE triage forces a draft PR with a do-not-merge banner."""
    import scripts.factory.pipeline as pl
    captured = {}

    class _R:
        returncode = 0
        stdout = "https://github.com/x/y/pull/1\n"

    def fake_run(argv, **kwargs):
        captured["argv"] = argv
        return _R()

    monkeypatch.setattr(pl.subprocess, "run", fake_run)
    from scripts.factory.task import Task, PRSpec
    from scripts.factory.worktree import WorktreeInfo
    task = Task(id="t", title="t", target_repo=".", goal="g", pr=PRSpec(open=True, draft=False))
    wt = WorktreeInfo(path=Path("."), branch="b", base_branch="main")
    pl._open_pr(wt, task, "plan", "review text", triage="INVESTIGATE")
    assert "--draft" in captured["argv"]                 # forced draft even though pr.draft=False
    assert any("INVESTIGATE" in a for a in captured["argv"])  # banner in body
