"""Validate run-evidence artifacts emitted by the factory pipeline.

Walks two directories and validates each record against the cross-repo
schemas mirrored in ``ops/schemas-cache/``:

- ``ops/event-ledger/<run-id>.jsonl`` — append-only event ledger files;
  each line must be a JSON object conforming to ``event.schema.json``.
- ``ops/run-records/<run-id>.json`` — final Run records; each file must
  conform to the amended ``run.schema.json`` carrying the six
  replay-equivalence fields.

Beyond schema validation, the validator enforces Run-level run-evidence
discipline (DEC-FACTORY-008) for every Run whose ``status == "done"``:

- Required-for-done fields: ``prompt_snapshot_hash``,
  ``tool_schemas_snapshot_hash``, ``sandbox_image_ref``, and
  ``gate_results_summary`` must all be present and non-empty.
- Required terminal event: the ledger must carry at least one
  ``gate.run.evidence_recorded`` event for the run.
- Cross-checks (each is a hard failure):
    1. ``Run.prompt_snapshot_hash`` matches the pipeline.start event's
       ``payload.prompt_snapshot_hash``.
    2. ``Run.tool_schemas_snapshot_hash`` matches the pipeline.start
       event's ``payload.tool_schemas_snapshot_hash``.
    3. The ``gate.run.evidence_recorded`` event's
       ``payload.fields_populated`` matches (as sorted sets) the
       replay-equivalence fields actually populated on the Run record.
    4. ``Run.gate_results_summary`` matches the scan of
       ``gate.check.passed`` / ``gate.check.failed`` events in the
       ledger (``gates_passed`` and ``gates_failed`` are the sorted gate
       names; ``all_passed`` is ``len(gates_failed) == 0``).

Cross-check: every ``run_id`` referenced by an event in the ledger must
either have a matching Run record file or be flagged as in-progress
(distinct from absent — an in-progress run is one whose ledger lacks a
``pipeline.done`` or ``gate.run.evidence_recorded`` terminal event).

Exit codes: ``0`` OK, ``1`` violations found. Violation detail is written
to stderr in the same shape as ``scripts/validate_decisions.py``.

This validator follows the offline-first pattern used by the other
``validate_*.py`` scripts: it loads the cached schema, never talks to the
network, and treats a missing schema cache file as a hard error.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "ops" / "schemas-cache"
EVENT_LEDGER_DIR = ROOT / "ops" / "event-ledger"
RUN_RECORDS_DIR = ROOT / "ops" / "run-records"

EVENT_SCHEMA_PATH = CACHE_DIR / "event.schema.json"
RUN_SCHEMA_PATH = CACHE_DIR / "run.schema.json"

# Terminal event types: presence in a ledger means the run is no longer
# in-progress. A missing Run record alongside any of these types is a
# violation.
TERMINAL_EVENT_TYPES = frozenset(
    {"gate.run.evidence_recorded", "pipeline.done"}
)

# Replay-equivalence fields that Run records may populate. The validator
# uses this list to compute the actual `fields_populated` set on a Run
# record and compare it against the gate.run.evidence_recorded event.
REPLAY_EQUIVALENCE_FIELDS = (
    "prompt_snapshot_hash",
    "tool_schemas_snapshot_hash",
    "determinism",
    "checkpoint_ref",
    "sandbox_image_ref",
    "gate_results_summary",
)

# Fields a done Run must populate (non-empty). The two hashes plus the
# sandbox ref plus the gate rollup are derivable today; determinism and
# checkpoint_ref stay optional per DEC-FACTORY-007.
REQUIRED_DONE_FIELDS = (
    "prompt_snapshot_hash",
    "tool_schemas_snapshot_hash",
    "sandbox_image_ref",
    "gate_results_summary",
)


def _load_schema(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise SystemExit(
            f"validate_run_evidence: cached schema missing at "
            f"{path.relative_to(ROOT).as_posix()}. Re-cache from athena-site."
        )
    return json.loads(path.read_text(encoding="utf-8"))


def _validator_for(schema: dict[str, Any]) -> Any:
    try:
        import jsonschema  # type: ignore[import-untyped]
    except ImportError as exc:
        raise SystemExit(
            "validate_run_evidence: jsonschema is required. "
            "Install with `pip install jsonschema>=4.21`."
        ) from exc
    validator_cls = jsonschema.validators.validator_for(schema)
    validator_cls.check_schema(schema)
    return validator_cls(schema)


def _format_errors(prefix: str, errors: list[Any]) -> list[str]:
    formatted: list[str] = []
    for err in errors:
        location = "/".join(str(part) for part in err.path) or "<root>"
        formatted.append(f"{prefix}: {location}: {err.message}")
    return formatted


def _safe_rel(path: Path) -> str:
    """Return ``path`` relative to ROOT when possible, else the absolute form."""
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def validate_event_ledger(
    validator: Any,
) -> tuple[list[str], dict[str, list[str]], set[str], dict[str, list[dict[str, Any]]]]:
    """Walk every JSONL ledger file and validate every line.

    Returns ``(violations, run_to_event_types, run_ids_seen, run_to_events)``:
    ``run_to_event_types`` maps each referenced run_id to the list of
    event types observed; ``run_ids_seen`` is the union of all run_ids
    found in any event record; ``run_to_events`` maps each run_id to the
    list of full event dicts (used by the cross-check pass).
    """
    violations: list[str] = []
    run_to_event_types: dict[str, list[str]] = {}
    run_to_events: dict[str, list[dict[str, Any]]] = {}
    run_ids: set[str] = set()
    if not EVENT_LEDGER_DIR.is_dir():
        return violations, run_to_event_types, run_ids, run_to_events
    for ledger in sorted(EVENT_LEDGER_DIR.glob("*.jsonl")):
        rel = _safe_rel(ledger)
        text = ledger.read_text(encoding="utf-8")
        for line_no, raw in enumerate(text.splitlines(), start=1):
            stripped = raw.strip()
            if not stripped:
                continue
            try:
                event = json.loads(stripped)
            except json.JSONDecodeError as exc:
                violations.append(f"{rel}:{line_no}: invalid JSON: {exc}")
                continue
            if not isinstance(event, dict):
                violations.append(
                    f"{rel}:{line_no}: top-level value must be a JSON object"
                )
                continue
            errs = sorted(
                validator.iter_errors(event), key=lambda e: e.path
            )
            violations.extend(_format_errors(f"{rel}:{line_no}", errs))
            run_id = event.get("run_id")
            if isinstance(run_id, str) and run_id:
                run_ids.add(run_id)
                run_to_event_types.setdefault(run_id, []).append(
                    str(event.get("type", ""))
                )
                run_to_events.setdefault(run_id, []).append(event)
    return violations, run_to_event_types, run_ids, run_to_events


def validate_run_records(
    validator: Any,
) -> tuple[list[str], set[str], dict[str, dict[str, Any]]]:
    """Walk every Run record file and validate the JSON body.

    Returns ``(violations, run_ids_recorded, recorded_runs)``.
    """
    violations: list[str] = []
    recorded: set[str] = set()
    recorded_runs: dict[str, dict[str, Any]] = {}
    if not RUN_RECORDS_DIR.is_dir():
        return violations, recorded, recorded_runs
    for record in sorted(RUN_RECORDS_DIR.glob("*.json")):
        rel = _safe_rel(record)
        try:
            run = json.loads(record.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            violations.append(f"{rel}: invalid JSON: {exc}")
            continue
        if not isinstance(run, dict):
            violations.append(f"{rel}: top-level value must be a JSON object")
            continue
        errs = sorted(validator.iter_errors(run), key=lambda e: e.path)
        violations.extend(_format_errors(rel, errs))
        run_id = run.get("id")
        if isinstance(run_id, str) and run_id:
            recorded.add(run_id)
            recorded_runs[run_id] = run
    return violations, recorded, recorded_runs


def cross_check(
    run_to_event_types: dict[str, list[str]],
    run_ids_in_events: set[str],
    run_ids_recorded: set[str],
) -> list[str]:
    """Cross-check that terminal events have matching Run records."""
    violations: list[str] = []
    for run_id in sorted(run_ids_in_events):
        types = set(run_to_event_types.get(run_id, []))
        has_terminal = bool(types & TERMINAL_EVENT_TYPES)
        if has_terminal and run_id not in run_ids_recorded:
            violations.append(
                f"run_id {run_id!r}: ledger carries terminal event "
                f"({sorted(types & TERMINAL_EVENT_TYPES)}) but no matching "
                f"ops/run-records/{run_id}.json"
            )
    return violations


def _is_empty(value: Any) -> bool:
    """Return True for None or for an empty string / list / dict."""
    if value is None:
        return True
    if isinstance(value, (str, list, dict)) and len(value) == 0:
        return True
    return False


def _events_of_type(
    events: list[dict[str, Any]], type_name: str
) -> list[dict[str, Any]]:
    return [e for e in events if e.get("type") == type_name]


def _aggregate_gate_results_from_events(
    events: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compute the canonical gate_results_summary by scanning gate events.

    Matches the rollup the validator expects on Run.gate_results_summary:
    ``gates_passed`` is the sorted list of gate_name strings from
    ``gate.check.passed`` events; ``gates_failed`` is the sorted list
    from ``gate.check.failed`` events; ``all_passed`` is true iff
    ``gates_failed`` is empty.
    """
    passed: list[str] = []
    failed: list[str] = []
    for event in events:
        type_name = event.get("type")
        payload = event.get("payload") or {}
        name = payload.get("gate_name") if isinstance(payload, dict) else None
        if not isinstance(name, str) or not name:
            continue
        if type_name == "gate.check.passed":
            passed.append(name)
        elif type_name == "gate.check.failed":
            failed.append(name)
    return {
        "gates_passed": sorted(passed),
        "gates_failed": sorted(failed),
        "all_passed": not failed,
    }


