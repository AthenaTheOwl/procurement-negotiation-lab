"""End-to-end pin of the factory checkpoint pause/resume/reject contract.

Promoted from the 2026-W21 dream candidate
`dreams/2026-W21/candidates/eval-002-factory-checkpoint-interrupt-pin.md`.

The existing `test_interrupts.py` covers individual checkpoint steps. This
module walks the full contract from DEC-FACTORY-002 (plan/diff checkpoints
as defaults) and DEC-FACTORY-003 (per-reviewer `review.done` events) so a
refactor that collapses the awaiting-approval path turns the regression
loud instead of silent.

All tests use the stub worker path (dry_run=True) and a tmp-path SQLite
store; nothing here requires a real Claude or Codex CLI.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from scripts.factory.artifacts import ArtifactStore
from scripts.factory.pipeline import reject_task, run_pipeline
from scripts.factory.state import Store
from scripts.factory.task import GateSpec, PRSpec, ReviewSpec, Task


def _init_repo(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    subprocess.run(["git", "init", "-b", "main", str(path)], check=True, capture_output=True)
    subprocess.run(
        ["git", "-C", str(path), "config", "user.email", "factory@test.local"],
        check=True,
        capture_output=True,
    )
    subprocess.run(
        ["git", "-C", str(path), "config", "user.name", "factory-test"],
        check=True,
        capture_output=True,
    )
    (path / "README.md").write_text("seed\n", encoding="utf-8")
    subprocess.run(["git", "-C", str(path), "add", "-A"], check=True, capture_output=True)
    subprocess.run(
        ["git", "-C", str(path), "commit", "-m", "seed"], check=True, capture_output=True
    )


@pytest.fixture
def tmp_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    _init_repo(repo)
    return repo


def _make_task(repo: Path, task_id: str, checkpoints: list[str]) -> Task:
    return Task(
        id=task_id,
        title=f"checkpoint contract pin {task_id}",
        target_repo=str(repo),
        goal="exercise full checkpoint contract",
        base_branch="main",
        gates=[GateSpec(cmd='python -c "exit(0)"', name="noop")],
        review=ReviewSpec(reviewer="stub", max_patch_rounds=1),
        pr=PRSpec(open=False),
        planner="stub",
        implementer="stub",
        checkpoints=checkpoints,
    )


def test_plan_review_pause_emits_checkpoint_paused_event(
    tmp_repo: Path, tmp_path: Path
) -> None:
    """Pause at plan_review writes a checkpoint.paused event and parks the row."""
    task = _make_task(tmp_repo, "pin-plan-pause", ["plan_review"])
    store = Store(tmp_path / "f.db")
    artifacts = ArtifactStore(tmp_path / "arts")
    try:
        result = run_pipeline(task, store=store, dry_run=True, artifact_store=artifacts)
        assert result.final_status == "awaiting_approval"
        assert result.awaiting_checkpoint == "plan_review"

        row = store.get_task(task.id)
        assert row is not None
        assert row.status == "awaiting_approval"
        assert row.awaiting_checkpoint == "plan_review"

        events = [e.kind for e in store.events_for(task.id, trace_id=result.trace_id)]
        assert "checkpoint.paused" in events
        assert "pipeline.done" not in events
    finally:
        store.close()


def test_plan_review_resume_emits_checkpoint_resumed_then_proceeds(
    tmp_repo: Path, tmp_path: Path
) -> None:
    """Resume from plan_review writes a checkpoint.resumed event and reaches done."""
    task = _make_task(tmp_repo, "pin-plan-resume", ["plan_review"])
    store = Store(tmp_path / "f.db")
    artifacts = ArtifactStore(tmp_path / "arts")
    try:
        first = run_pipeline(task, store=store, dry_run=True, artifact_store=artifacts)
        assert first.awaiting_checkpoint == "plan_review"

        second = run_pipeline(
            task,
            store=store,
            dry_run=True,
            resume_from="plan_review",
            artifact_store=artifacts,
        )
        assert second.final_status == "done"

        resume_events = [e.kind for e in store.events_for(task.id, trace_id=second.trace_id)]
        assert "checkpoint.resumed" in resume_events
        assert "pipeline.done" in resume_events

        row = store.get_task(task.id)
        assert row is not None
        assert row.status == "done"
        assert row.awaiting_checkpoint is None
    finally:
        store.close()


def test_diff_review_pause_then_resume_proceeds_to_done(
    tmp_repo: Path, tmp_path: Path
) -> None:
    """The diff_review checkpoint pauses, then resume continues to done."""
    task = _make_task(tmp_repo, "pin-diff", ["diff_review"])
    store = Store(tmp_path / "f.db")
    artifacts = ArtifactStore(tmp_path / "arts")
    try:
        first = run_pipeline(task, store=store, dry_run=True, artifact_store=artifacts)
        assert first.final_status == "awaiting_approval"
        assert first.awaiting_checkpoint == "diff_review"

        # Review artifact written before the pause
        refs = artifacts.list(task.id)
        review_refs = [ref for ref in refs if ref.kind == "review"]
        assert len(review_refs) >= 1

        second = run_pipeline(
            task,
            store=store,
            dry_run=True,
            resume_from="diff_review",
            artifact_store=artifacts,
        )
        assert second.final_status == "done"

        row = store.get_task(task.id)
        assert row is not None
        assert row.status == "done"
    finally:
        store.close()


def test_reject_at_checkpoint_marks_task_rejected(
    tmp_repo: Path, tmp_path: Path
) -> None:
    """A reject call on a paused task records the rejection comment."""
    task = _make_task(tmp_repo, "pin-reject", ["plan_review"])
    store = Store(tmp_path / "f.db")
    artifacts = ArtifactStore(tmp_path / "arts")
    try:
        run_pipeline(task, store=store, dry_run=True, artifact_store=artifacts)
        reject_task(store, task.id, comment="not the right plan")

        row = store.get_task(task.id)
        assert row is not None
        assert row.status == "rejected"
        assert row.awaiting_checkpoint is None
        assert "not the right plan" in (row.failure_reason or "")
    finally:
        store.close()


def test_no_checkpoints_runs_straight_through(tmp_repo: Path, tmp_path: Path) -> None:
    """The checkpoint pause path is gated on the task's checkpoint list."""
    task = _make_task(tmp_repo, "pin-no-checkpoints", [])
    store = Store(tmp_path / "f.db")
    artifacts = ArtifactStore(tmp_path / "arts")
    try:
        result = run_pipeline(task, store=store, dry_run=True, artifact_store=artifacts)
        assert result.final_status == "done"
        assert result.awaiting_checkpoint is None

        events = [e.kind for e in store.events_for(task.id, trace_id=result.trace_id)]
        assert "checkpoint.paused" not in events
        assert "pipeline.done" in events
    finally:
        store.close()
