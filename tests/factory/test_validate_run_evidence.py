"""Tests for scripts/validate_run_evidence.py.

Run the script under a temporary ROOT override so the validator's
hard-coded ``ops/event-ledger`` and ``ops/run-records`` directories
can point at fixture data. The validator reads its directory paths at
import time, so this test module patches the module-level constants
before each test.
"""

from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_PATH = REPO_ROOT / "scripts"


@pytest.fixture
def validator(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):  # type: ignore[no-untyped-def]
    """Import scripts/validate_run_evidence.py with redirected paths."""
    sys.path.insert(0, str(SCRIPTS_PATH))
    try:
        module = importlib.import_module("validate_run_evidence")
        module = importlib.reload(module)
    finally:
        sys.path.remove(str(SCRIPTS_PATH))
    event_dir = tmp_path / "event-ledger"
    record_dir = tmp_path / "run-records"
    event_dir.mkdir()
    record_dir.mkdir()
    monkeypatch.setattr(module, "EVENT_LEDGER_DIR", event_dir)
    monkeypatch.setattr(module, "RUN_RECORDS_DIR", record_dir)
    return module, event_dir, record_dir


def _write_jsonl(path: Path, records: list[dict[str, object]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, sort_keys=True))
            handle.write("\n")


def _valid_event(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "event_id": "11111111-2222-4333-8444-555566667777",
        "type": "tool.call.started",
        "created_at": "2026-05-27T20:00:00Z",
        "actor": {"kind": "role", "id": "engineering.implementation"},
        "payload": {"tool_id": "factory.plan", "arguments_digest": "sha256:1"},
    }
    base.update(overrides)
    return base


def _valid_run(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "id": "run-abc",
        "spec_id": "specs/0009-factory-dev-control-plane/",
        "agent_id": "procurement-lab-factory@stub",
        "runtime": "procurement-lab-factory",
        "workspace_id": "worktree-xyz",
        "started_at": "2026-05-27T20:00:00Z",
        "status": "done",
    }
    base.update(overrides)
    return base


def test_validator_exits_zero_on_empty_dirs(validator):  # type: ignore[no-untyped-def]
    module, _, _ = validator
    assert module.main() == 0


def test_validator_accepts_valid_event_ledger_and_run_record(  # type: ignore[no-untyped-def]
    validator,
) -> None:
    module, event_dir, record_dir = validator
    ledger = event_dir / "run-abc.jsonl"
    _write_jsonl(
        ledger,
        [
            _valid_event(run_id="run-abc"),
            _valid_event(
                event_id="22222222-3333-4444-8555-666677778888",
                type="gate.run.evidence_recorded",
                run_id="run-abc",
                payload={
                    "run_id": "run-abc",
                    "fields_populated": ["prompt_snapshot_hash"],
                },
            ),
        ],
    )
    record_path = record_dir / "run-abc.json"
    record_path.write_text(
        json.dumps(_valid_run(), indent=2) + "\n", encoding="utf-8"
    )
    assert module.main() == 0


def test_validator_rejects_invalid_event_line(validator):  # type: ignore[no-untyped-def]
    module, event_dir, _ = validator
    bad = event_dir / "run-bad.jsonl"
    _write_jsonl(
        bad,
        [
            # missing event_id, actor, created_at, payload
            {"type": "tool.call.started"},
        ],
    )
    assert module.main() == 1


def test_validator_rejects_invalid_run_record(validator):  # type: ignore[no-untyped-def]
    module, _, record_dir = validator
    bad = record_dir / "run-bad.json"
    bad.write_text(json.dumps({"id": "run-bad"}), encoding="utf-8")
    assert module.main() == 1


def test_validator_flags_terminal_event_without_run_record(  # type: ignore[no-untyped-def]
    validator,
) -> None:
    module, event_dir, _ = validator
    ledger = event_dir / "run-orphan.jsonl"
    _write_jsonl(
        ledger,
        [
            _valid_event(
                type="gate.run.evidence_recorded",
                run_id="run-orphan",
                payload={
                    "run_id": "run-orphan",
                    "fields_populated": ["prompt_snapshot_hash"],
                },
            ),
        ],
    )
    # No matching run-orphan.json in run-records/. Validator must fail.
    assert module.main() == 1


def test_validator_treats_in_progress_run_as_ok(validator):  # type: ignore[no-untyped-def]
    """A ledger with no terminal event and no record should not violate."""
    module, event_dir, _ = validator
    ledger = event_dir / "run-running.jsonl"
    _write_jsonl(
        ledger,
        [
            _valid_event(
                type="tool.call.started",
                run_id="run-running",
            ),
        ],
    )
    # No terminal event so the absence of a run record is OK.
    assert module.main() == 0