def cross_check_done_runs(
    recorded_runs: dict[str, dict[str, Any]],
    run_to_events: dict[str, list[dict[str, Any]]],
) -> list[str]:
    """Enforce Run-level required-for-done fields + four cross-checks.

    See module docstring for the exact contract. Returns a list of
    human-readable violation strings; an empty list means every done
    Run is conformant.
    """
    violations: list[str] = []
    for run_id, run in sorted(recorded_runs.items()):
        status = run.get("status")
        if status != "done":
            continue

        # Required-for-done field check.
        for field in REQUIRED_DONE_FIELDS:
            if field not in run or _is_empty(run.get(field)):
                violations.append(
                    f"run_id {run_id!r}: Run.status == 'done' but required "
                    f"field {field!r} is missing or empty"
                )

        events = run_to_events.get(run_id, [])

        # Required terminal gate.run.evidence_recorded event.
        terminal_events = _events_of_type(events, "gate.run.evidence_recorded")
        if not terminal_events:
            violations.append(
                f"run_id {run_id!r}: Run.status == 'done' but no "
                f"'gate.run.evidence_recorded' event found in the ledger"
            )

        # Cross-checks 1 + 2: pipeline.start payload must match Run hashes.
        start_events = _events_of_type(events, "pipeline.start")
        if not start_events:
            violations.append(
                f"run_id {run_id!r}: Run.status == 'done' but no "
                f"'pipeline.start' event found in the ledger; cannot "
                f"cross-check prompt_snapshot_hash / "
                f"tool_schemas_snapshot_hash"
            )
        else:
            start_payload = start_events[0].get("payload") or {}
            for field in ("prompt_snapshot_hash", "tool_schemas_snapshot_hash"):
                run_value = run.get(field)
                event_value = (
                    start_payload.get(field)
                    if isinstance(start_payload, dict)
                    else None
                )
                if run_value != event_value:
                    violations.append(
                        f"run_id {run_id!r}: Run.{field} ({run_value!r}) "
                        f"does not match pipeline.start "
                        f"payload.{field} ({event_value!r})"
                    )

        # Cross-check 3: gate.run.evidence_recorded.fields_populated
        # matches the actual replay-equivalence fields on the Run record.
        if terminal_events:
            term_payload = terminal_events[-1].get("payload") or {}
            event_fields_raw = (
                term_payload.get("fields_populated")
                if isinstance(term_payload, dict)
                else None
            )
            event_fields = (
                sorted({str(f) for f in event_fields_raw})
                if isinstance(event_fields_raw, list)
                else []
            )
            run_fields = sorted(
                name for name in REPLAY_EQUIVALENCE_FIELDS if name in run
            )
            if event_fields != run_fields:
                violations.append(
                    f"run_id {run_id!r}: "
                    f"gate.run.evidence_recorded.fields_populated "
                    f"({event_fields}) does not match the replay-equivalence "
                    f"fields actually populated on the Run record "
                    f"({run_fields})"
                )

        # Cross-check 4: Run.gate_results_summary matches the scan of
        # gate.check.* events.
        run_summary = run.get("gate_results_summary")
        if isinstance(run_summary, dict):
            expected = _aggregate_gate_results_from_events(events)
            run_summary_normalized = {
                "gates_passed": sorted(run_summary.get("gates_passed") or []),
                "gates_failed": sorted(run_summary.get("gates_failed") or []),
                "all_passed": bool(run_summary.get("all_passed")),
            }
            if run_summary_normalized != expected:
                violations.append(
                    f"run_id {run_id!r}: Run.gate_results_summary "
                    f"({run_summary_normalized}) does not match the scan of "
                    f"gate.check.* events ({expected})"
                )
    return violations


def main() -> int:
    event_schema = _load_schema(EVENT_SCHEMA_PATH)
    run_schema = _load_schema(RUN_SCHEMA_PATH)
    event_validator = _validator_for(event_schema)
    run_validator = _validator_for(run_schema)

    (
        event_violations,
        run_to_types,
        run_ids_in_events,
        run_to_events,
    ) = validate_event_ledger(event_validator)
    record_violations, recorded_ids, recorded_runs = validate_run_records(
        run_validator
    )
    cross_violations = cross_check(run_to_types, run_ids_in_events, recorded_ids)
    done_violations = cross_check_done_runs(recorded_runs, run_to_events)

    all_violations = (
        event_violations + record_violations + cross_violations + done_violations
    )
    if all_violations:
        for line in all_violations:
            print(line, file=sys.stderr)
        print(
            f"validate_run_evidence: {len(all_violations)} violation(s) found",
            file=sys.stderr,
        )
        return 1

    n_events = sum(len(v) for v in run_to_types.values())
    print(
        f"validate_run_evidence OK ("
        f"{n_events} event(s), "
        f"{len(recorded_ids)} run record(s), "
        f"{len(run_ids_in_events)} run_id(s) referenced)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
