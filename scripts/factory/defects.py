"""Append-only factory defect log."""

from __future__ import annotations

import json
import re
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


def operator_defect_summary(defect: dict[str, Any], *, max_len: int = 180) -> str:
    """Return a concise, public-safe summary for STATUS and handoff surfaces."""
    summary = str(defect.get("summary") or defect.get("gate_or_finding") or "open defect")
    finding = str(defect.get("gate_or_finding") or "").strip()
    normalized = " ".join(summary.split())
    raw_lower = normalized.lower()
    if normalized.startswith("=== reviewer:") or raw_lower.startswith("{"):
        reviewer = finding.replace("=== reviewer:", "").replace("===", "").strip()
        reviewer = reviewer or "reviewer"
        if re.search(r'"api_error_status"\s*:\s*429', raw_lower) or "rate limited" in raw_lower:
            return f"{reviewer} review hit provider rate limit; rerun or inspect defect log"
        return f"{reviewer} review requested patch; inspect defect log"
    normalized = re.sub(r'"session_id"\s*:\s*"[^"]+"', '"session_id":"<redacted>"', normalized)
    normalized = re.sub(
        r'"total_cost_usd"\s*:\s*[0-9.]+',
        '"total_cost_usd":"<redacted>"',
        normalized,
    )
    if len(normalized) <= max_len:
        return normalized
    return normalized[: max_len - 1].rstrip() + "..."
