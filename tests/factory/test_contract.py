"""Behavioral contract validator tests."""

from __future__ import annotations

import sys
from pathlib import Path

from scripts.factory.contract import (
    validate_artifact_content,
    validate_first_action,
    validate_interfaces,
    validate_test_bite,
    validate_unhappy_path_actions,
)
from scripts.factory.task import (
    ExpectedArtifact,
    ModuleMapEntry,
    TestBiteSpec,
    UnhappyPathAction,
)


def _write(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def test_validate_interfaces_accepts_declared_callable(tmp_path: Path) -> None:
    _write(tmp_path / "pkg" / "__init__.py", "")
    _write(
        tmp_path / "pkg" / "cli.py",
        "def main(argv=None):\n    return 0\n",
    )

    violations = validate_interfaces(
        tmp_path,
        [
            ModuleMapEntry(
                name="cli",
                source="pkg/cli.py",
                public_interfaces=["main(argv: list[str] | None = None) -> int"],
            )
        ],
    )

    assert violations == []


def test_validate_interfaces_reports_stub_interface(tmp_path: Path) -> None:
    _write(tmp_path / "pkg" / "__init__.py", "")
    _write(tmp_path / "pkg" / "cli.py", "VALUE = 1\n")

    violations = validate_interfaces(
        tmp_path,
        [
            ModuleMapEntry(
                name="cli",
                source="pkg/cli.py",
                public_interfaces=["main(argv: list[str] | None = None) -> int"],
            )
        ],
    )

    assert [violation.code for violation in violations] == ["missing-interface"]


def test_validate_artifact_content_accepts_jsonl_and_status(tmp_path: Path) -> None:
    _write(tmp_path / "reports" / "sample.jsonl", '{"ok": true}\n')
    _write(
        tmp_path / "STATUS.md",
        "## Current state\n- shipped\n\n"
        "## Known limits\n- fixture only\n\n"
        "## Next feature queue\n- add live data\n",
    )

    violations = validate_artifact_content(
        tmp_path,
        [
            ExpectedArtifact(path="reports/*.jsonl", kind="glob"),
            ExpectedArtifact(path="STATUS.md"),
        ],
    )

    assert violations == []


def test_validate_artifact_content_reports_thin_jsonl_and_status(
    tmp_path: Path,
) -> None:
    _write(tmp_path / "reports" / "bad.jsonl", "not-json\n")
    _write(
        tmp_path / "STATUS.md",
        "## Current state\n\n## Known limits\n- fixture only\n\n## Next feature queue\n",
    )

    violations = validate_artifact_content(
        tmp_path,
        [
            ExpectedArtifact(path="reports/*.jsonl", kind="glob"),
            ExpectedArtifact(path="STATUS.md"),
        ],
    )

    assert [violation.code for violation in violations] == [
        "thin-artifact",
        "thin-artifact",
        "thin-artifact",
    ]


def test_validate_artifact_content_reports_placeholder_artifact(tmp_path: Path) -> None:
    _write(tmp_path / "README.md", "TODO: replace me with real product notes.\n")

    violations = validate_artifact_content(
        tmp_path,
        [ExpectedArtifact(path="README.md")],
    )

    assert [violation.code for violation in violations] == ["placeholder-artifact"]


def test_validate_first_action_runs_successful_command(tmp_path: Path) -> None:
    _write(tmp_path / "ok.py", "raise SystemExit(0)\n")

    violations = validate_first_action(tmp_path, f"{sys.executable} ok.py")

    assert violations == []


def test_validate_first_action_reports_broken_command(tmp_path: Path) -> None:
    _write(tmp_path / "fail.py", "print('bad')\nraise SystemExit(7)\n")

    violations = validate_first_action(tmp_path, f"{sys.executable} fail.py")

    assert [violation.code for violation in violations] == ["first-action-failed"]
    assert "exit" in violations[0].message


def test_validate_unhappy_path_accepts_clean_nonzero_error(tmp_path: Path) -> None:
    _write(
        tmp_path / "bad_input.py",
        "import sys\nprint('error: missing report', file=sys.stderr)\nraise SystemExit(2)\n",
    )

    violations = validate_unhappy_path_actions(
        tmp_path,
        [UnhappyPathAction(cmd=f"{sys.executable} bad_input.py", name="missing-report")],
    )

    assert violations == []


def test_validate_unhappy_path_reports_traceback(tmp_path: Path) -> None:
    _write(tmp_path / "traceback.py", "raise RuntimeError('raw crash')\n")

    violations = validate_unhappy_path_actions(
        tmp_path,
        [UnhappyPathAction(cmd=f"{sys.executable} traceback.py", name="traceback")],
    )

    assert [violation.code for violation in violations] == ["unhappy-path-unclean-error"]
    assert "Traceback" in violations[0].message


def test_validate_unhappy_path_reports_accidental_success(tmp_path: Path) -> None:
    _write(tmp_path / "success.py", "raise SystemExit(0)\n")

    violations = validate_unhappy_path_actions(
        tmp_path,
        [UnhappyPathAction(cmd=f"{sys.executable} success.py", name="success")],
    )

    assert [violation.code for violation in violations] == ["unhappy-path-did-not-fail"]


def test_validate_test_bite_accepts_tests_that_catch_mutation(tmp_path: Path) -> None:
    _write(tmp_path / "pkg" / "__init__.py", "")
    _write(tmp_path / "pkg" / "model.py", "def score():\n    return 3\n")
    _write(
        tmp_path / "tests" / "test_model.py",
        "from pkg.model import score\n\n\ndef test_score():\n    assert score() == 3\n",
    )

    violations = validate_test_bite(
        tmp_path,
        [ModuleMapEntry(name="model", source="pkg/model.py")],
        TestBiteSpec(
            enabled=True,
            test_cmd=f"{sys.executable} -m pytest -q",
            timeout_seconds=60,
        ),
    )

    assert violations == []


def test_validate_test_bite_reports_self_confirming_tests(tmp_path: Path) -> None:
    _write(tmp_path / "pkg" / "__init__.py", "")
    _write(tmp_path / "pkg" / "model.py", "def score():\n    return 3\n")
    _write(
        tmp_path / "tests" / "test_model.py",
        "from pkg.model import score\n\n\n"
        "def test_score_is_stable():\n"
        "    assert score() == score()\n",
    )

    violations = validate_test_bite(
        tmp_path,
        [ModuleMapEntry(name="model", source="pkg/model.py")],
        TestBiteSpec(
            enabled=True,
            test_cmd=f"{sys.executable} -m pytest -q",
            timeout_seconds=60,
        ),
    )

    assert [violation.code for violation in violations] == ["test-bite-missed-mutation"]
    assert (tmp_path / "pkg" / "model.py").read_text(encoding="utf-8") == (
        "def score():\n    return 3\n"
    )
