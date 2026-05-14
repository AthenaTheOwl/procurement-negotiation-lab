"""Expand spec markdown tasks into factory task YAML files."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import yaml

TASK_RE = re.compile(r"- \[ \]\s+\*\*(?P<id>[A-Z]\d+)\*\*:\s*(?P<body>.*)")
PASS_RE = re.compile(r"^##\s+Pass\s+(?P<label>[A-Z])\s+(?:[—-]\s*)?(?P<title>.*)$")


@dataclass(frozen=True)
class ExpandedTask:
    """One generated factory task."""

    id: str
    path: Path
    pass_label: str
    task_ids: list[str]


def expand_spec_to_tasks(
    spec_dir: str | Path,
    *,
    output_dir: str | Path = "ops/factory-tasks",
    target_repo: str | Path = ".",
    base_branch: str = "main",
    overwrite: bool = False,
) -> list[ExpandedTask]:
    """Create one factory task YAML per unchecked pass in a spec tasks.md file."""
    spec_path = Path(spec_dir)
    tasks_md = spec_path / "tasks.md"
    if not tasks_md.exists():
        raise FileNotFoundError(f"missing tasks.md under {spec_path}")
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    passes = _parse_unchecked_passes(tasks_md.read_text(encoding="utf-8"))
    generated: list[ExpandedTask] = []
    for pass_label, pass_title, lines in passes:
        if not lines:
            continue
        spec_id = spec_path.name.split("-", 1)[0]
        task_id = f"spec-{spec_id}-pass-{pass_label.lower()}"
        task_path = output / f"{task_id}.yaml"
        if task_path.exists() and not overwrite:
            generated.append(
                ExpandedTask(
                    id=task_id,
                    path=task_path,
                    pass_label=pass_label,
                    task_ids=[line[0] for line in lines],
                )
            )
            continue
        payload = {
            "id": task_id,
            "title": f"{spec_path.name} Pass {pass_label}: {pass_title or 'implementation'}",
            "target_repo": str(Path(target_repo)),
            "base_branch": base_branch,
            "goal": _goal_for(spec_path, pass_label, pass_title, lines),
            "risk": "medium",
            "checkpoints": ["plan_review", "diff_review"],
            "gates": [
                {"cmd": "python -m uv run pytest", "name": "pytest"},
                {"cmd": "npm.cmd test -- --run", "name": "vitest"},
                {"cmd": "npx.cmd tsc --noEmit", "name": "tsc"},
                {"cmd": "python scripts/spec_check.py", "name": "spec_check"},
            ],
            "review": {
                "reviewers": ["claude_code", "codex"],
                "max_patch_rounds": 2,
            },
            "pr": {"open": False, "base": base_branch, "draft": True},
            "planner": "claude_code",
            "implementer": "codex",
        }
        task_path.write_text(
            yaml.safe_dump(payload, sort_keys=False, width=96),
            encoding="utf-8",
        )
        generated.append(
            ExpandedTask(
                id=task_id,
                path=task_path,
                pass_label=pass_label,
                task_ids=[line[0] for line in lines],
            )
        )
    return generated


def _parse_unchecked_passes(markdown: str) -> list[tuple[str, str, list[tuple[str, str]]]]:
    current_label = "X"
    current_title = "loose tasks"
    grouped: dict[str, tuple[str, list[tuple[str, str]]]] = {
        current_label: (current_title, [])
    }
    for line in markdown.splitlines():
        pass_match = PASS_RE.match(line.strip())
        if pass_match:
            current_label = pass_match.group("label")
            current_title = pass_match.group("title").strip()
            grouped.setdefault(current_label, (current_title, []))
            continue
        task_match = TASK_RE.match(line.strip())
        if not task_match:
            continue
        title, entries = grouped[current_label]
        entries.append((task_match.group("id"), task_match.group("body").strip()))
        grouped[current_label] = (title, entries)
    return [(label, title, entries) for label, (title, entries) in grouped.items()]


def _goal_for(
    spec_path: Path,
    pass_label: str,
    pass_title: str,
    lines: list[tuple[str, str]],
) -> str:
    task_lines = "\n".join(f"- {task_id}: {body}" for task_id, body in lines)
    return (
        f"Implement {spec_path.name} Pass {pass_label}"
        f"{f' - {pass_title}' if pass_title else ''}.\n\n"
        f"Spec directory: {spec_path}\n\n"
        "Tasks:\n"
        f"{task_lines}\n\n"
        "Keep the spec ledger current: update tasks.md, traceability.md, "
        "ops/run-ledger.md, and proof gates as appropriate."
    )
