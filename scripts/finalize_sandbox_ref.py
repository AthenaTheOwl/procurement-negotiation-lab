"""Post-commit finalize step for the sandbox_image_ref off-by-one fix.

Per DEC-FACTORY-010 (Option A: two-pass emit), the factory emitter
writes ``sandbox_image_ref = repo://procurement-negotiation-lab@PENDING/``
into the Run record. After the commit that contains the regenerated
sample lands, this script rewrites the placeholder to the actual
sample-containing SHA.

Usage:
    python scripts/finalize_sandbox_ref.py --run-id run-<id>
    python scripts/finalize_sandbox_ref.py --run-id run-<id> --sha <sha>

When ``--sha`` is omitted the script reads ``git rev-parse HEAD`` in
the repo root. The script is idempotent: a record that already carries
a non-PENDING URI is left untouched (exit 0 with a noop message).

Exit codes: ``0`` on success or idempotent skip, ``1`` when the run
record is missing, the SHA cannot be derived, or the record is in an
unexpected shape.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUN_RECORDS_DIR = ROOT / "ops" / "run-records"

REPO_NAME = "procurement-negotiation-lab"
PENDING_URI = f"repo://{REPO_NAME}@PENDING/"
FINAL_URI_TEMPLATE = "repo://" + REPO_NAME + "@{sha}/"

_SHA_RE = re.compile(r"^[a-f0-9]{40}$")


def _current_head_sha() -> str:
    """Return the 40-char HEAD SHA. Raises SystemExit on failure."""
    result = subprocess.run(  # noqa: S603 - git on PATH
        ["git", "-C", str(ROOT), "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
        timeout=10,
    )
    if result.returncode != 0:
        raise SystemExit(
            f"finalize_sandbox_ref: `git rev-parse HEAD` failed: "
            f"{result.stderr.strip() or 'unknown error'}"
        )
    sha = result.stdout.strip()
    if not _SHA_RE.match(sha):
        raise SystemExit(
            f"finalize_sandbox_ref: HEAD is not a 40-char SHA: {sha!r}"
        )
    return sha


def _record_path(run_id: str) -> Path:
    return RUN_RECORDS_DIR / f"{run_id}.json"


def finalize(run_id: str, sha: str | None) -> int:
    path = _record_path(run_id)
    if not path.is_file():
        print(
            f"finalize_sandbox_ref: missing Run record at "
            f"{path.relative_to(ROOT).as_posix()}",
            file=sys.stderr,
        )
        return 1
    try:
        run = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(
            f"finalize_sandbox_ref: {path.name} is not valid JSON: {exc}",
            file=sys.stderr,
        )
        return 1
    if not isinstance(run, dict):
        print(
            f"finalize_sandbox_ref: {path.name} top-level must be an object",
            file=sys.stderr,
        )
        return 1

    current = run.get("sandbox_image_ref")
    if current is None:
        print(
            f"finalize_sandbox_ref: {path.name} has no sandbox_image_ref; "
            f"nothing to rewrite"
        )
        return 0
    if current != PENDING_URI:
        # Idempotent skip: the record is already final or in some other
        # shape this script does not own. Touching it would clobber the
        # honest value the emitter wrote.
        print(
            f"finalize_sandbox_ref: {path.name} sandbox_image_ref already "
            f"finalized ({current!r}); leaving it alone"
        )
        return 0

    head = sha or _current_head_sha()
    if not _SHA_RE.match(head):
        print(
            f"finalize_sandbox_ref: --sha must be a 40-char hex SHA, "
            f"got {head!r}",
            file=sys.stderr,
        )
        return 1

    run["sandbox_image_ref"] = FINAL_URI_TEMPLATE.format(sha=head)
    path.write_text(
        json.dumps(run, sort_keys=True, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        f"finalize_sandbox_ref: rewrote {path.name} sandbox_image_ref to "
        f"{run['sandbox_image_ref']}"
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="finalize_sandbox_ref",
        description=(
            "Rewrite a Run record's sandbox_image_ref from the PENDING "
            "placeholder to the actual sample-containing commit SHA. "
            "Implements DEC-FACTORY-010 Option A (two-pass emit)."
        ),
    )
    parser.add_argument(
        "--run-id",
        required=True,
        help="Run identifier to finalize (e.g. run-16a7bf515611)",
    )
    parser.add_argument(
        "--sha",
        default=None,
        help=(
            "40-char SHA to write into sandbox_image_ref. Defaults to "
            "`git rev-parse HEAD` in the repo root."
        ),
    )
    args = parser.parse_args(argv)
    return finalize(args.run_id, args.sha)


if __name__ == "__main__":
    sys.exit(main())
