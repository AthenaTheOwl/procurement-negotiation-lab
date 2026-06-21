"""Router tests for multi-task factory execution.

Covers: R-FACTORY-005.
"""

from __future__ import annotations

from pathlib import Path

from scripts.factory.router import route_tasks

from .conftest import init_git_repo


def _task(path: Path, task_id: str, repo: Path) -> Path:
    path.write_text(
        f"""
id: {task_id}
title: {task_id}
target_repo: {repo}
goal: check routing
planner: stub
implementer: stub
review:
  reviewer: stub
gates: []
""",
        encoding="utf-8",
    )
    return path


def test_route_tasks_threadpool_dry_run(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    init_git_repo(repo, user_email="router@test.local", user_name="router-test")
    first = _task(tmp_path / "one.yaml", "one", repo)
    second = _task(tmp_path / "two.yaml", "two", repo)

    result = route_tasks(
        [first, second],
        db_path=tmp_path / "factory.db",
        dry_run=True,
        parallel=2,
        use_langgraph=False,
    )

    assert result.engine == "threadpool"
    assert [item.task_id for item in result.results] == ["one", "two"]
    assert all(item.ok for item in result.results)
