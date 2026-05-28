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

from dataclasses import dataclass
from pathlib import Path

import pytest

import scripts.factory.pipeline as pipeline_module


@dataclass(frozen=True)
class LedgerDirs:
    """Resolved tmp directories for run-evidence ledger writes."""

    events: Path
    records: Path


@pytest.fixture(autouse=True)
def _redirect_run_evidence_dirs(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> LedgerDirs:
    """Send every emitter write under the test's tmp_path."""
    events = tmp_path / "_evidence" / "event-ledger"
    records = tmp_path / "_evidence" / "run-records"
    events.mkdir(parents=True, exist_ok=True)
    records.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(pipeline_module, "EVENT_LEDGER_DIR", events)
    monkeypatch.setattr(pipeline_module, "RUN_RECORDS_DIR", records)
    return LedgerDirs(events=events, records=records)
