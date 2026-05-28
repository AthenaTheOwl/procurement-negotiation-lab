"""Tests for scripts/validate_run_evidence.py.

Run the script under a temporary ROOT override so the validator's
hard-coded ``ops/event-ledger`` and ``ops/run-records`` directories
can point at fixture data. The validator reads its directory paths at
import time, so this test module patches the module-level constants
before each test.

The DEC-FACTORY-008 cross-check pass is exercised by a family of
negative tests: each one starts from the well-formed baseline produced
by ``_baseline_done_run_with_ledger`` and mutates a single field so the
specific check fires.
"""

from __future__ import annotations

import importlib
import json
import sys
import uuid
from pathlib import Path
from typing import Any

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


def _new_event_id() -> str:
    return str(uuid.uuid4())


def _valid_event(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "event_id": _new_event_id(),
        "type": "tool.call.started",
        "created_at": "2026-05-27T20:00:00Z",
        "actor": {"kind": "role", "id": "engineering.implementation"},
        "payload": {"tool_name": "claude_code", "args": {"step": "plan"}},
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
        "status": "running",
    }
    base.update(overrides)
    return base


# Canonical hash literals; any 64-char lowercase hex string satisfies the
# schema. Distinct values make cross-check failures easy to read.
PROMPT_HASH = "a" * 64
TOOL_HASH = "b" * 64


def _baseline_done_run_with_ledger(
    event_dir: Path, record_dir: Path
) -> tuple[Path, Path, dict[str, Any], list[dict[str, Any]]]:
    """Write a well-formed done Run + its ledger.

    Returns ``(ledger_path, record_path, run_dict, events_list)`` so
    callers can mutate the baseline and re-write it for negative tests.
    """
    run_id = "run-okok"
    events: list[dict[str, Any]] = [
        _valid_event(
            type="pipeline.start",
            run_id=run_id,
            payload={
                "prompt_snapshot_hash": PROMPT_HASH,
                "tool_schemas_snapshot_hash": TOOL_HASH,
            },
        ),
        _valid_event(
            type="gate.check.passed",
            run_id=run_id,
            payload={"gate_name": "pytest-smoke"},
        ),
        _valid_event(
            type="gate.check.passed",
            run_id=run_id,
            payload={"gate_name": "spec_check"},
        ),
        _valid_event(
            type="pipeline.done",
            run_id=run_id,
            payload={
                "status": "done",
                "gate_results_summary": {
                    "gates_passed": ["pytest-smoke", "spec_check"],
                    "gates_failed": [],
                    "all_passed": True,
                },
            },
        ),
        _valid_event(
            type="gate.run.evidence_recorded",
            run_id=run_id,
            payload={
                "run_id": run_id,
                "fields_populated": [
                    "prompt_snapshot_hash",
                    "tool_schemas_snapshot_hash",
                    "sandbox_image_ref",
                    "gate_results_summary",
                ],
            },
        ),
    ]
    ledger_path = event_dir / f"{run_id}.jsonl"
    _write_jsonl(ledger_path, events)

    run = _valid_run(
        id=run_id,
        status="done",
        prompt_snapshot_hash=PROMPT_HASH,
        tool_schemas_snapshot_hash=TOOL_HASH,
        sandbox_image_ref="worktree-xyz@deadbeefcafe",
        gate_results_summary={
            "gates_passed": ["pytest-smoke", "spec_check"],
            "gates_failed": [],
            "all_passed": True,
        },
    )
    record_path = record_dir / f"{run_id}.json"
    record_path.write_text(
        json.dumps(run, indent=2) + "\n", encoding="utf-8"
    )
    return ledger_path, record_path, run, events


def test_validator_exits_zero_on_empty_dirs(validator):  # type: ignore[no-untyped-def]
    module, _, _ = validator
    assert module.main() == 0


def test_validator_accepts_well_formed_done_run(validator):  # type: ignore[no-untyped-def]
    """Positive: the baseline done-Run + ledger validates clean."""
    module, event_dir, record_dir = validator
    _baseline_done_run_with_ledger(event_dir, record_dir)
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


# ------------------------------------------------------------------ DEC-FACTORY-008 cross-checks


def test_validator_rejects_done_run_missing_prompt_hash(validator, capsys):  # type: ignore[no-untyped-def]
    module, event_dir, record_dir = validator
    _, record_path, run, _ = _baseline_done_run_with_ledger(event_dir, record_dir)
    run.pop("prompt_snapshot_hash")
    record_path.write_text(json.dumps(run, indent=2) + "\n", encoding="utf-8")
    assert module.main() == 1
    captured = capsys.readouterr().err
    assert "prompt_snapshot_hash" in captured
    assert "'run-okok'" in captured


