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

from scripts.factory.pipeline import run_pipeline
from scripts.factory.state import Store
from scripts.factory.task import GateSpec, PRSpec, ReviewSpec, Task

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
