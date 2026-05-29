"""Chaos test suite for ``scripts/validate_run_evidence.py``.

Pattern: starts from the committed canonical sample
(``ops/run-records/run-7b662d3f68b1.json`` + the matching ledger at
``ops/event-ledger/run-7b662d3f68b1.jsonl``), copies both into a
per-test temp dir, applies a single targeted mutation, points the
validator's module-level path constants at the temp dir, then asserts
``validate_run_evidence.main()`` exits non-zero and that stderr names the
specific check that fired.

Covers: R-FACTORY-RUN-EVIDENCE-029, R-FACTORY-RUN-EVIDENCE-030,
R-FACTORY-RUN-EVIDENCE-031.

The committed canonical sample is the unmodified positive baseline. A
``test_canonical_sample_validates_clean`` guard runs first so a real
regression in the sample surfaces as a sample bug, not a chaos-test
false alarm. After that the seven negative tests cover one mutation
class each:

  - M1 Run.prompt_snapshot_hash mismatch (cross-check #1)
  - M2 Run.tool_schemas_snapshot_hash mismatch (cross-check #2)
  - M3 Run.gate_results_summary phantom gate (cross-check #4)
  - M4 missing terminal ``gate.run.evidence_recorded`` event
  - M5 ``pipeline.start`` payload missing ``prompt_snapshot_hash``
    (typed-event-payload validation via the oneOf discriminator)
  - M6 ``gate.run.evidence_recorded.payload.fields_populated`` claims
    a field that is not populated on the Run record (cross-check #3)
  - M7 ``Run.status == "done"`` with ``sandbox_image_ref`` removed
    (required-for-done field check)

Every mutation is applied on a copy under ``tmp_path``; the committed
canonical sample on disk is never written. If the validator's exit code
is 0 for any mutation, that is a real validator gap and the test fails
loudly with the mutation label in the assertion message.
"""

from __future__ import annotations

import importlib
import json
import shutil
import sys
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_PATH = REPO_ROOT / "scripts"
CANONICAL_RUN_ID = "run-7b662d3f68b1"
CANONICAL_RECORD = REPO_ROOT / "ops" / "run-records" / f"{CANONICAL_RUN_ID}.json"
CANONICAL_LEDGER = REPO_ROOT / "ops" / "event-ledger" / f"{CANONICAL_RUN_ID}.jsonl"


# --------------------------------------------------------------------- helpers


def _load_validator_module() -> Any:
    """Import (or reload) ``scripts/validate_run_evidence`` fresh per test."""
    sys.path.insert(0, str(SCRIPTS_PATH))
    try:
        module = importlib.import_module("validate_run_evidence")
        module = importlib.reload(module)
    finally:
        sys.path.remove(str(SCRIPTS_PATH))
    return module


def _read_canonical_record() -> dict[str, Any]:
    return json.loads(CANONICAL_RECORD.read_text(encoding="utf-8"))


def _read_canonical_events() -> list[dict[str, Any]]:
    text = CANONICAL_LEDGER.read_text(encoding="utf-8")
    events: list[dict[str, Any]] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped:
            events.append(json.loads(stripped))
    return events


