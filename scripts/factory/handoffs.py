"""Factory handoff packet writer."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from procurement_lab.run_evidence import now_iso


def write_handoff_packet(
    *,
    task_id: str,
    title: str,
    status: str,
    summary: str,
    trace_id: str | None,
    target_repo: Path,
    handoff_dir: Path,
    triage: str | None = None,
    defects: list[dict[str, Any]] | None = None,
    next_items: list[str] | None = None,
) -> Path:
    """Write the current operator handoff snapshot for one task."""
    handoff_dir.mkdir(parents=True, exist_ok=True)
    path = handoff_dir / f"{task_id}.md"
    defects = defects or []
    next_items = next_items or []
    text = "\n".join(
        [
            f"# Handoff - {task_id}",
            "",
            f"Date: {now_iso()}",
            f"Title: {title}",
            f"Status: {status}",
            f"Triage: {triage or 'n/a'}",
            f"Trace: {trace_id or 'n/a'}",
            f"Target repo: {target_repo.as_posix()}",
            "",
            "## What shipped",
            f"- {summary or 'No completed shipment recorded.'}",
            "",
            "## What's next",
            *_bullet_lines(next_items, fallback="No queued next feature recorded."),
            "",
            "## Pick up via",
            f"- `python -m scripts.factory.run --show {task_id}`",
            f"- `python -m scripts.factory.run --trace {task_id}`",
            "",
            "## Blocked on",
            *_defect_lines(defects),
            "",
        ]
    )
    path.write_text(text, encoding="utf-8")
    return path


def _bullet_lines(items: list[str], *, fallback: str) -> list[str]:
    if not items:
        return [f"- {fallback}"]
    return [f"- {item}" for item in items]


def _defect_lines(defects: list[dict[str, Any]]) -> list[str]:
    if not defects:
        return ["- Nothing currently blocking."]
    lines: list[str] = []
    for defect in defects:
        summary = str(defect.get("summary") or defect.get("gate_or_finding") or "open defect")
        kind = str(defect.get("kind") or "defect")
        lines.append(f"- {kind}: {summary}")
    return lines
