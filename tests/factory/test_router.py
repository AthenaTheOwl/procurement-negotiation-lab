"""Router tests for multi-task factory execution."""

from __future__ import annotations

import subprocess
from pathlib import Path

from scripts.factory.router import route_tasks


def _init_repo(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    subprocess.run(["git", "init", "-b", "main", str(path)], check=True, capture_output=True)
    subprocess.run(
        ["git", "-C", str(path), "config", "user.email", "router@test.local"],
        check=True,
        capture_output=True,
    )
    subprocess.run(
        ["git", "-C", str(path), "config", "user.name", "router-test"],
        check=True,
        capture_output=True,
    )
    (path / "README.md").write_text("seed\n", encoding="utf-8")
    subprocess.run(["git", "-C", str(path), "add", "-A"], check=True, capture_output=True)
    subprocess.run(
        ["git", "-C", str(path), "commit", "-m", "seed"], check=True, capture_output=True
    )


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
    _init_repo(repo)
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
