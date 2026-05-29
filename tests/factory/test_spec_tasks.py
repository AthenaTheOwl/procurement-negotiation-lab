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
