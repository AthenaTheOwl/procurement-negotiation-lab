"""Behavioral contract validator tests."""

from __future__ import annotations

import sys
from pathlib import Path

from scripts.factory.contract import (
    validate_artifact_content,
    validate_first_action,
    validate_interfaces,
)
from scripts.factory.task import ExpectedArtifact, ModuleMapEntry


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