def _write_jsonl(path: Path, events: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for event in events:
            handle.write(json.dumps(event, sort_keys=True))
            handle.write("\n")


def _write_record(path: Path, run: dict[str, Any]) -> None:
    path.write_text(json.dumps(run, indent=2) + "\n", encoding="utf-8")


@pytest.fixture
def chaos_lab(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> tuple[Any, Path, Path]:
    """Stage a fresh copy of the canonical sample under ``tmp_path``.

    Returns ``(module, record_path, ledger_path)`` so each test can
    mutate the staged copies and re-invoke ``module.main()`` with the
    validator's directory constants redirected at the temp dirs.
    """
    event_dir = tmp_path / "event-ledger"
    record_dir = tmp_path / "run-records"
    event_dir.mkdir()
    record_dir.mkdir()

    record_path = record_dir / f"{CANONICAL_RUN_ID}.json"
    ledger_path = event_dir / f"{CANONICAL_RUN_ID}.jsonl"
    shutil.copyfile(CANONICAL_RECORD, record_path)
    shutil.copyfile(CANONICAL_LEDGER, ledger_path)

    module = _load_validator_module()
    monkeypatch.setattr(module, "EVENT_LEDGER_DIR", event_dir)
    monkeypatch.setattr(module, "RUN_RECORDS_DIR", record_dir)
    return module, record_path, ledger_path


# --------------------------------------------------------------------- positive guard


def test_canonical_sample_validates_clean(chaos_lab) -> None:  # type: ignore[no-untyped-def]
    """Sanity: the unmodified canonical sample must validate clean.

    If this fails, the canonical sample has drifted and every chaos
    test below would be testing the wrong baseline.
    """
    module, _, _ = chaos_lab
    assert module.main() == 0, (
        "canonical sample does not validate clean; chaos tests would be "
        "testing the wrong baseline"
    )


# --------------------------------------------------------------------- M1


def test_M1_prompt_snapshot_hash_mutation_is_caught(  # type: ignore[no-untyped-def]
    chaos_lab, capsys
) -> None:
    """M1: Run.prompt_snapshot_hash mutated to a different valid hash.

    Cross-check #1 (Run.prompt_snapshot_hash matches the pipeline.start
    event's payload.prompt_snapshot_hash) must catch this.
    """
    module, record_path, _ = chaos_lab
    run = _read_canonical_record()
    run["prompt_snapshot_hash"] = "f" * 64
    _write_record(record_path, run)
    assert module.main() != 0, (
        "M1: validator did not catch a mutated Run.prompt_snapshot_hash"
    )
    err = capsys.readouterr().err
    assert "prompt_snapshot_hash" in err
    assert "does not match" in err


# --------------------------------------------------------------------- M2


def test_M2_tool_schemas_snapshot_hash_mutation_is_caught(  # type: ignore[no-untyped-def]
    chaos_lab, capsys
) -> None:
    """M2: Run.tool_schemas_snapshot_hash mutated to a different valid hash.

    Cross-check #2 (Run.tool_schemas_snapshot_hash matches the
    pipeline.start event's payload.tool_schemas_snapshot_hash) must
    catch this.
    """
    module, record_path, _ = chaos_lab
    run = _read_canonical_record()
    run["tool_schemas_snapshot_hash"] = "e" * 64
    _write_record(record_path, run)
    assert module.main() != 0, (
        "M2: validator did not catch a mutated Run.tool_schemas_snapshot_hash"
    )
    err = capsys.readouterr().err
    assert "tool_schemas_snapshot_hash" in err
    assert "does not match" in err


# --------------------------------------------------------------------- M3


def test_M3_phantom_gate_in_gates_passed_is_caught(  # type: ignore[no-untyped-def]
    chaos_lab, capsys
) -> None:
    """M3: Run.gate_results_summary.gates_passed adds a phantom gate.

    Cross-check #4 (Run.gate_results_summary matches the scan of
    gate.check.passed/gate.check.failed events) must catch this. The
    ledger has no gate.check.passed event for ``phantom_gate``, so the
    Run summary will not match the event scan.
    """
    module, record_path, _ = chaos_lab
    run = _read_canonical_record()
    summary = run["gate_results_summary"]
    assert isinstance(summary, dict)
    summary["gates_passed"] = sorted(
        list(summary.get("gates_passed", [])) + ["phantom_gate"]
    )
    _write_record(record_path, run)
    assert module.main() != 0, (
        "M3: validator did not catch a phantom gate in "
        "gate_results_summary.gates_passed"
    )
    err = capsys.readouterr().err
    assert "gate_results_summary" in err


# --------------------------------------------------------------------- M4


def test_M4_missing_terminal_evidence_event_is_caught(  # type: ignore[no-untyped-def]
    chaos_lab, capsys
) -> None:
    """M4: terminal gate.run.evidence_recorded event removed from ledger.

    The required-terminal-event check must catch this. The Run record
    still carries ``status == "done"`` so the validator must demand the
    terminal event.
    """
    module, _, ledger_path = chaos_lab
    events = _read_canonical_events()
    trimmed = [e for e in events if e.get("type") != "gate.run.evidence_recorded"]
    assert len(trimmed) < len(events), (
        "M4 precondition: the canonical sample must carry a "
        "gate.run.evidence_recorded event"
    )
    _write_jsonl(ledger_path, trimmed)
    assert module.main() != 0, (
        "M4: validator did not catch a missing gate.run.evidence_recorded "
        "event"
    )
    err = capsys.readouterr().err
    assert "gate.run.evidence_recorded" in err


# --------------------------------------------------------------------- M5


def test_M5_pipeline_start_missing_prompt_hash_is_caught(  # type: ignore[no-untyped-def]
    chaos_lab, capsys
) -> None:
    """M5: pipeline.start event's payload drops prompt_snapshot_hash.

    The typed-event-payload validation (the event schema's oneOf
    discriminator on ``type == "pipeline.start"``) requires
    ``prompt_snapshot_hash`` in the payload. Dropping it must fail the
    schema validator on that line.
    """
    module, _, ledger_path = chaos_lab
    events = _read_canonical_events()
    mutated = False
    for event in events:
        if event.get("type") == "pipeline.start":
            payload = event.get("payload")
            assert isinstance(payload, dict)
            payload.pop("prompt_snapshot_hash", None)
            mutated = True
    assert mutated, (
        "M5 precondition: the canonical sample must carry a "
        "pipeline.start event"
    )
    _write_jsonl(ledger_path, events)
    assert module.main() != 0, (
        "M5: validator did not catch a pipeline.start payload missing "
        "prompt_snapshot_hash"
    )
    err = capsys.readouterr().err
    assert "prompt_snapshot_hash" in err


# --------------------------------------------------------------------- M6


def test_M6_fields_populated_claims_unpopulated_field_is_caught(  # type: ignore[no-untyped-def]
    chaos_lab, capsys
) -> None:
    """M6: gate.run.evidence_recorded.fields_populated claims a field
    that is not populated on the Run record.

    Cross-check #3 (event fields_populated matches the actual
    replay-equivalence fields on the Run) must catch this. The
    canonical Run record does not populate ``determinism``, so claiming
    it in fields_populated creates an event-vs-Run mismatch.
    """
    module, _, ledger_path = chaos_lab
    events = _read_canonical_events()
    mutated = False
    for event in events:
        if event.get("type") == "gate.run.evidence_recorded":
            payload = event.get("payload")
            assert isinstance(payload, dict)
            populated = list(payload.get("fields_populated") or [])
            if "determinism" not in populated:
                populated.append("determinism")
            payload["fields_populated"] = sorted(populated)
            mutated = True
    assert mutated, (
        "M6 precondition: the canonical sample must carry a "
        "gate.run.evidence_recorded event"
    )
    _write_jsonl(ledger_path, events)
    assert module.main() != 0, (
        "M6: validator did not catch a fields_populated entry that is "
        "not populated on the Run record"
    )
    err = capsys.readouterr().err
    assert "fields_populated" in err


# --------------------------------------------------------------------- M7


def test_M7_done_run_missing_sandbox_image_ref_is_caught(  # type: ignore[no-untyped-def]
    chaos_lab, capsys
) -> None:
    """M7: Run.status == "done" but sandbox_image_ref dropped.

    The required-for-done field check must catch this. Status stays
    ``done`` so the discipline still fires.
    """
    module, record_path, _ = chaos_lab
    run = _read_canonical_record()
    assert run.get("status") == "done", (
        "M7 precondition: the canonical sample must carry status == 'done'"
    )
    run.pop("sandbox_image_ref")
    _write_record(record_path, run)
    assert module.main() != 0, (
        "M7: validator did not catch a done Run missing sandbox_image_ref"
    )
    err = capsys.readouterr().err
    assert "sandbox_image_ref" in err
