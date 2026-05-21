"""Validate the active spec-driven-development artifact set.

The check is intentionally repo-specific. It prevents the failure mode where a
feature ships with nice code and green tests, but the requirements, traceability,
and proof gates are stale or missing.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPECS_ROOT = ROOT / "specs"

REQUIRED_FILE_NAMES = [
    "requirements.md",
    "design.md",
    "tasks.md",
    "acceptance.md",
    "research.md",
    "traceability.md",
]

REQUIREMENT_RE = re.compile(r"^###\s+(R-[A-Z0-9-]+):", re.MULTILINE)
TRACEABILITY_ID_RE = re.compile(r"\b(R-[A-Z0-9-]+)\b")

REQUIRED_ACCEPTANCE_GATES = [
    "python -m uv run pytest",
    "npm.cmd run build",
    "Browser QA",
]

REQUIRED_WORKFLOW_PROOFS = {
    ".github/workflows/tests.yml": [
        "scripts/spec_check.py",
        "scripts/voice_lint.py",
        "uv run pytest",
        "uv run ruff check .",
        "uv run mypy src",
    ],
    ".github/workflows/frontend.yml": [
        "npm ci",
        "npm run lint",
        "npm run build",
        "npm run test",
        "npm run test --workspace=@lab/mobile",
        "npm run typecheck --workspace=@lab/mobile",
        "npm run smoke --workspace=@lab/web",
    ],
    ".github/workflows/security.yml": [
        "uv run bandit",
        "uv run pip-audit",
    ],
    ".github/workflows/smoke.yml": [
        "workflow_dispatch",
        "schedule",
        "procurement-negotiation-lab.vercel.app",
        "playwright",
    ],
}

REQUIRED_PACKAGE_SCRIPTS = {
    "lint",
    "test",
    "build",
    "smoke",
    "verify:js",
    "verify:py",
    "verify",
}

REQUIRED_AGENT_PROTOCOL = [
    "npm.cmd run verify",
    "python scripts/spec_check.py",
    "python scripts/voice_lint.py",
    "npm.cmd run test --workspace=@lab/mobile -- --runInBand",
    "SMOKE_URL=https://procurement-negotiation-lab.vercel.app/",
]


def active_specs() -> list[Path]:
    return sorted(
        path
        for path in SPECS_ROOT.iterdir()
        if path.is_dir() and re.match(r"^\d{4}-", path.name)
    )


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def requirement_ids(spec: Path) -> list[str]:
    ids = REQUIREMENT_RE.findall(read(spec / "requirements.md"))
    if not ids:
        raise SystemExit(f"{relative(spec / 'requirements.md')} has no R-* headings")
    return ids


def check_required_files(specs: list[Path]) -> None:
    missing = [
        spec / file_name
        for spec in specs
        for file_name in REQUIRED_FILE_NAMES
        if not (spec / file_name).exists()
    ]
    if missing:
        names = "\n".join(relative(path) for path in missing)
        raise SystemExit(f"missing spec files:\n{names}")


def check_readme_lists_specs(specs: list[Path]) -> None:
    readme = read(SPECS_ROOT / "README.md")
    missing = [spec.name for spec in specs if spec.name not in readme]
    if missing:
        names = "\n".join(missing)
        raise SystemExit(f"specs/README.md missing active spec(s):\n{names}")


def check_traceability(specs: list[Path]) -> None:
    all_ids: list[str] = []
    for spec in specs:
        ids = requirement_ids(spec)
        all_ids.extend(ids)
        traceability = read(spec / "traceability.md")
        traced_ids = set(TRACEABILITY_ID_RE.findall(traceability))
        missing = [requirement_id for requirement_id in ids if requirement_id not in traced_ids]
        if missing:
            names = "\n".join(missing)
            raise SystemExit(f"{relative(spec / 'traceability.md')} missing:\n{names}")

    duplicates = [requirement_id for requirement_id, count in Counter(all_ids).items() if count > 1]
    if duplicates:
        names = "\n".join(sorted(duplicates))
        raise SystemExit(f"duplicate requirement id(s):\n{names}")


def check_acceptance_gates(specs: list[Path]) -> None:
    acceptance = "\n".join(read(spec / "acceptance.md") for spec in specs)
    missing = [gate for gate in REQUIRED_ACCEPTANCE_GATES if gate not in acceptance]
    if missing:
        names = "\n".join(missing)
        raise SystemExit(f"acceptance gate missing:\n{names}")


def check_workflow_proofs() -> None:
    missing: list[str] = []
    for workflow_name, needles in REQUIRED_WORKFLOW_PROOFS.items():
        workflow = ROOT / workflow_name
        if not workflow.exists():
            missing.append(f"{workflow_name}: file missing")
            continue
        text = read(workflow)
        for needle in needles:
            if needle not in text:
                missing.append(f"{workflow_name}: missing {needle!r}")
    if missing:
        raise SystemExit("workflow proof missing:\n" + "\n".join(missing))


def check_local_protocol() -> None:
    package = json.loads(read(ROOT / "package.json"))
    scripts = package.get("scripts", {})
    missing_scripts = sorted(REQUIRED_PACKAGE_SCRIPTS - set(scripts))
    if missing_scripts:
        raise SystemExit(
            "package.json missing verification scripts:\n" + "\n".join(missing_scripts)
        )

    agents = read(ROOT / "AGENTS.md")
    missing_agent_rules = [
        needle for needle in REQUIRED_AGENT_PROTOCOL if needle not in agents
    ]
    if missing_agent_rules:
        raise SystemExit(
            "AGENTS.md missing execution protocol:\n" + "\n".join(missing_agent_rules)
        )


def main() -> None:
    specs = active_specs()
    if not specs:
        raise SystemExit("no active specs found")
    check_required_files(specs)
    check_readme_lists_specs(specs)
    check_traceability(specs)
    check_acceptance_gates(specs)
    check_workflow_proofs()
    check_local_protocol()
    print(f"spec_check OK ({len(specs)} active specs)")


if __name__ == "__main__":
    main()
