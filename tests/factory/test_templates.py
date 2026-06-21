"""Factory template loader tests."""

from __future__ import annotations

from pathlib import Path

from scripts.factory.run import main
from scripts.factory.task import load_task
from scripts.factory.templates import DEFAULT_PORTFOLIO_ROOT, TemplateError, render_new_task


def _write(path: Path, contents: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents, encoding="utf-8")
    return path


def _template_root(tmp_path: Path) -> Path:
    root = tmp_path / "templates"
    template = root / "data-report"
    _write(
        template / "task.yaml.tmpl",
        """
id: {TASK_ID}
title: "{BRAND} v0.1"
target_repo: "{REPO}"
goal: "Ship {BRAND} as a useful data report."
active: true
product_vision: "Helps operators see the current bottleneck."
target_user: "portfolio operator"
first_user_action: "python -m {SLUG} validate"
system_layers:
  - ingest
planner: stub
implementer: stub
review:
  reviewers: [stub]
""",
    )
    _write(
        template / "expected_artifacts.yaml",
        """
- path: PRODUCT_BRIEF.md
- path: reports/*.jsonl
  kind: glob
""",
    )
    _write(
        template / "module_map.yaml",
        """
- name: cli
  source: {PACKAGE}/cli.py
  layer: ingest
  public_interfaces:
    - "main(argv: list[str]) -> int"
""",
    )
    return root


def test_render_new_task_substitutes_placeholders(tmp_path: Path) -> None:
    output = tmp_path / "tasks"
    rendered = render_new_task(
        template="data-report",
        repo="E:/claude_code/random-apps/binding-constraint",
        task_id="pilot-fam-binding-constraint",
        template_root=_template_root(tmp_path),
        output_dir=output,
        now="2026-06-21T00:00:00+00:00",
    )

    task = load_task(rendered.path)
    assert task.id == "pilot-fam-binding-constraint"
    assert task.active is True
    assert task.template == "data-report"
    assert task.target_repo == "E:/claude_code/random-apps/binding-constraint"
    assert task.product_vision.startswith("Helps operators")
    assert task.first_user_action == "python -m binding_constraint validate"
    assert task.expected_artifacts[1].kind == "glob"
    assert task.module_map[0].source == "binding_constraint/cli.py"


def test_render_new_task_rejects_unknown_template(tmp_path: Path) -> None:
    try:
        render_new_task(
            template="missing",
            repo="repo",
            task_id="task-id",
            template_root=_template_root(tmp_path),
            output_dir=tmp_path / "tasks",
        )
    except TemplateError as exc:
        assert "available: data-report" in str(exc)
    else:
        raise AssertionError("missing template should fail")


def test_new_task_cli_writes_yaml(tmp_path: Path, capsys) -> None:  # type: ignore[no-untyped-def]
    output = tmp_path / "tasks"
    code = main(
        [
            "--new-task",
            "--template",
            "data-report",
            "--repo",
            "binding-constraint",
            "--task-id",
            "pilot-fam-binding-constraint",
            "--template-root",
            str(_template_root(tmp_path)),
            "--task-output",
            str(output),
        ]
    )

    assert code == 0
    captured = capsys.readouterr()
    assert "pilot-fam-binding-constraint.yaml" in captured.out
    task = load_task(output / "pilot-fam-binding-constraint.yaml")
    assert task.active is True
    assert task.target_repo == (DEFAULT_PORTFOLIO_ROOT / "binding-constraint").as_posix()
    assert task.first_user_action == "python -m binding_constraint validate"


def test_new_task_cli_preserves_absolute_repo_path(tmp_path: Path) -> None:
    output = tmp_path / "tasks"
    absolute_repo = "E:/elsewhere/custom-repo"
    code = main(
        [
            "--new-task",
            "--template",
            "data-report",
            "--repo",
            absolute_repo,
            "--task-id",
            "pilot-fam-custom-repo",
            "--template-root",
            str(_template_root(tmp_path)),
            "--task-output",
            str(output),
        ]
    )

    assert code == 0
    task = load_task(output / "pilot-fam-custom-repo.yaml")
    assert task.target_repo == absolute_repo


def test_new_task_cli_missing_args_returns_2(capsys) -> None:  # type: ignore[no-untyped-def]
    code = main(["--new-task", "--template", "data-report"])

    assert code == 2
    assert "missing required" in capsys.readouterr().err
