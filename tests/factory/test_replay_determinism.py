"""Replay-determinism test fixture for the canonical procurement-lab sample.

Pattern: ChatGPT pulse Agents-SDK replay determinism, translated to our
portfolio's run-evidence framing.

Covers: R-FACTORY-RUN-EVIDENCE-023, R-FACTORY-RUN-EVIDENCE-024,
R-FACTORY-RUN-EVIDENCE-025.

The fixture replays the canonical sample run RERUNS times (default 3) at
the recorded sandbox SHA and asserts that every replay produces an
identical canonicalized hash over the three replay-equivalence fields:

  - ``recomputed_prompt_snapshot_hash``
  - ``recomputed_tool_schemas_snapshot_hash``
  - ``recomputed_gate_results_summary``

The script ``scripts/replay_run.py`` records these as
``field_comparison.<field>.fresh`` on each replay report. We extract
those, canonicalize (sort lists in ``gate_results_summary``, coerce
``all_passed`` to bool), JSON-encode with ``sort_keys=True`` and
``separators=(",", ":")``, and SHA-256 hash the byte string. All RERUNS
hashes must match.

When the hashes diverge, the test writes a failure bundle to
``artifacts/failbundles/`` containing the unique hashes, the first two
diverging canonical traces, and the canonical sample identity, then
fails with the bundle path in the assertion message.

Environment notes:

- The recorded sandbox SHA must be reachable in the local git history.
  CI sets ``fetch-depth: 0`` on the initial checkout for that reason.
- The test checks out the recorded sandbox SHA, runs the replay, then
  restores the original HEAD in teardown so the working tree is left
  untouched.
- Each replay invocation writes a fresh
  ``ops/replay-records/<run-id>/<replay-event-id>.json`` plus a
  per-replay ledger at
  ``ops/event-ledger/replay-<run-id>-<ISO-timestamp>.jsonl``. The
  teardown removes any of those files that did not already exist at the
  start of the test so the working tree stays clean.

Override the replay count with the ``RERUNS`` env var (default 3).
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_RUN_ID = "run-960d6b107160"
RUN_RECORD_PATH = REPO_ROOT / "ops" / "run-records" / f"{CANONICAL_RUN_ID}.json"
REPLAY_RECORDS_DIR = REPO_ROOT / "ops" / "replay-records" / CANONICAL_RUN_ID
EVENT_LEDGER_DIR = REPO_ROOT / "ops" / "event-ledger"
FAILBUNDLE_DIR = REPO_ROOT / "artifacts" / "failbundles"
DEFAULT_RERUNS = 3

# Three replay-equivalence fields recorded under
# ``field_comparison.<field>.fresh`` in each replay report.
CANONICAL_FIELDS = (
    "prompt_snapshot_hash",
    "tool_schemas_snapshot_hash",
    "gate_results_summary",
)


# --------------------------------------------------------------------- helpers


def _git(*args: str) -> str:
    """Run a git command rooted at the repo and return stdout."""
    result = subprocess.run(  # noqa: S603 - git on PATH
        ["git", "-C", str(REPO_ROOT), *args],
        capture_output=True,
        text=True,
        check=False,
        timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} failed ({result.returncode}): "
            f"{result.stderr.strip() or result.stdout.strip()}"
        )
    return result.stdout.strip()


def _extract_sandbox_sha(run_record: dict[str, Any]) -> str:
    """Pull the 40-char hex SHA off ``sandbox_image_ref``.

    Accepts the DEC-FACTORY-010 portable URI form
    (``repo://<repo>@<sha>/<path>``) and the legacy ``<path>@<sha>``
    form. Raises ``ValueError`` on a missing or PENDING placeholder.
    """
    import re

    sandbox = run_record.get("sandbox_image_ref")
    if not isinstance(sandbox, str) or not sandbox:
        raise ValueError("Run record has no sandbox_image_ref")
    if "@PENDING" in sandbox:
        raise ValueError(
            "sandbox_image_ref is PENDING; finalize before running the determinism test"
        )
    uri_match = re.match(r"^repo://[a-z][a-z0-9-]*@(?P<sha>[a-f0-9]{40})/", sandbox)
    if uri_match:
        return uri_match.group("sha")
    # Legacy form: ``<worktree>@<sha>``.
    if "@" not in sandbox:
        raise ValueError("sandbox_image_ref has no @<sha> suffix; cannot extract SHA")
    sha = sandbox.rsplit("@", 1)[-1].strip().rstrip("/")
    if len(sha) != 40 or not all(c in "0123456789abcdef" for c in sha):
        raise ValueError(f"sandbox_image_ref suffix is not a 40-char hex SHA: {sha!r}")
    return sha


def _canonicalize_gate_results(value: Any) -> dict[str, Any]:
    """Canonicalize a ``gate_results_summary`` shape.

    Sort the ``gates_passed`` and ``gates_failed`` lists (replay order
    is implementation detail, not contract). Coerce ``all_passed`` to a
    plain bool. Drop unknown fields.
    """
    if not isinstance(value, dict):
        return {"all_passed": False, "gates_failed": [], "gates_passed": []}
    return {
        "all_passed": bool(value.get("all_passed", False)),
        "gates_failed": sorted(str(g) for g in value.get("gates_failed", []) or []),
        "gates_passed": sorted(str(g) for g in value.get("gates_passed", []) or []),
    }


def _canonicalize_replay_record(report: dict[str, Any]) -> dict[str, Any]:
    """Extract and canonicalize the three replay-equivalence fields.

    Reads ``field_comparison.<field>.fresh`` per the
    ``scripts/replay_run.py`` report format. The ``fresh`` value carries
    the recomputed hash or summary the current replay produced.
    """
    comparison = report.get("field_comparison") or {}
    prompt = comparison.get("prompt_snapshot_hash") or {}
    tools = comparison.get("tool_schemas_snapshot_hash") or {}
    gates = comparison.get("gate_results_summary") or {}
    return {
        "recomputed_prompt_snapshot_hash": prompt.get("fresh"),
        "recomputed_tool_schemas_snapshot_hash": tools.get("fresh"),
        "recomputed_gate_results_summary": _canonicalize_gate_results(gates.get("fresh")),
    }


def _hash_canonical(canonical: dict[str, Any]) -> str:
    """SHA-256 over the canonical JSON encoding."""
    encoded = json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _snapshot_existing(dir_path: Path, pattern: str) -> set[Path]:
    if not dir_path.is_dir():
        return set()
    return set(dir_path.glob(pattern))


# ---------------------------------------------------------------------- fixture


@pytest.fixture
def head_restorer():  # type: ignore[no-untyped-def]
    """Save the current HEAD; restore it after the test.

    The replay needs the recorded sandbox SHA checked out; teardown
    restores the original HEAD so the working tree returns to its
    starting state.
    """
    original_sha = _git("rev-parse", "HEAD")
    # Prefer the branch name when HEAD points at one so the restore
    # lands the worktree back on the same branch instead of a detached
    # HEAD on the same SHA.
    try:
        original_ref = _git("symbolic-ref", "--short", "HEAD")
    except RuntimeError:
        original_ref = original_sha
    try:
        yield original_sha
    finally:
        # The test overwrites ops/run-records/<canonical>.json with the
        # finalized HEAD copy after the sandbox-SHA checkout (the CI
        # workflow does the same dance). That leaves a modification
        # relative to the sandbox SHA which would block a plain
        # ``git checkout <original>``. Discard the modification first,
        # then restore HEAD.
        try:
            _git(
                "checkout",
                "--",
                RUN_RECORD_PATH.relative_to(REPO_ROOT).as_posix(),
            )
        except RuntimeError:
            pass
        _git("checkout", original_ref)


@pytest.fixture
def replay_artifact_cleaner():  # type: ignore[no-untyped-def]
    """Track replay artifacts the test creates; delete them on teardown.

    The replay command writes a fresh report under
    ``ops/replay-records/<run-id>/`` and a per-replay ledger under
    ``ops/event-ledger/``. We snapshot the pre-test contents and remove
    anything new on teardown so the working tree stays clean.
    """
    before_reports = _snapshot_existing(REPLAY_RECORDS_DIR, "*.json")
    before_ledgers = _snapshot_existing(EVENT_LEDGER_DIR, f"replay-{CANONICAL_RUN_ID}-*.jsonl")
    try:
        yield
    finally:
        after_reports = _snapshot_existing(REPLAY_RECORDS_DIR, "*.json")
        after_ledgers = _snapshot_existing(EVENT_LEDGER_DIR, f"replay-{CANONICAL_RUN_ID}-*.jsonl")
        for path in after_reports - before_reports:
            try:
                path.unlink()
            except OSError:
                pass
        for path in after_ledgers - before_ledgers:
            try:
                path.unlink()
            except OSError:
                pass


# ------------------------------------------------------------------------ test


def test_canonical_sample_replay_is_deterministic(  # type: ignore[no-untyped-def]
    head_restorer, replay_artifact_cleaner
) -> None:
    """The canonical sample replays to the same hash on every RERUN.

    Catches drift in prompts, tool schemas, or gate sets between two
    nominally-identical replay invocations. Failure writes a bundle to
    ``artifacts/failbundles/`` with the diverging traces and unique
    hashes.
    """
    if not RUN_RECORD_PATH.is_file():
        pytest.skip(f"canonical Run record missing: {RUN_RECORD_PATH}")

    rerun_count = int(os.environ.get("RERUNS", str(DEFAULT_RERUNS)))
    assert rerun_count >= 2, "RERUNS must be at least 2 to compare hashes"

    run_record = json.loads(RUN_RECORD_PATH.read_text(encoding="utf-8"))
    sandbox_sha = _extract_sandbox_sha(run_record)

    # The replay needs the recorded sandbox SHA checked out. ``git
    # checkout`` refuses when tracked files differ between HEAD and the
    # target ref. CI hits a clean tree from ``actions/checkout`` so this
    # path is silent there. Local dev with in-flight edits to the spec
    # ledger or workflow files trips the check; skip cleanly so the
    # test does not falsely report non-determinism on a dirty tree.
    dirty = _git("status", "--porcelain")
    if dirty:
        # Filter to tracked-file modifications (lines starting with " M",
        # "M ", "A ", "D ", etc.). Untracked files (lines starting with
        # "??") do not block the checkout.
        tracked_changes = [line for line in dirty.splitlines() if not line.startswith("??")]
        if tracked_changes:
            pytest.skip(
                "working tree has tracked modifications that would "
                "block `git checkout <sandbox-sha>`; clean the tree or "
                "stash changes before running the determinism fixture. "
                f"Modified entries: {tracked_changes}"
            )

    # Save the finalized Run record so the post-checkout worktree (which
    # carries the PENDING placeholder per the DEC-FACTORY-010 two-pass
    # flow) replays against the finalized SHA. The CI workflow does the
    # same dance via ``cp /tmp/run-record-finalized.json ...`` after the
    # ``git checkout``. Save the current replay harness too: older sandbox
    # commits can contain pre-portability replay code, while the replay
    # contract should exercise the recorded code state with the current
    # evidence reader.
    finalized_record_bytes = RUN_RECORD_PATH.read_bytes()
    replay_script_path = REPO_ROOT / "scripts" / "replay_run.py"
    replay_script_bytes = replay_script_path.read_bytes()
    _git("checkout", sandbox_sha)
    RUN_RECORD_PATH.write_bytes(finalized_record_bytes)
    replay_script_path.write_bytes(replay_script_bytes)

    canonical_traces: list[dict[str, Any]] = []
    canonical_hashes: list[str] = []

    for _ in range(rerun_count):
        before = _snapshot_existing(REPLAY_RECORDS_DIR, "*.json")
        proc = subprocess.run(  # noqa: S603 - args validated
            [
                sys.executable,
                "scripts/replay_run.py",
                "--run-id",
                CANONICAL_RUN_ID,
            ],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            check=False,
            timeout=300,
        )
        if proc.returncode != 0:
            pytest.fail(
                "replay_run.py exited "
                f"{proc.returncode} during determinism replay:\n"
                f"stdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
            )
        after = _snapshot_existing(REPLAY_RECORDS_DIR, "*.json")
        new_reports = sorted(after - before)
        if len(new_reports) != 1:
            pytest.fail(
                f"expected exactly one fresh replay report, got {[p.name for p in new_reports]}"
            )
        report = json.loads(new_reports[0].read_text(encoding="utf-8"))
        canonical = _canonicalize_replay_record(report)
        canonical_traces.append(canonical)
        canonical_hashes.append(_hash_canonical(canonical))

    unique_hashes = sorted(set(canonical_hashes))
    if len(unique_hashes) == 1:
        return  # deterministic; test passes.

    # Divergence. Write the failure bundle with the first two diverging
    # canonical traces + the unique hash set + the canonical sample id.
    first_idx = 0
    second_idx = next(
        i for i in range(1, len(canonical_hashes)) if canonical_hashes[i] != canonical_hashes[0]
    )
    FAILBUNDLE_DIR.mkdir(parents=True, exist_ok=True)
    trace_0_path = FAILBUNDLE_DIR / "trace_0.json"
    trace_1_path = FAILBUNDLE_DIR / "trace_1.json"
    trace_0_path.write_text(
        json.dumps(canonical_traces[first_idx], indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    trace_1_path.write_text(
        json.dumps(canonical_traces[second_idx], indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    bundle_path = FAILBUNDLE_DIR / "determinism_failure.json"
    bundle = {
        "canonical_sample_id": CANONICAL_RUN_ID,
        "sandbox_sha": sandbox_sha,
        "rerun_count": rerun_count,
        "unique_hashes": unique_hashes,
        "first_mismatch_indices": [first_idx, second_idx],
        "trace_paths": [
            trace_0_path.relative_to(REPO_ROOT).as_posix(),
            trace_1_path.relative_to(REPO_ROOT).as_posix(),
        ],
        "hashes_per_rerun": canonical_hashes,
    }
    bundle_path.write_text(json.dumps(bundle, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    pytest.fail(
        f"replay determinism check failed: {len(unique_hashes)} unique "
        f"hashes across {rerun_count} reruns of {CANONICAL_RUN_ID}. "
        f"Failure bundle at {bundle_path.relative_to(REPO_ROOT).as_posix()}; "
        f"diverging traces at {trace_0_path.name} and {trace_1_path.name}."
    )
