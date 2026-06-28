"""Factory defect-log accounting tests."""

from __future__ import annotations

from pathlib import Path

from scripts.factory.defects import (
    DefectEntry,
    append_defect,
    mark_gate_defects_resolved,
    read_defects,
)


def test_mark_gate_defects_resolved_only_closes_matching_gate(tmp_path: Path) -> None:
    defects_dir = tmp_path / "defects"
    append_defect(
        "task-1",
        DefectEntry(
            kind="gate.failed",
            gate_or_finding="contract:expected-artifacts",
            round=0,
            phase="impl",
            persona="default",
            summary="missing report",
        ),
        defects_dir,
    )
    append_defect(
        "task-1",
        DefectEntry(
            kind="gate.failed",
            gate_or_finding="contract:module-map",
            round=0,
            phase="impl",
            persona="default",
            summary="missing module",
        ),
        defects_dir,
    )

    changed = mark_gate_defects_resolved(
        "task-1",
        ["contract:expected-artifacts"],
        resolved_in_round=1,
        defects_dir=defects_dir,
    )

    rows = read_defects("task-1", defects_dir)
    assert changed == 1
    by_gate = {row["gate_or_finding"]: row for row in rows}
    assert by_gate["contract:expected-artifacts"]["resolved_in_round"] == 1
    assert by_gate["contract:module-map"]["resolved_in_round"] is None

