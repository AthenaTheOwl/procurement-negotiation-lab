"""Append-only factory defect log."""

from __future__ import annotations

import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from procurement_lab.run_evidence import now_iso


@dataclass(frozen=True)
class DefectEntry:
    kind: str
    gate_or_finding: str
    round: int
    phase: str
    persona: str
    summary: str
    resolved_in_round: int | None = None
    ts: str = ""

    def to_json(self) -> dict[str, Any]:
        data = asdict(self)
        if not data["ts"]:
            data["ts"] = now_iso()
        return data


def append_defect(task_id: str, entry: DefectEntry, defects_dir: Path) -> Path | None:
    """Append one defect row. I/O errors warn and return None."""
    path = defects_dir / f"{task_id}.jsonl"
    try:
        defects_dir.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry.to_json(), sort_keys=True) + "\n")
    except OSError as exc:
        print(f"factory defect log warning: {exc}", file=sys.stderr)
        return None
    return path


def read_defects(task_id: str, defects_dir: Path) -> list[dict[str, Any]]:
    """Read defect rows for one task. Malformed rows are skipped."""
    path = defects_dir / f"{task_id}.jsonl"
    if not path.is_file():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            rows.append(parsed)
    return rows


def unresolved_defects(task_id: str, defects_dir: Path) -> list[dict[str, Any]]:
    """Return rows without ``resolved_in_round``."""
    return [
        row for row in read_defects(task_id, defects_dir) if row.get("resolved_in_round") is None
    ]