def test_validator_rejects_done_run_missing_sandbox_ref(validator, capsys):  # type: ignore[no-untyped-def]
    module, event_dir, record_dir = validator
    _, record_path, run, events = _baseline_done_run_with_ledger(
        event_dir, record_dir
    )
    run.pop("sandbox_image_ref")
    record_path.write_text(json.dumps(run, indent=2) + "\n", encoding="utf-8")
    assert module.main() == 1
    captured = capsys.readouterr().err
    assert "sandbox_image_ref" in captured


def test_validator_rejects_done_run_missing_terminal_event(validator, capsys):  # type: ignore[no-untyped-def]
    module, event_dir, record_dir = validator
    ledger_path, _, _, events = _baseline_done_run_with_ledger(
        event_dir, record_dir
    )
    # Drop the gate.run.evidence_recorded event from the ledger.
    trimmed = [e for e in events if e.get("type") != "gate.run.evidence_recorded"]
    _write_jsonl(ledger_path, trimmed)
    assert module.main() == 1
    captured = capsys.readouterr().err
    assert "gate.run.evidence_recorded" in captured


def test_validator_rejects_prompt_hash_mismatch(validator, capsys):  # type: ignore[no-untyped-def]
    module, event_dir, record_dir = validator
    _, record_path, run, _ = _baseline_done_run_with_ledger(
        event_dir, record_dir
    )
    run["prompt_snapshot_hash"] = "c" * 64
    record_path.write_text(json.dumps(run, indent=2) + "\n", encoding="utf-8")
    assert module.main() == 1
    captured = capsys.readouterr().err
    assert "prompt_snapshot_hash" in captured
    assert "does not match" in captured


def test_validator_rejects_tool_schemas_hash_mismatch(validator, capsys):  # type: ignore[no-untyped-def]
    module, event_dir, record_dir = validator
    _, record_path, run, _ = _baseline_done_run_with_ledger(
        event_dir, record_dir
    )
    run["tool_schemas_snapshot_hash"] = "d" * 64
    record_path.write_text(json.dumps(run, indent=2) + "\n", encoding="utf-8")
    assert module.main() == 1
    captured = capsys.readouterr().err
    assert "tool_schemas_snapshot_hash" in captured
    assert "does not match" in captured


def test_validator_rejects_fields_populated_mismatch(validator, capsys):  # type: ignore[no-untyped-def]
    module, event_dir, record_dir = validator
    ledger_path, _, _, events = _baseline_done_run_with_ledger(
        event_dir, record_dir
    )
    # Mutate the gate.run.evidence_recorded event's fields_populated so it
    # claims one fewer field than the Run record actually populates.
    for event in events:
        if event.get("type") == "gate.run.evidence_recorded":
            event["payload"]["fields_populated"] = [  # type: ignore[index]
                "prompt_snapshot_hash",
                "tool_schemas_snapshot_hash",
            ]
    _write_jsonl(ledger_path, events)
    assert module.main() == 1
    captured = capsys.readouterr().err
    assert "fields_populated" in captured


def test_validator_rejects_gate_summary_mismatch(validator, capsys):  # type: ignore[no-untyped-def]
    module, event_dir, record_dir = validator
    _, record_path, run, _ = _baseline_done_run_with_ledger(
        event_dir, record_dir
    )
    # Run claims a gate that the ledger does not.
    summary = run["gate_results_summary"]
    assert isinstance(summary, dict)
    summary["gates_passed"] = ["pytest-smoke", "spec_check", "extra_gate"]
    record_path.write_text(json.dumps(run, indent=2) + "\n", encoding="utf-8")
    assert module.main() == 1
    captured = capsys.readouterr().err
    assert "gate_results_summary" in captured


def test_validator_passes_for_non_done_run_without_full_evidence(validator):  # type: ignore[no-untyped-def]
    """The required-for-done discipline only fires for status == 'done'."""
    module, event_dir, record_dir = validator
    # A failed run that lacks the replay-equivalence fields and the
    # gate.run.evidence_recorded event must still validate clean against
    # the schema; cross-checks only fire when status == "done".
    run_id = "run-fail"
    events = [
        _valid_event(
            type="pipeline.start",
            run_id=run_id,
            payload={
                "prompt_snapshot_hash": PROMPT_HASH,
                "tool_schemas_snapshot_hash": TOOL_HASH,
            },
        ),
    ]
    _write_jsonl(event_dir / f"{run_id}.jsonl", events)
    failed_run = _valid_run(id=run_id, status="failed")
    (record_dir / f"{run_id}.json").write_text(
        json.dumps(failed_run, indent=2) + "\n", encoding="utf-8"
    )
    assert module.main() == 0
