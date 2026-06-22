#!/usr/bin/env python3
"""Durability check: run each active-MVP repo's advertised first_user_action.

The active-MVP contract (R-FAM-V1-006) promises that every active repo ships a
`first_user_action` command that exits 0 on a fresh clone with no extra args.
The in-pipeline contract gates check that files EXIST; they do not RUN the
command. This script closes that gap: it runs the literal first action against
the real merged repo and reports pass/fail.

Usage:
    python scripts/validate_first_actions.py            # all known active repos
    python scripts/validate_first_actions.py grid-silicon brief-calibration

Each repo's first action is `python -m <package> validate`, where <package> is
the importable form of the repo's pyproject `name`. The runner does a one-time
`uv sync` per repo (cached), then runs the bare command.

Exit 0 iff every checked repo's first action exits 0. Non-zero otherwise, with a
per-repo report.
"""

from __future__ import annotations

import subprocess
import sys
import tomllib
from pathlib import Path

PORTFOLIO_ROOT = Path(r"e:/claude_code/random-apps")

# Active-MVP repos with a python package + a `python -m <pkg> validate` first
# action. Special-shape repos that don't expose `validate` are listed with an
# explicit command override.
ACTIVE_REPOS: dict[str, str | None] = {
    # pilot
    "source-decay-ledger": None,
    "grid-silicon": None,
    # spec 0019 pilots
    "binding-constraint": None,
    "brief-calibration": None,
    # batch 3
    "earnings-pillar-diff": None,
    "thesis-pillar-tracker": None,
    "pattern-index": None,
    "modelswap-replay": None,
    "capital-build-reconciler": None,
    # batch 4 claude
    "repo-triage": None,
    "portfolio-manifest": None,
    "procurement-pattern-library": None,
    "pre-mortem-ledger": None,
    "portfolio-thesis-plane": None,
    # batch 5 claude
    "review-queue": None,
    "brief-matrix": None,
    "dream-replay-cli": None,
    "oulipo-memory-deck": None,
    "trace-ledger-spec": None,
    # batch 5 codex
    "interconnect-alpha": None,
    "trace-to-eval-cli": None,
    "power-ppa-forge": None,
    "robust-siting-lab": None,
    # mtpsi: pyproject name resolves to the package; validate has no args
    "multitier-psi": "python -m mtpsi validate",
    "facility-war": None,
}


def _package_name(repo: Path) -> str | None:
    pyproject = repo / "pyproject.toml"
    if not pyproject.is_file():
        return None
    data = tomllib.loads(pyproject.read_text(encoding="utf-8"))
    name = data.get("project", {}).get("name")
    if not name:
        return None
    return name.replace("-", "_")


def _run(cmd: list[str], cwd: Path, timeout: int = 180) -> tuple[int, str]:
    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            stdin=subprocess.DEVNULL,
        )
    except subprocess.TimeoutExpired:
        return 124, f"timeout after {timeout}s"
    except FileNotFoundError as exc:
        return 127, f"binary not found: {exc}"
    tail = (result.stdout + result.stderr).strip().splitlines()
    return result.returncode, "\n".join(tail[-3:])


def check_repo(slug: str, override: str | None) -> tuple[bool, str]:
    repo = PORTFOLIO_ROOT / slug
    if not repo.is_dir():
        return False, f"{slug}: directory not found"
    pkg = _package_name(repo)
    if pkg is None:
        return False, f"{slug}: no pyproject package name"
    # one-time sync (idempotent, cached)
    sync_code, sync_tail = _run(["python", "-m", "uv", "sync"], repo, timeout=240)
    if sync_code != 0:
        return False, f"{slug}: uv sync failed ({sync_code}): {sync_tail}"
    if override:
        cmd = ["python", "-m", "uv", "run", *override.split()]
    else:
        cmd = ["python", "-m", "uv", "run", "python", "-m", pkg, "validate"]
    code, tail = _run(cmd, repo)
    if code == 0:
        return True, f"{slug}: OK (`{' '.join(cmd[3:])}`)"
    return False, f"{slug}: exit {code} — {tail}"


def main(argv: list[str]) -> int:
    targets = argv if argv else list(ACTIVE_REPOS)
    passed: list[str] = []
    failed: list[str] = []
    for slug in targets:
        override = ACTIVE_REPOS.get(slug)
        ok, report = check_repo(slug, override)
        print(("  PASS " if ok else "  FAIL ") + report)
        (passed if ok else failed).append(slug)
    print()
    print(f"first-action durability: {len(passed)} pass, {len(failed)} fail")
    if failed:
        print("failed: " + ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
