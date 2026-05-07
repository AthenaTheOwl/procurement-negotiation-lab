"""Validate the active spec-driven-development artifact set."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "specs" / "0001-polished-simulator"

REQUIRED_FILES = [
    SPEC / "requirements.md",
    SPEC / "design.md",
    SPEC / "tasks.md",
    SPEC / "acceptance.md",
    SPEC / "research.md",
    SPEC / "traceability.md",
    SPEC / "prompt-packet.md",
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
    "R-STUDY-001",
    "R-SPEC-001",
]


def main() -> None:
    missing = [path for path in REQUIRED_FILES if not path.exists()]
    if missing:
        names = "\n".join(str(path.relative_to(ROOT)) for path in missing)
        raise SystemExit(f"missing spec files:\n{names}")

    requirements = (SPEC / "requirements.md").read_text(encoding="utf-8")
    traceability = (SPEC / "traceability.md").read_text(encoding="utf-8")
    for requirement_id in REQUIREMENT_IDS:
        if requirement_id not in requirements:
            raise SystemExit(f"{requirement_id} missing from requirements.md")
        if requirement_id not in traceability:
            raise SystemExit(f"{requirement_id} missing from traceability.md")

    acceptance = (SPEC / "acceptance.md").read_text(encoding="utf-8")
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
