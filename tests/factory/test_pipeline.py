"""Pipeline end-to-end test in dry-run mode against a throwaway git repo."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from scripts.factory.pipeline import run_pipeline
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


def test_pipeline_fails_gracefully_when_base_branch_missing(
    tmp_repo: Path, tmp_path: Path
) -> None:
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
