"""Expand spec markdown tasks into factory task YAML files."""

from __future__ import annotations

import re
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

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
    target_root = Path(target_repo)
    language = _detect_language(target_root)
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
        payload: dict[str, Any] = {
            "id": task_id,
            "title": f"{spec_path.name} Pass {pass_label}: {pass_title or 'implementation'}",
            "target_repo": str(Path(target_repo)),
            "base_branch": base_branch,
            "goal": _goal_for(spec_path, pass_label, pass_title, lines),
            "risk": "medium",
            "active": True,
            "template": "spec-pass",
            "product_vision": (
                f"Turns {spec_path.name} Pass {pass_label} into a runnable repo increment "
                "with artifacts a reviewer can inspect."
            ),
            "target_user": "operator maintaining the repo through the factory",
            "first_user_action": _first_user_action(target_root, language),
            "system_layers": ["implementation", "validation"],
            "expected_artifacts": _expected_artifacts_for(spec_path),
            "module_map": _module_map_for(target_root, language),
            "triage_policy": {
                "hold_on_contract_violation": True,
                "hold_on_must_pass_gate_failure": True,
                "hold_on_sensitive_disclosure": True,
                "hold_on_noop_diff": True,
                "hold_on_broken_first_user_action": True,
                "investigate_on_advisory_gate_failure": True,
                "investigate_on_review_caveat": True,
            },
            "checkpoints": ["plan_review", "diff_review"],
            "gates": _gates_for(target_root, language),
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


def _detect_language(target_repo: Path) -> str:
    if (target_repo / "pyproject.toml").is_file():
        return "python"
    if (target_repo / "package.json").is_file():
        return "typescript"
    return "generic"


def _gates_for(target_repo: Path, language: str) -> list[dict[str, str]]:
    gates: list[dict[str, str]] = []
    if language == "python":
        gates.append({"cmd": "python -m uv run pytest", "name": "pytest"})
    elif language == "typescript":
        gates.append({"cmd": "npm.cmd test -- --run", "name": "vitest"})
        if (target_repo / "tsconfig.json").is_file():
            gates.append({"cmd": "npx.cmd tsc --noEmit", "name": "tsc"})
    else:
        gates.append({"cmd": "python -m pytest", "name": "pytest"})
    if (target_repo / "scripts" / "spec_check.py").is_file():
        gates.append({"cmd": "python scripts/spec_check.py", "name": "spec_check"})
    return gates


def _expected_artifacts_for(spec_path: Path) -> list[dict[str, str]]:
    spec_ref = f"specs/{spec_path.name}"
    return [
        {"path": "PRODUCT_BRIEF.md"},
        {"path": "SYSTEM_MAP.md"},
        {"path": "STATUS.md"},
        {"path": "README.md"},
        {"path": f"{spec_ref}/requirements.md"},
        {"path": f"{spec_ref}/design.md"},
        {"path": f"{spec_ref}/tasks.md"},
        {"path": f"{spec_ref}/acceptance.md"},
        {"path": "tests", "kind": "dir"},
    ]


def _module_map_for(target_repo: Path, language: str) -> list[dict[str, Any]]:
    if language != "python":
        return []
    package = _python_package_name(target_repo)
    if not package:
        return []
    source = f"{package}/cli.py"
    if (target_repo / "src" / package).exists():
        source = f"src/{package}/cli.py"
    return [
        {
            "name": "cli",
            "source": source,
            "layer": "implementation",
            "public_interfaces": ["main(argv: list[str] | None = None) -> int"],
        }
    ]


def _first_user_action(target_repo: Path, language: str) -> str:
    if language == "python":
        package = _python_package_name(target_repo)
        if package:
            return f"python -m {package} validate"
        return "python -m uv run pytest"
    if language == "typescript":
        return "npm.cmd test -- --run"
    return "python -m pytest"


def _python_package_name(target_repo: Path) -> str:
    pyproject = target_repo / "pyproject.toml"
    if not pyproject.is_file():
        return ""
    try:
        data = tomllib.loads(pyproject.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError:
        return ""
    name = data.get("project", {}).get("name")
    if not isinstance(name, str) or not name.strip():
        return ""
    return name.replace("-", "_").replace(".", "_").lower()


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
