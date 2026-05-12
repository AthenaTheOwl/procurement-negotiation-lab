"""Task spec: typed YAML loader for a single factory task."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import yaml

Risk = Literal["low", "medium", "high"]
ReviewerChoice = Literal["claude_code", "codex", "stub", "none"]
Checkpoint = Literal["plan_review", "diff_review", "pre_pr"]
VALID_CHECKPOINTS: frozenset[str] = frozenset(("plan_review", "diff_review", "pre_pr"))


@dataclass
class GateSpec:
    cmd: str
    name: str | None = None
    must_pass: bool = True
    cwd: str | None = None

    def display_name(self) -> str:
        return self.name or self.cmd


@dataclass
class ReviewSpec:
    reviewer: ReviewerChoice = "claude_code"
    max_patch_rounds: int = 3


@dataclass
class PRSpec:
    open: bool = False
    base: str = "main"
    draft: bool = True
    title_template: str = "factory: {title}"


@dataclass
class Task:
    id: str
    title: str
    target_repo: str
    goal: str
    base_branch: str = "main"
    risk: Risk = "low"
    gates: list[GateSpec] = field(default_factory=list)
    review: ReviewSpec = field(default_factory=ReviewSpec)
    pr: PRSpec = field(default_factory=PRSpec)
    planner: str = "claude_code"
    implementer: str = "codex"
    checkpoints: list[str] = field(default_factory=list)

    def repo_path(self) -> Path:
        return Path(self.target_repo).expanduser().resolve()

    def has_checkpoint(self, name: str) -> bool:
        return name in self.checkpoints


def load_task(path: str | Path) -> Task:
    """Parse a task YAML file into a Task object. Raises ValueError on missing fields."""
    raw: Any = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError(f"task file {path} must be a YAML mapping at the top level")
    required = ["id", "title", "target_repo", "goal"]
    missing = [key for key in required if key not in raw]
    if missing:
        raise ValueError(f"task file {path} missing required field(s): {', '.join(missing)}")
    gates_raw = raw.get("gates") or []
    gates: list[GateSpec] = []
    for entry in gates_raw:
        if isinstance(entry, str):
            gates.append(GateSpec(cmd=entry))
        elif isinstance(entry, dict):
            gates.append(
                GateSpec(
                    cmd=entry["cmd"],
                    name=entry.get("name"),
                    must_pass=entry.get("must_pass", True),
                    cwd=entry.get("cwd"),
                )
            )
        else:
            raise ValueError(f"unrecognized gate entry: {entry!r}")
    review_raw = raw.get("review") or {}
    review = ReviewSpec(
        reviewer=review_raw.get("reviewer", "claude_code"),
        max_patch_rounds=int(review_raw.get("max_patch_rounds", 3)),
    )
    pr_raw = raw.get("pr") or {}
    pr = PRSpec(
        open=bool(pr_raw.get("open", False)),
        base=pr_raw.get("base", raw.get("base_branch", "main")),
        draft=bool(pr_raw.get("draft", True)),
        title_template=pr_raw.get("title_template", "factory: {title}"),
    )
    checkpoints_raw = raw.get("checkpoints") or []
    checkpoints: list[str] = []
    for entry in checkpoints_raw:
        if not isinstance(entry, str):
            raise ValueError(f"checkpoint entry must be a string: {entry!r}")
        if entry not in VALID_CHECKPOINTS:
            raise ValueError(
                f"unknown checkpoint {entry!r}; expected one of {sorted(VALID_CHECKPOINTS)}"
            )
        checkpoints.append(entry)
    return Task(
        id=raw["id"],
        title=raw["title"],
        target_repo=raw["target_repo"],
        goal=raw["goal"],
        base_branch=raw.get("base_branch", "main"),
        risk=raw.get("risk", "low"),
        gates=gates,
        review=review,
        pr=pr,
        planner=raw.get("planner", "claude_code"),
        implementer=raw.get("implementer", "codex"),
        checkpoints=checkpoints,
    )
