"""Checkpoint + resume tests for the pipeline."""

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
        title=f"checkpoint test {task_id}",
        target_repo=str(repo),
        goal="exercise checkpoint behavior",
        base_branch="main",
        gates=[GateSpec(cmd='python -c "exit(0)"', name="noop")],
        review=ReviewSpec(reviewer="stub", max_patch_rounds=1),
        pr=PRSpec(open=False),
        planner="stub",
        implementer="stub",
        checkpoints=checkpoints,
    )


def test_pause_at_plan_review_then_resume(tmp_repo: Path, tmp_path: Path) -> None:
    task = _make_task(tmp_repo, "ckpt-1", ["plan_review"])
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
        assert row.current_step == "await:plan_review"

        # plan artifact was written
        refs = artifacts.list(task.id)
        plan_refs = [ref for ref in refs if ref.kind == "plan"]
        assert len(plan_refs) == 1

        # resume continues
        result2 = run_pipeline(
            task,
            store=store,
            dry_run=True,
            resume_from="plan_review",
            artifact_store=artifacts,
        )
        assert result2.final_status == "done"
        row2 = store.get_task(task.id)
        assert row2 is not None
        assert row2.status == "done"
        assert row2.awaiting_checkpoint is None
    finally:
        store.close()


def test_pause_at_diff_review_then_resume(tmp_repo: Path, tmp_path: Path) -> None:
    task = _make_task(tmp_repo, "ckpt-2", ["diff_review"])
    store = Store(tmp_path / "f.db")
    artifacts = ArtifactStore(tmp_path / "arts")
    try:
        result = run_pipeline(task, store=store, dry_run=True, artifact_store=artifacts)
        assert result.final_status == "awaiting_approval"
        assert result.awaiting_checkpoint == "diff_review"

        refs = artifacts.list(task.id)
        review_refs = [ref for ref in refs if ref.kind == "review"]
        assert len(review_refs) >= 1

        result2 = run_pipeline(
            task,
            store=store,
            dry_run=True,
            resume_from="diff_review",
            artifact_store=artifacts,
        )
        assert result2.final_status == "done"
    finally:
        store.close()


def test_reject_task_marks_status_rejected(tmp_repo: Path, tmp_path: Path) -> None:
    task = _make_task(tmp_repo, "ckpt-3", ["plan_review"])
    store = Store(tmp_path / "f.db")
    artifacts = ArtifactStore(tmp_path / "arts")
    try:
        run_pipeline(task, store=store, dry_run=True, artifact_store=artifacts)
        reject_task(store, task.id, comment="wrong scope")
        row = store.get_task(task.id)
        assert row is not None
        assert row.status == "rejected"
        assert row.awaiting_checkpoint is None
        assert "wrong scope" in (row.failure_reason or "")
    finally:
        store.close()


def test_trace_id_groups_events(tmp_repo: Path, tmp_path: Path) -> None:
    task = _make_task(tmp_repo, "ckpt-4", ["plan_review"])
    store = Store(tmp_path / "f.db")
    artifacts = ArtifactStore(tmp_path / "arts")
    try:
        first = run_pipeline(task, store=store, dry_run=True, artifact_store=artifacts)
        second = run_pipeline(
            task,
            store=store,
            dry_run=True,
            resume_from="plan_review",
            artifact_store=artifacts,
        )
        # two distinct traces
        traces = store.traces_for(task.id)
        assert len(traces) == 2
        assert first.trace_id in traces
        assert second.trace_id in traces
        # events for the first trace include the pause; events for the second include resume
        first_events = [e.kind for e in store.events_for(task.id, trace_id=first.trace_id)]
        second_events = [e.kind for e in store.events_for(task.id, trace_id=second.trace_id)]
        assert "checkpoint.paused" in first_events
        assert "checkpoint.resumed" in second_events
        assert "pipeline.done" in second_events
    finally:
        store.close()
