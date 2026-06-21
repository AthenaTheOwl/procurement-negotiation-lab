"""Task spec: typed YAML loader for a single factory task."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import yaml

Risk = Literal["low", "medium", "high"]
ReviewerChoice = Literal["claude_code", "codex", "stub", "none"]
Checkpoint = Literal["plan_review", "diff_review", "pre_pr", "design_panel"]
ArtifactKind = Literal["file", "dir", "glob"]
VALID_CHECKPOINTS: frozenset[str] = frozenset(
    ("plan_review", "diff_review", "pre_pr", "design_panel")
)
VALID_REVIEWERS: frozenset[str] = frozenset(("claude_code", "codex", "stub", "none"))

# v2-lite: phase + persona + multi-tier tests.
# Phase names a stage in the SDLC pipeline. Persona names which prompt-template
# the worker should adopt. Both default to backward-compatible values.
Phase = Literal["vision", "design", "impl", "test", "deploy"]
VALID_PHASES: frozenset[str] = frozenset(("vision", "design", "impl", "test", "deploy"))
VALID_TIERS: frozenset[str] = frozenset(
    ("unit", "integration", "interface", "chaos", "edge", "functional")
)
VALID_PERSONA_REVIEWS: frozenset[str] = frozenset(("architecture", "security"))


@dataclass
class GateSpec:
    cmd: str
    name: str | None = None
    must_pass: bool = True
    cwd: str | None = None
    # v2-lite: optional tier label so attribution can group test-matrix gates.
    # Empty string means "not a tiered gate" (existing behavior). When set the
    # gate's display name is normalized to "tier:<tier>:<short-name>".
    tier: str = ""

    def display_name(self) -> str:
        return self.name or self.cmd


@dataclass
class MatrixEntry:
    """One row in the multi-tier test matrix. Converts to a GateSpec at load.

    Named MatrixEntry (not MatrixEntry) so pytest does not try to collect
    it as a test class. The YAML key remains `test_matrix`.
    """

    tier: str
    cmd: str
    blocking: bool = True
    name: str | None = None
    cwd: str | None = None

    def to_gate(self) -> GateSpec:
        gate_name = self.name or f"tier:{self.tier}"
        if not gate_name.startswith("tier:"):
            gate_name = f"tier:{self.tier}:{gate_name}"
        return GateSpec(
            cmd=self.cmd,
            name=gate_name,
            must_pass=self.blocking,
            cwd=self.cwd,
            tier=self.tier,
        )


@dataclass
class ExpectedArtifact:
    path: str
    kind: ArtifactKind = "file"
    must_be_nonempty: bool = True


@dataclass
class ModuleMapEntry:
    name: str
    source: str
    layer: str = ""
    public_interfaces: list[str] = field(default_factory=list)


@dataclass
class PersonaReview:
    name: str
    reviewer: ReviewerChoice = "claude_code"


@dataclass
class TriagePolicy:
    hold_on_contract_violation: bool = True
    hold_on_must_pass_gate_failure: bool = True
    hold_on_sensitive_disclosure: bool = True
    hold_on_noop_diff: bool = True
    hold_on_broken_first_user_action: bool = True
    investigate_on_advisory_gate_failure: bool = True
    investigate_on_review_caveat: bool = True


@dataclass
class ReviewSpec:
    reviewer: ReviewerChoice = "claude_code"
    reviewers: list[ReviewerChoice] = field(default_factory=lambda: ["claude_code"])
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
    # v2-lite additions. Defaults preserve pre-v2 behavior.
    phase: str = "impl"
    persona: str = "default"
    test_matrix: list[MatrixEntry] = field(default_factory=list)
    # active-MVP additions. Defaults preserve old task YAMLs.
    active: bool = False
    expected_artifacts: list[ExpectedArtifact] = field(default_factory=list)
    module_map: list[ModuleMapEntry] = field(default_factory=list)
    persona_reviews: list[PersonaReview] = field(default_factory=list)
    system_layers: list[str] = field(default_factory=list)
    product_vision: str = ""
    target_user: str = ""
    first_user_action: str = ""
    triage_policy: TriagePolicy = field(default_factory=TriagePolicy)
    template: str | None = None

    def repo_path(self) -> Path:
        return Path(self.target_repo).expanduser().resolve()

    def has_checkpoint(self, name: str) -> bool:
        return name in self.checkpoints

    def all_gates(self) -> list[GateSpec]:
        """Gates plus test-matrix entries converted to GateSpec. Pipeline reads this."""
        return list(self.gates) + [entry.to_gate() for entry in self.test_matrix]


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
    reviewers_raw = review_raw.get("reviewers")
    if reviewers_raw is None:
        reviewers = [review_raw.get("reviewer", "claude_code")]
    elif isinstance(reviewers_raw, list):
        reviewers = reviewers_raw
    else:
        raise ValueError("review.reviewers must be a list when provided")
    normalized_reviewers: list[ReviewerChoice] = []
    for reviewer in reviewers:
        if reviewer not in VALID_REVIEWERS:
            raise ValueError(
                f"unknown reviewer {reviewer!r}; expected one of {sorted(VALID_REVIEWERS)}"
            )
        normalized_reviewers.append(reviewer)
    review = ReviewSpec(
        reviewer=review_raw.get("reviewer", "claude_code"),
        reviewers=normalized_reviewers,
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

    phase = raw.get("phase", "impl")
    if phase not in VALID_PHASES:
        raise ValueError(f"unknown phase {phase!r}; expected one of {sorted(VALID_PHASES)}")
    persona = raw.get("persona", "default")
    if not isinstance(persona, str) or not persona:
        raise ValueError("persona must be a non-empty string")

    matrix_raw = raw.get("test_matrix") or []
    test_matrix: list[MatrixEntry] = []
    for entry in matrix_raw:
        if not isinstance(entry, dict):
            raise ValueError(f"test_matrix entry must be a mapping: {entry!r}")
        tier = entry.get("tier")
        cmd = entry.get("cmd")
        if not tier or not cmd:
            raise ValueError(f"test_matrix entry requires tier+cmd: {entry!r}")
        if tier not in VALID_TIERS:
            raise ValueError(f"unknown test tier {tier!r}; expected one of {sorted(VALID_TIERS)}")
        test_matrix.append(
            MatrixEntry(
                tier=tier,
                cmd=cmd,
                blocking=bool(entry.get("blocking", True)),
                name=entry.get("name"),
                cwd=entry.get("cwd"),
            )
        )

    active = bool(raw.get("active", False))
    product_vision = _string_field(raw, "product_vision")
    target_user = _string_field(raw, "target_user")
    first_user_action = _string_field(raw, "first_user_action")
    if active:
        missing_active = [
            name
            for name, value in (
                ("product_vision", product_vision),
                ("target_user", target_user),
                ("first_user_action", first_user_action),
            )
            if not value
        ]
        if missing_active:
            raise ValueError("active task missing required field(s): " + ", ".join(missing_active))

    system_layers = _string_list(raw.get("system_layers") or [], "system_layers")
    expected_artifacts = _parse_expected_artifacts(raw.get("expected_artifacts") or [])
    module_map = _parse_module_map(raw.get("module_map") or [], system_layers)
    persona_reviews = _parse_persona_reviews(raw.get("persona_reviews") or [])
    triage_policy = _parse_triage_policy(raw.get("triage_policy") or {})
    template = raw.get("template")
    if template is not None and not isinstance(template, str):
        raise ValueError("template must be a string when provided")

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
        phase=phase,
        persona=persona,
        test_matrix=test_matrix,
        active=active,
        expected_artifacts=expected_artifacts,
        module_map=module_map,
        persona_reviews=persona_reviews,
        system_layers=system_layers,
        product_vision=product_vision,
        target_user=target_user,
        first_user_action=first_user_action,
        triage_policy=triage_policy,
        template=template,
    )


def _string_field(raw: dict[str, Any], key: str) -> str:
    value = raw.get(key, "")
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ValueError(f"{key} must be a string")
    return value.strip()


def _string_list(value: Any, label: str) -> list[str]:
    if not isinstance(value, list):
        raise ValueError(f"{label} must be a list")
    out: list[str] = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise ValueError(f"{label} entries must be non-empty strings")
        out.append(item.strip())
    return out


def _parse_expected_artifacts(value: Any) -> list[ExpectedArtifact]:
    if not isinstance(value, list):
        raise ValueError("expected_artifacts must be a list")
    artifacts: list[ExpectedArtifact] = []
    for item in value:
        if isinstance(item, str):
            artifacts.append(ExpectedArtifact(path=item))
            continue
        if not isinstance(item, dict):
            raise ValueError(f"expected_artifacts entry must be string or mapping: {item!r}")
        path = item.get("path")
        if not isinstance(path, str) or not path.strip():
            raise ValueError(f"expected_artifacts entry requires path: {item!r}")
        kind = item.get("kind", "file")
        if kind not in ("file", "dir", "glob"):
            raise ValueError("expected_artifacts kind must be file, dir, or glob")
        artifacts.append(
            ExpectedArtifact(
                path=path.strip(),
                kind=kind,
                must_be_nonempty=bool(item.get("must_be_nonempty", True)),
            )
        )
    return artifacts


def _parse_module_map(value: Any, system_layers: list[str]) -> list[ModuleMapEntry]:
    if not isinstance(value, list):
        raise ValueError("module_map must be a list")
    layer_set = set(system_layers)
    modules: list[ModuleMapEntry] = []
    for item in value:
        if not isinstance(item, dict):
            raise ValueError(f"module_map entry must be a mapping: {item!r}")
        name = item.get("name")
        source = item.get("source")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"module_map entry requires name: {item!r}")
        if not isinstance(source, str) or not source.strip():
            raise ValueError(f"module_map entry requires source: {item!r}")
        layer = item.get("layer", item.get("system_layer", ""))
        if not isinstance(layer, str):
            raise ValueError("module_map layer must be a string when provided")
        layer = layer.strip()
        if layer_set and (not layer or layer not in layer_set):
            raise ValueError(
                f"module_map entry {name!r} layer {layer!r} must reference "
                f"one of {sorted(layer_set)}"
            )
        public_interfaces = _string_list(
            item.get("public_interfaces") or [], f"module_map[{name}].public_interfaces"
        )
        modules.append(
            ModuleMapEntry(
                name=name.strip(),
                source=source.strip(),
                layer=layer,
                public_interfaces=public_interfaces,
            )
        )
    return modules


def _parse_persona_reviews(value: Any) -> list[PersonaReview]:
    if not isinstance(value, list):
        raise ValueError("persona_reviews must be a list")
    reviews: list[PersonaReview] = []
    for item in value:
        if isinstance(item, str):
            name = item
            reviewer: ReviewerChoice = "claude_code"
        elif isinstance(item, dict):
            name = item.get("name")
            reviewer = item.get("reviewer", "claude_code")
        else:
            raise ValueError(f"persona_reviews entry must be string or mapping: {item!r}")
        if name not in VALID_PERSONA_REVIEWS:
            raise ValueError(
                f"unknown persona_review {name!r}; expected one of {sorted(VALID_PERSONA_REVIEWS)}"
            )
        if reviewer not in VALID_REVIEWERS:
            raise ValueError(
                f"unknown persona_review reviewer {reviewer!r}; expected one of "
                f"{sorted(VALID_REVIEWERS)}"
            )
        reviews.append(PersonaReview(name=name, reviewer=reviewer))
    return reviews


def _parse_triage_policy(value: Any) -> TriagePolicy:
    if value is None:
        return TriagePolicy()
    if not isinstance(value, dict):
        raise ValueError("triage_policy must be a mapping")
    allowed = set(TriagePolicy.__dataclass_fields__)
    unknown = sorted(set(value) - allowed)
    if unknown:
        raise ValueError(f"unknown triage_policy field(s): {', '.join(unknown)}")
    return TriagePolicy(**{key: bool(value[key]) for key in value})
