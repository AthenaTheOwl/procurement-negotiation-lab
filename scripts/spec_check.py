"""Validate the active spec-driven-development artifact set.

The check is intentionally repo-specific. It prevents the failure mode where a
feature ships with nice code and green tests, but the requirements, traceability,
and proof gates are stale or missing.

CDCP rule (added by spec 0013):
  Every R-* requirement defined in any requirements.md must be resolved
  by at least one decisions/DEC-*.md file whose front-matter
  `requirement:` field names that ID, OR be listed under `deferred` in
  `decisions/.spec-check-allowlist.yaml`, OR carry an R-CDCP-* prefix
  (covered collectively by DEC-CDCP-001-install-cdcp-governance.md).

Operating-model rule:
  Every R-* requirement must name an owning role via an `owner_role:`
  token in traceability.md, or be listed under `roles_deferred` in the
  allowlist while a catalog role waits for graduation.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPECS_ROOT = ROOT / "specs"
DECISIONS_ROOT = ROOT / "decisions"
ALLOWLIST_PATH = DECISIONS_ROOT / ".spec-check-allowlist.yaml"

# R-* requirements with this prefix do not need a per-ID DEC; they are
# resolved collectively by DEC-CDCP-001-install-cdcp-governance.md.
DEC_BOOTSTRAP_PREFIXES = {"CDCP"}

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
ID_PREFIX_RE = re.compile(r"^R-([A-Z][A-Z0-9]*)-\d+$")
OWNER_ROLE_RE = re.compile(r"owner_role:\s*([a-z][a-z0-9_]*\.[a-z][a-z0-9_-]*)")

REQUIRED_ACCEPTANCE_GATES = [
    "python -m uv run pytest",
    "npm.cmd run build",
    "Browser QA",
]

REQUIRED_WORKFLOW_PROOFS = {
    ".github/workflows/tests.yml": [
        "scripts/spec_check.py",
        "scripts/voice_lint.py",
        "scripts/validate_decisions.py",
        "scripts/validate_roles.py",
        "scripts/validate_tools.py",
        "scripts/validate_policies.py",
        "scripts/validate_run_evidence.py",
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
    ".github/workflows/run-evidence-gates.yml": [
        "pull_request",
        "ubuntu-latest",
        "python-version",
        "AthenaTheOwl/trace-to-eval-harness",
        "trace_to_eval evidence from-cdcp-events",
        "trace_to_eval evidence validate",
        "scripts/replay_run.py",
        "fetch-depth: 0",
        "run-7b662d3f68b1",
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


def parse_dec_requirement(text: str) -> str | None:
    """Pull the `requirement:` value from a DEC file's YAML front-matter."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for line in lines[1:]:
        stripped = line.strip()
        if stripped == "---":
            break
        if stripped.startswith("requirement:"):
            value = stripped.split(":", 1)[1].strip()
            value = value.strip("\"'")
            return value or None
    return None


def collect_dec_requirements() -> set[str]:
    """Return the set of R-* IDs that at least one DEC file resolves."""
    resolved: set[str] = set()
    if not DECISIONS_ROOT.is_dir():
        return resolved
    for path in DECISIONS_ROOT.glob("DEC-*.md"):
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        rid = parse_dec_requirement(text)
        if rid:
            resolved.add(rid)
    return resolved


def collect_allowlisted() -> set[str]:
    """Return the set of R-* IDs deferred via the allowlist file."""
    return collect_allowlist_key("deferred")


def collect_roles_deferred() -> set[str]:
    """Return the set of R-* IDs deferred from owner-role enforcement."""
    return collect_allowlist_key("roles_deferred")


