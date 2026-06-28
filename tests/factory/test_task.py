"""Task YAML loader tests."""

from __future__ import annotations

from pathlib import Path

import pytest

from scripts.factory.task import GateSpec, load_task


def _write(path: Path, contents: str) -> Path:
    path.write_text(contents, encoding="utf-8")
    return path


def test_load_task_minimal(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "min.yaml",
        """
id: t-1
title: minimal
target_repo: /tmp/repo
goal: do the thing
""",
    )
    task = load_task(task_file)
    assert task.id == "t-1"
    assert task.title == "minimal"
    assert task.risk == "low"
    assert task.gates == []
    assert task.review.reviewer == "claude_code"
    assert task.pr.open is False


def test_load_task_gates_normalize(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "gates.yaml",
        """
id: t-2
title: gates
target_repo: /tmp/repo
goal: g
gates:
  - pytest
  - cmd: npm test
    name: vitest
""",
    )
    task = load_task(task_file)
    assert len(task.gates) == 2
    assert isinstance(task.gates[0], GateSpec) and task.gates[0].cmd == "pytest"
    assert task.gates[1].display_name() == "vitest"


def test_load_task_accepts_dual_reviewers(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "reviewers.yaml",
        """
id: t-3
title: reviewers
target_repo: /tmp/repo
goal: g
review:
  reviewers:
    - claude_code
    - codex
  max_patch_rounds: 1
""",
    )
    task = load_task(task_file)
    assert task.review.reviewers == ["claude_code", "codex"]
    assert task.review.max_patch_rounds == 1


def test_load_task_accepts_budget_spec(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "budget.yaml",
        """
id: t-budget
title: budget
target_repo: .
goal: stop before runaway
budget:
  max_wall_clock_seconds: 2.5
  max_patch_rounds: 1
  max_gate_failures: 0
  max_cost_usd: 0.75
""",
    )
    task = load_task(task_file)
    assert task.budget.max_wall_clock_ms == 2500
    assert task.budget.max_patch_rounds == 1
    assert task.budget.max_gate_failures == 0
    assert task.budget.max_cost_usd == 0.75


def test_load_task_accepts_blast_radius_spec(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "blast.yaml",
        """
id: t-blast
title: blast radius
target_repo: .
goal: keep the factory bounded
blast_radius:
  allowed_paths:
    - src/**
    - tests/**
  forbidden_paths:
    - .env*
    - secrets/**
  max_changed_files: 5
  max_diff_lines: 200
  secret_scan: true
""",
    )
    task = load_task(task_file)
    assert task.blast_radius.allowed_paths == ["src/**", "tests/**"]
    assert task.blast_radius.forbidden_paths == [".env*", "secrets/**"]
    assert task.blast_radius.max_changed_files == 5
    assert task.blast_radius.max_diff_lines == 200
    assert task.blast_radius.secret_scan is True


def test_load_task_rejects_unknown_budget_field(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "budget-bad.yaml",
        """
id: t-budget-bad
title: budget bad
target_repo: .
goal: reject typo
budget:
  max_tokens: 100
""",
    )
    with pytest.raises(ValueError, match="unknown budget field"):
        load_task(task_file)


def test_load_task_rejects_absolute_blast_radius_path(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "blast-bad.yaml",
        """
id: t-blast-bad
title: blast bad
target_repo: .
goal: reject absolute
blast_radius:
  allowed_paths:
    - C:/tmp/secret
""",
    )
    with pytest.raises(ValueError, match="repo-relative"):
        load_task(task_file)


def test_load_task_missing_required(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "broken.yaml", "id: only\ntitle: only\n"
    )
    with pytest.raises(ValueError, match="missing required field"):
        load_task(task_file)


def test_load_task_rejects_non_mapping(tmp_path: Path) -> None:
    task_file = _write(tmp_path / "list.yaml", "- 1\n- 2\n")
    with pytest.raises(ValueError, match="mapping"):
        load_task(task_file)
