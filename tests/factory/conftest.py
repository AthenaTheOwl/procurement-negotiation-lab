"""Factory-test fixtures.

The pipeline writes run-evidence ledger files into
``ops/event-ledger/`` and ``ops/run-records/`` by default. Tests must
not pollute committed history, so this fixture redirects both paths to
each test's ``tmp_path`` for the duration of the test.

Tests that want to assert on ledger / record contents read from the
override directory directly (its absolute path lands on the fixture's
returned ``LedgerDirs`` mapping).
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path

import pytest

import scripts.factory.pipeline as pipeline_module


@dataclass(frozen=True)
class LedgerDirs:
    """Resolved tmp directories for run-evidence ledger writes."""

    events: Path
    records: Path
    defects: Path
    handoffs: Path


def init_git_repo(
    path: Path,
    *,
    user_email: str = "factory@test.local",
    user_name: str = "factory-test",
) -> None:
    """Create a seed git repo with hooks disabled for factory tests.

    Tests exercise the factory's own hook and gate behavior. Temporary
    repos must not inherit local/global hook paths from a developer
    workstation, so each repo gets an empty private hooks directory.
    """
    path.mkdir(parents=True, exist_ok=True)
    subprocess.run(["git", "init", "-b", "main", str(path)], check=True, capture_output=True)
    hooks_dir = path / ".git" / "disabled-hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["git", "-C", str(path), "config", "core.hooksPath", str(hooks_dir)],
        check=True,
        capture_output=True,
    )
    subprocess.run(
        ["git", "-C", str(path), "config", "user.email", user_email],
        check=True,
        capture_output=True,
    )
    subprocess.run(
        ["git", "-C", str(path), "config", "user.name", user_name],
        check=True,
        capture_output=True,
    )
    (path / "README.md").write_text("seed\n", encoding="utf-8")
    subprocess.run(["git", "-C", str(path), "add", "-A"], check=True, capture_output=True)
    subprocess.run(
        ["git", "-C", str(path), "commit", "-m", "seed"], check=True, capture_output=True
    )


@pytest.fixture(autouse=True)
def _redirect_run_evidence_dirs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> LedgerDirs:
    """Send every emitter write under the test's tmp_path."""
    events = tmp_path / "_evidence" / "event-ledger"
    records = tmp_path / "_evidence" / "run-records"
    defects = tmp_path / "_factory" / "factory-defects"
    handoffs = tmp_path / "_factory" / "handoffs"
    events.mkdir(parents=True, exist_ok=True)
    records.mkdir(parents=True, exist_ok=True)
    defects.mkdir(parents=True, exist_ok=True)
    handoffs.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(pipeline_module, "EVENT_LEDGER_DIR", events)
    monkeypatch.setattr(pipeline_module, "RUN_RECORDS_DIR", records)
    monkeypatch.setattr(pipeline_module, "FACTORY_DEFECTS_DIR", defects)
    monkeypatch.setattr(pipeline_module, "HANDOFFS_DIR", handoffs)
    return LedgerDirs(events=events, records=records, defects=defects, handoffs=handoffs)
