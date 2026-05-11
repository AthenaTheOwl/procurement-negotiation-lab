"""Validate the active spec-driven-development artifact set."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPECS = [
    ROOT / "specs" / "0001-polished-simulator",
    ROOT / "specs" / "0002-lab-authoring-workbench",
    ROOT / "specs" / "0003-bergemann-arc",
    ROOT / "specs" / "0004-operational-mechanism-refinements",
]

REQUIRED_FILE_NAMES = [
    "requirements.md",
    "design.md",
    "tasks.md",
    "acceptance.md",
    "research.md",
    "traceability.md",
]

REQUIREMENT_IDS = [
    "R-PLAY-001",
    "R-PLAY-002",
    "R-PLAY-003",
    "R-PLAY-004",
    "R-LAB-001",
    "R-LAB-002",
    "R-LAB-003",
    "R-LAB-004",
    "R-LAB-005",
    "R-LAB-006",
    "R-LAB-007",
    "R-LAB-008",
    "R-LAB-009",
    "R-ARC-001",
    "R-ARC-002",
    "R-ARC-003",
    "R-ARC-004",
    "R-ARC-005",
    "R-ARC-006",
    "R-ARC-007",
    "R-STUDY-001",
    "R-SPEC-001",
    "R-SPEC-002",
    "R-SPEC-003",
    "R-OPS-001",
    "R-OPS-002",
    "R-OPS-003",
    "R-OPS-004",
    "R-SPEC-004",
]


def main() -> None:
    missing = [
        spec / file_name
        for spec in SPECS
        for file_name in REQUIRED_FILE_NAMES
        if not (spec / file_name).exists()
    ]
    if missing:
        names = "\n".join(str(path.relative_to(ROOT)) for path in missing)
        raise SystemExit(f"missing spec files:\n{names}")

    requirements = "\n".join(
        (spec / "requirements.md").read_text(encoding="utf-8") for spec in SPECS
    )
    traceability = "\n".join(
        (spec / "traceability.md").read_text(encoding="utf-8") for spec in SPECS
    )
    for requirement_id in REQUIREMENT_IDS:
        if requirement_id not in requirements:
            raise SystemExit(f"{requirement_id} missing from requirements.md")
        if requirement_id not in traceability:
            raise SystemExit(f"{requirement_id} missing from traceability.md")

    acceptance = "\n".join((spec / "acceptance.md").read_text(encoding="utf-8") for spec in SPECS)
    for gate in [
        "python -m uv run pytest",
        "npm.cmd run build",
        "Browser QA",
    ]:
        if gate not in acceptance:
            raise SystemExit(f"acceptance gate missing: {gate}")

    print("spec_check OK")


if __name__ == "__main__":
    main()
