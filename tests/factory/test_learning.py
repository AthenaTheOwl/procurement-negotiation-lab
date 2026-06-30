"""Factory learning-loop tests."""

from __future__ import annotations

import json
from pathlib import Path

from scripts.factory.learning import recurring_failures


def _append(path: Path, row: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row) + "\n")


def test_recurring_failures_ranks_gate_failures(tmp_path: Path) -> None:
    defects = tmp_path / "defects"
    _append(
        defects / "one.jsonl",
        {"kind": "gate.failed", "gate_or_finding": "missing PRODUCT_BRIEF.md"},
    )
    _append(
        defects / "one.jsonl",
        {"kind": "gate.failed", "gate_or_finding": "missing PRODUCT_BRIEF.md"},
    )
    _append(
        defects / "two.jsonl",
        {"kind": "gate.failed", "gate_or_finding": "missing reports/*.jsonl"},
    )
    _append(
        defects / "two.jsonl",
        {"kind": "review.finding", "gate_or_finding": "not a gate failure"},
    )

    assert recurring_failures(defects, top_n=2) == [
        "missing PRODUCT_BRIEF.md (seen 2x)",
        "missing reports/*.jsonl (seen 1x)",
    ]


def test_recurring_failures_handles_empty_or_missing_logs(tmp_path: Path) -> None:
    assert recurring_failures(tmp_path / "missing") == []
    assert recurring_failures(tmp_path, top_n=0) == []