def collect_allowlist_key(key: str) -> set[str]:
    """Return the set of R-* IDs listed under one allowlist key."""
    if not ALLOWLIST_PATH.is_file():
        return set()
    try:
        import yaml  # type: ignore[import-not-found]
    except ImportError:
        print(
            f"spec_check: PyYAML not installed; "
            f"cannot read {ALLOWLIST_PATH.relative_to(ROOT).as_posix()}",
            file=sys.stderr,
        )
        return set()
    try:
        data = yaml.safe_load(ALLOWLIST_PATH.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        print(
            f"spec_check: failed to parse "
            f"{ALLOWLIST_PATH.relative_to(ROOT).as_posix()}: {exc}",
            file=sys.stderr,
        )
        return set()
    if not isinstance(data, dict):
        return set()
    entries = data.get(key)
    if not isinstance(entries, list):
        return set()
    ids: set[str] = set()
    for entry in entries:
        if isinstance(entry, dict) and isinstance(entry.get("id"), str):
            ids.add(entry["id"])
        elif isinstance(entry, str):
            ids.add(entry)
    return ids


def collect_owner_roles(trace_text: str) -> dict[str, list[str]]:
    """Map each R-* ID on a traceability row to owner_role tokens on that row."""
    owners: dict[str, list[str]] = {}
    for line in trace_text.splitlines():
        ids_on_line = set(TRACEABILITY_ID_RE.findall(line))
        if not ids_on_line:
            continue
        owner_tokens = OWNER_ROLE_RE.findall(line)
        if not owner_tokens:
            continue
        for rid in ids_on_line:
            owners.setdefault(rid, []).extend(owner_tokens)
    return owners


def check_dec_coverage(specs: list[Path]) -> None:
    """CDCP rule: every R-* requires a DEC, an allowlist entry, or a
    bootstrap-exempt prefix."""
    all_ids: set[str] = set()
    for spec in specs:
        req_path = spec / "requirements.md"
        if not req_path.is_file():
            continue
        ids = REQUIREMENT_RE.findall(read(req_path))
        all_ids.update(ids)

    dec_resolved = collect_dec_requirements()
    allowlisted = collect_allowlisted()
    missing: list[str] = []
    for rid in sorted(all_ids):
        match = ID_PREFIX_RE.match(rid)
        prefix = match.group(1) if match else ""
        if prefix in DEC_BOOTSTRAP_PREFIXES:
            continue
        if rid in dec_resolved:
            continue
        if rid in allowlisted:
            continue
        missing.append(rid)
    if missing:
        names = "\n".join(missing)
        raise SystemExit(
            "decisions/: no DEC-* file resolves the following requirement(s) "
            "(add a decisions/DEC-*.md with `requirement: <id>` in front-matter, "
            "or list the id under `deferred` in "
            "decisions/.spec-check-allowlist.yaml):\n" + names
        )


def check_owner_role_coverage(specs: list[Path]) -> None:
    """Operating-model rule: every R-* needs owner_role coverage."""
    all_ids: set[str] = set()
    all_owners: dict[str, list[str]] = {}
    for spec in specs:
        req_path = spec / "requirements.md"
        trace_path = spec / "traceability.md"
        if req_path.is_file():
            all_ids.update(REQUIREMENT_RE.findall(read(req_path)))
        if trace_path.is_file():
            for rid, owner_list in collect_owner_roles(read(trace_path)).items():
                all_owners.setdefault(rid, []).extend(owner_list)

    roles_deferred = collect_roles_deferred()
    missing = [
        rid
        for rid in sorted(all_ids)
        if not all_owners.get(rid) and rid not in roles_deferred
    ]
    if missing:
        names = "\n".join(missing)
        raise SystemExit(
            "traceability: no owner_role token for the following requirement(s) "
            "(add `owner_role: <role-id>` to the traceability row, or list "
            "the id under `roles_deferred` in decisions/.spec-check-allowlist.yaml):\n"
            + names
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
    check_dec_coverage(specs)
    check_owner_role_coverage(specs)
    print(f"spec_check OK ({len(specs)} active specs)")


if __name__ == "__main__":
    main()
