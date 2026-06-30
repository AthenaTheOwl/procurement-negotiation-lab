"""Factory learning-loop readers."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any


def recurring_failures(
    defects_dir: Path, *, kind: str | None = None, top_n: int = 8
) -> list[str]:
    """Return the most common gate failures from the append-only defect logs."""
    del kind  # Template-kind attribution is not stored in defect rows yet.
    if top_n <= 0 or not defects_dir.is_dir():
        return []
    counts: Counter[str] = Counter()
    for path in sorted(defects_dir.glob("*.jsonl")):
        for row in _read_jsonl(path):
            row_kind = str(row.get("kind") or "")
            if "gate" not in row_kind or "fail" not in row_kind:
                continue
            finding = str(row.get("gate_or_finding") or "").strip()
            if finding:
                counts[finding] += 1
    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    return [f"{finding} (seen {count}x)" for finding, count in ranked[:top_n]]


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return rows
    for line in lines:
        if not line.strip():
            continue
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            rows.append(parsed)
    return rows
