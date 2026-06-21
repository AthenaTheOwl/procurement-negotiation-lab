"""STATUS.md next-feature queue writer."""

from __future__ import annotations

from pathlib import Path
from typing import Any

REQUIRED_STATUS_SECTIONS = (
    "## Current state",
    "## Known limits",
    "## Next feature queue",
)


def update_status_md(
    target_repo: Path,
    *,
    deferred_items: list[str] | None = None,
    open_defects: list[dict[str, Any]] | None = None,
) -> list[str]:
    """Ensure STATUS.md exists and contains idempotent next-feature items."""
    target_repo = target_repo.resolve()
    status_path = target_repo / "STATUS.md"
    items = _queue_items(deferred_items or [], open_defects or [])
    existing = status_path.read_text(encoding="utf-8") if status_path.is_file() else ""
    text = _ensure_sections(existing)
    updated = _append_queue_items(text, items)
    status_path.write_text(updated, encoding="utf-8")
    return items


def _queue_items(deferred_items: list[str], open_defects: list[dict[str, Any]]) -> list[str]:
    out: list[str] = []
    for item in deferred_items:
        stripped = item.strip()
        if stripped:
            out.append(stripped)
    for defect in open_defects:
        summary = str(defect.get("summary") or defect.get("gate_or_finding") or "").strip()
        if summary:
            out.append(f"Resolve factory defect: {summary}")
    return out


def _ensure_sections(text: str) -> str:
    if not text.strip():
        text = "# Status\n\n"
    if not text.endswith("\n"):
        text += "\n"
    for section in REQUIRED_STATUS_SECTIONS:
        if section not in text:
            text += f"\n{section}\n\n"
    return text


def _append_queue_items(text: str, items: list[str]) -> str:
    if not items:
        return text
    lines = text.splitlines()
    try:
        start = lines.index("## Next feature queue") + 1
    except ValueError:
        return text
    existing = {line.strip()[2:].strip() for line in lines[start:] if line.strip().startswith("- ")}
    insert_at = start
    while insert_at < len(lines) and not lines[insert_at].startswith("## "):
        insert_at += 1
    additions = [f"- {item}" for item in items if item not in existing]
    if not additions:
        return text
    new_lines = lines[:insert_at]
    if new_lines and new_lines[-1].strip():
        new_lines.append("")
    new_lines.extend(additions)
    new_lines.extend(lines[insert_at:])
    return "\n".join(new_lines).rstrip() + "\n"
