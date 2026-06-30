"""Spec-to-factory task expansion tests.

Covers: R-FACTORY-002.
"""

from __future__ import annotations

from pathlib import Path

from scripts.factory.spec_tasks import expand_spec_to_tasks
from scripts.factory.task import load_task


def test_expand_spec_to_tasks_creates_one_yaml_per_unchecked_pass(tmp_path: Path) -> None:
    spec = tmp_path / "0009-example"
    spec.mkdir()
    (spec / "tasks.md").write_text(
        """
## Pass A - first

- [ ] **A1**: Do the first thing. *(R-X-001)*
- [x] **A2**: Already done. *(R-X-001)*

## Pass B - second

- [ ] **B1**: Do the second thing. *(R-X-002)*
""",
        encoding="utf-8",
    )
    out = tmp_path / "tasks"
    generated = expand_spec_to_tasks(
        spec,
        output_dir=out,
        target_repo=tmp_path,
        overwrite=True,
    )
    assert [item.id for item in generated] == ["spec-0009-pass-a", "spec-0009-pass-b"]
    task = load_task(generated[0].path)
    assert task.id == "spec-0009-pass-a"
    assert task.review.reviewers == ["claude_code", "codex"]
    assert "A1" in task.goal
    assert "A2" not in task.goal


def test_expand_spec_to_tasks_emits_active_contract_for_python_repo(
    tmp_path: Path,
) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    (repo / "pyproject.toml").write_text(
        "[project]\nname = 'sample-tool'\nversion = '0.1.0'\n",
        encoding="utf-8",
    )
    (repo / "sample_tool").mkdir()
    spec = repo / "specs" / "0012-sample"
    spec.mkdir(parents=True)
    (spec / "tasks.md").write_text(
        """
## Pass A - ship

- [ ] **A1**: Ship the command. *(R-SAMPLE-001)*
""",
        encoding="utf-8",
    )

    generated = expand_spec_to_tasks(
        spec,
        output_dir=tmp_path / "tasks",
        target_repo=repo,
        overwrite=True,
    )
    task = load_task(generated[0].path)

    assert task.active is True
    assert task.template == "spec-pass"
    assert task.first_user_action == "python -m sample_tool validate"
    assert [gate.name for gate in task.gates] == ["pytest"]
    assert all("npm" not in gate.cmd and "tsc" not in gate.cmd for gate in task.gates)
    assert {artifact.path for artifact in task.expected_artifacts} >= {
        "PRODUCT_BRIEF.md",
        "SYSTEM_MAP.md",
        "STATUS.md",
        "specs/0012-sample/requirements.md",
    }
    assert task.module_map[0].source == "sample_tool/cli.py"
    assert task.triage_policy.hold_on_contract_violation is True
