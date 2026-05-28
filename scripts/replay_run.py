"""Replay a recorded factory run and assert equivalence.

Usage:
    python scripts/replay_run.py --run-id run-<id>

The factory pipeline runs in dry-run mode with stub workers (deterministic).
The replay framing is "equivalence" rather than "deterministic" because real
(non-stub) workers would call live LLMs whose outputs vary; the SHAPE of the
pipeline is an LLM pipeline even when the stubs return canned text.

The script:

1. Loads ``ops/run-records/<run-id>.json`` and the matching ledger at
   ``ops/event-ledger/<run-id>.jsonl``. Fails loudly when either is missing.
2. Extracts the recorded git SHA from the Run record's
   ``sandbox_image_ref`` (format ``<worktree>@<sha>``) and verifies the
   current HEAD matches. On mismatch, exits 1 with the
   ``git checkout <sha>`` command the caller needs to run first.
3. Re-runs the factory entry against the recorded task path
   (``Run.inputs[].ref`` with ``kind == "task"``) under ``--dry-run`` so the
   replay is offline and deterministic. Pipeline writes the fresh
   ledger and Run record into a tmp directory so the committed evidence
   directories stay untouched.
4. Compares three hashes between the recorded Run and the fresh Run:
   ``prompt_snapshot_hash``, ``tool_schemas_snapshot_hash``, and
   ``gate_results_summary``. All three should match if HEAD, inputs, and
   the emitter are identical. ``replay_equivalent`` is True iff all three
   match.
5. Appends a ``run.evidence.replayed`` event to a new per-replay ledger at
   ``ops/event-ledger/replay-<run-id>-<ISO-timestamp>.jsonl`` and writes a
   detailed comparison report at
   ``ops/replay-records/<run-id>/<replay-event-id>.json``.
6. Prints a one-line summary. Exit 0 on equivalent, 1 on divergence.

Exit codes:
    0 - replay equivalent (all three fields match)
    1 - any failure: missing inputs, HEAD mismatch, replay process error,
        or field divergence

The replay event's ``replay_method`` is ``"equivalence"`` per DEC-FACTORY-009.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RUN_RECORDS_DIR = ROOT / "ops" / "run-records"
EVENT_LEDGER_DIR = ROOT / "ops" / "event-ledger"
REPLAY_RECORDS_DIR = ROOT / "ops" / "replay-records"

# Replay framing per DEC-FACTORY-009: factory dry-run is deterministic with
# stub workers, but the pipeline shape is "an LLM pipeline" so the canonical
# framing is equivalence rather than bit-deterministic replay.
REPLAY_METHOD = "equivalence"

# Fields cross-checked between the recorded Run and the fresh replay Run.
# The three together cover: input identity (prompt hash), tool surface
# identity (tool_schemas hash), and gate outcome identity (gate_results
# summary). Any divergence in any of the three breaks equivalence.
COMPARED_FIELDS = (
    "prompt_snapshot_hash",
    "tool_schemas_snapshot_hash",
    "gate_results_summary",
)


# ----------------------------------------------------------------- IO helpers


def _now_iso() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _now_iso_filename() -> str:
    """ISO timestamp safe for use in a filename (no colons)."""
    return datetime.now(UTC).strftime("%Y-%m-%dT%H-%M-%SZ")


def _safe_rel(path: Path) -> str:
    """Return ``path`` relative to ROOT when possible, else the absolute form."""
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def _load_run_record(run_id: str) -> dict[str, Any]:
    path = RUN_RECORDS_DIR / f"{run_id}.json"
    if not path.is_file():
        raise SystemExit(
            f"replay_run: missing Run record at {_safe_rel(path)}"
        )
    return json.loads(path.read_text(encoding="utf-8"))


def _load_ledger(run_id: str) -> list[dict[str, Any]]:
    path = EVENT_LEDGER_DIR / f"{run_id}.jsonl"
    if not path.is_file():
        raise SystemExit(
            f"replay_run: missing event ledger at {_safe_rel(path)}"
        )
    events: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        events.append(json.loads(stripped))
    return events


# ----------------------------------------------------------------- HEAD verify


def _extract_recorded_sha(run: dict[str, Any]) -> str:
    """Pull the SHA suffix off ``sandbox_image_ref``.

    The factory format is ``<worktree-path>@<sha>``; missing or malformed
    refs are a hard error because the script cannot verify HEAD identity
    without one.
    """
    sandbox = run.get("sandbox_image_ref")
    if not isinstance(sandbox, str) or "@" not in sandbox:
        raise SystemExit(
            "replay_run: Run record has no sandbox_image_ref "
            "in <worktree>@<sha> form; cannot verify HEAD"
        )
    sha = sandbox.rsplit("@", 1)[-1].strip()
    if not sha:
        raise SystemExit(
            "replay_run: sandbox_image_ref carries an empty SHA suffix"
        )
    return sha


def _current_head_sha() -> str:
    result = subprocess.run(  # noqa: S603 - git lookup on PATH
        ["git", "-C", str(ROOT), "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
        check=False,
        timeout=10,
    )
    if result.returncode != 0:
        raise SystemExit(
            f"replay_run: `git rev-parse HEAD` failed: "
            f"{result.stderr.strip() or 'unknown error'}"
        )
    return result.stdout.strip()


def _verify_head(recorded_sha: str) -> None:
    head_sha = _current_head_sha()
    if head_sha == recorded_sha:
        return
    raise SystemExit(
        "replay_run: HEAD does not match the recorded sandbox SHA.\n"
        f"  recorded: {recorded_sha}\n"
        f"  HEAD:     {head_sha}\n"
        f"Run `git checkout {recorded_sha}` (or check out a worktree at "
        f"that SHA) before re-running this replay."
    )


# ----------------------------------------------------------------- task lookup


def _extract_recorded_task_path(run: dict[str, Any]) -> str:
    """Pull the task YAML path off ``Run.inputs[]``."""
    inputs = run.get("inputs")
    if not isinstance(inputs, list):
        raise SystemExit("replay_run: Run.inputs is missing or not a list")
    for entry in inputs:
        if isinstance(entry, dict) and entry.get("kind") == "task":
            ref = entry.get("ref")
            if isinstance(ref, str) and ref:
                return ref
    raise SystemExit(
        "replay_run: Run.inputs contains no entry with kind == 'task'"
    )


# ----------------------------------------------------------------- factory replay


def _run_factory_dry_run(
    task_path: str, fresh_event_dir: Path, fresh_record_dir: Path
) -> subprocess.CompletedProcess[str]:
    """Invoke the factory CLI under --dry-run with redirected evidence dirs.

    The fresh ledger and Run record land in tmp directories so the
    committed evidence under ``ops/event-ledger/`` and ``ops/run-records/``
    stays clean. The pipeline reads its target dirs from module-level
    constants in ``scripts.factory.pipeline``; the subprocess overrides
    them via ``PROCUREMENT_LAB_REPLAY_EVENT_DIR`` and
    ``PROCUREMENT_LAB_REPLAY_RECORD_DIR`` env vars consumed by a small
    bootstrap stub.
    """
    fresh_event_dir.mkdir(parents=True, exist_ok=True)
    fresh_record_dir.mkdir(parents=True, exist_ok=True)
    bootstrap = (
        "import os, runpy\n"
        "from pathlib import Path\n"
        "import scripts.factory.pipeline as p\n"
        "p.EVENT_LEDGER_DIR = Path(os.environ['PROCUREMENT_LAB_REPLAY_EVENT_DIR'])\n"
        "p.RUN_RECORDS_DIR = Path(os.environ['PROCUREMENT_LAB_REPLAY_RECORD_DIR'])\n"
        "runpy.run_module('scripts.factory.run', run_name='__main__')\n"
    )
    env = {
        **_os_environ_copy(),
        "PROCUREMENT_LAB_REPLAY_EVENT_DIR": str(fresh_event_dir),
        "PROCUREMENT_LAB_REPLAY_RECORD_DIR": str(fresh_record_dir),
    }
    # Drop --task into a fresh DB so the SQLite state file does not race
    # with concurrent factory invocations.
    fresh_db = fresh_record_dir.parent / "factory-replay.db"
    argv = [
        sys.executable,
        "-c",
        bootstrap,
        "--task",
        task_path,
        "--dry-run",
        "--db",
        str(fresh_db),
    ]
    return subprocess.run(  # noqa: S603 - args constructed from validated inputs
        argv,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=False,
        timeout=300,
        env=env,
    )


def _os_environ_copy() -> dict[str, str]:
    """Return a copy of os.environ with PYTHONPATH set for the replay subprocess.

    The spawned interpreter must import two things that are not always on
    sys.path in a fresh shell: ``scripts.factory.pipeline`` (repo root) and
    ``procurement_lab`` (``src/`` layout). Prepending both to PYTHONPATH
    makes the bootstrap stub work without requiring an editable install.
    """
    import os

    env = dict(os.environ)
    repo_str = str(ROOT)
    src_str = str(ROOT / "src")
    prefix = repo_str + os.pathsep + src_str
    existing = env.get("PYTHONPATH", "")
    if existing:
        env["PYTHONPATH"] = prefix + os.pathsep + existing
    else:
        env["PYTHONPATH"] = prefix
    return env


def _collect_fresh_run(fresh_record_dir: Path) -> dict[str, Any]:
    """Read the one fresh Run record the replay invocation produced."""
    files = sorted(fresh_record_dir.glob("*.json"))
    if not files:
        raise SystemExit(
            f"replay_run: factory replay produced no Run record under "
            f"{fresh_record_dir}"
        )
    if len(files) > 1:
        # The replay runs exactly one task; multiple records implies an
        # unexpected concurrent write. Surface it loudly.
        raise SystemExit(
            f"replay_run: expected exactly one fresh Run record under "
            f"{fresh_record_dir}, found {len(files)}"
        )
    return json.loads(files[0].read_text(encoding="utf-8"))


# ----------------------------------------------------------------- comparison


def _compare(
    recorded: dict[str, Any], fresh: dict[str, Any]
) -> tuple[bool, dict[str, dict[str, Any]]]:
    """Compare the three replay-equivalence fields.

    Returns ``(equivalent, per_field_detail)``. ``per_field_detail`` maps
    each field name to ``{recorded, fresh, equal}`` so the replay report
    has full diff context for downstream readers.
    """
    detail: dict[str, dict[str, Any]] = {}
    equivalent = True
    for field in COMPARED_FIELDS:
        recorded_value = recorded.get(field)
        fresh_value = fresh.get(field)
        equal = recorded_value == fresh_value
        if not equal:
            equivalent = False
        detail[field] = {
            "recorded": recorded_value,
            "fresh": fresh_value,
            "equal": equal,
        }
    return equivalent, detail


# ----------------------------------------------------------------- replay artifacts


def _write_replay_event(
    *,
    event_id: str,
    run_id: str,
    replay_equivalent: bool,
    packet_ref: str,
    ledger_path: Path,
) -> dict[str, Any]:
    """Append a ``run.evidence.replayed`` event to the per-replay ledger.

    The event payload follows the typed schema added in Round 2:
    required ``run_id``, ``packet_ref``, ``replay_equivalent``; optional
    ``replay_method`` (we always populate it as ``"equivalence"`` per the
    DEC-FACTORY-009 framing). The ``event_id`` is the caller's choice so the
    same id can be reused as the replay report's filename.
    """
    event = {
        "event_id": event_id,
        "type": "run.evidence.replayed",
        "created_at": _now_iso(),
        "actor": {"kind": "system", "id": "procurement-lab-factory-replay"},
        "payload": {
            "run_id": run_id,
            "packet_ref": packet_ref,
            "replay_equivalent": replay_equivalent,
            "replay_method": REPLAY_METHOD,
        },
        "run_id": run_id,
    }
    ledger_path.parent.mkdir(parents=True, exist_ok=True)
    with ledger_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, sort_keys=True, ensure_ascii=False))
        handle.write("\n")
    return event


def _write_replay_report(
    *,
    run_id: str,
    event_id: str,
    replay_equivalent: bool,
    detail: dict[str, dict[str, Any]],
    recorded_sha: str,
    head_sha: str,
    task_path: str,
    recorded_run: dict[str, Any],
    fresh_run: dict[str, Any],
    started_at: str,
    finished_at: str,
) -> Path:
    """Write the full replay comparison report.

    Filename uses the replay event_id so multiple replays of the same
    run-id never collide.
    """
    out_dir = REPLAY_RECORDS_DIR / run_id
    out_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "schema_version": 1,
        "run_id": run_id,
        "replay_event_id": event_id,
        "replay_method": REPLAY_METHOD,
        "replay_equivalent": replay_equivalent,
        "started_at": started_at,
        "finished_at": finished_at,
        "head_sha": head_sha,
        "recorded_sha": recorded_sha,
        "task_path": task_path,
        "compared_fields": list(COMPARED_FIELDS),
        "field_comparison": detail,
        "recorded_run_summary": {
            "id": recorded_run.get("id"),
            "status": recorded_run.get("status"),
            "started_at": recorded_run.get("started_at"),
            "finished_at": recorded_run.get("finished_at"),
            "sandbox_image_ref": recorded_run.get("sandbox_image_ref"),
        },
        "fresh_run_summary": {
            "id": fresh_run.get("id"),
            "status": fresh_run.get("status"),
            "started_at": fresh_run.get("started_at"),
            "finished_at": fresh_run.get("finished_at"),
            "sandbox_image_ref": fresh_run.get("sandbox_image_ref"),
        },
    }
    path = out_dir / f"{event_id}.json"
    path.write_text(
        json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return path


# ----------------------------------------------------------------- main


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="replay_run",
        description="Replay a recorded factory run and assert equivalence.",
    )
    parser.add_argument(
        "--run-id",
        required=True,
        help="Run identifier to replay (e.g. run-16a7bf515611)",
    )
    parser.add_argument(
        "--scratch-dir",
        type=Path,
        default=None,
        help=(
            "Temporary directory for fresh Run/ledger output. Defaults to a "
            "system tmpdir. Pass an explicit path for debug runs."
        ),
    )
    args = parser.parse_args(argv)

    run_id = args.run_id
    started_at = _now_iso()
    recorded_run = _load_run_record(run_id)
    # The ledger is loaded to confirm presence; the replay does not need
    # the events themselves, but the validator's terminal-event rule means
    # any recorded done run must carry a matching ledger.
    _load_ledger(run_id)

    recorded_sha = _extract_recorded_sha(recorded_run)
    _verify_head(recorded_sha)
    head_sha = _current_head_sha()  # equal to recorded_sha after _verify_head

    task_path = _extract_recorded_task_path(recorded_run)

    # Scratch directory for the fresh replay output. Default uses a
    # tempfile.TemporaryDirectory so it cleans up; the explicit override
    # leaves the artifacts on disk for debugging.
    import tempfile

    scratch_ctx: Any
    if args.scratch_dir is not None:
        args.scratch_dir.mkdir(parents=True, exist_ok=True)
        scratch_path = args.scratch_dir
        scratch_ctx = None
    else:
        scratch_ctx = tempfile.TemporaryDirectory(prefix="replay-run-")
        scratch_path = Path(scratch_ctx.name)

    try:
        fresh_event_dir = scratch_path / "event-ledger"
        fresh_record_dir = scratch_path / "run-records"
        proc = _run_factory_dry_run(task_path, fresh_event_dir, fresh_record_dir)
        if proc.returncode != 0:
            sys.stderr.write(proc.stdout)
            sys.stderr.write(proc.stderr)
            raise SystemExit(
                f"replay_run: factory dry-run exited "
                f"{proc.returncode}; see stdout/stderr above"
            )
        fresh_run = _collect_fresh_run(fresh_record_dir)
    finally:
        if scratch_ctx is not None:
            scratch_ctx.cleanup()

    replay_equivalent, detail = _compare(recorded_run, fresh_run)
    finished_at = _now_iso()

    replay_ledger_path = (
        EVENT_LEDGER_DIR / f"replay-{run_id}-{_now_iso_filename()}.jsonl"
    )
    # packet_ref points at the report we are about to write. The event
    # holds the run_id + the packet_ref so a downstream consumer can pick
    # up the report file by its event_id and replay_records/<run_id>/.
    replay_event_id = str(uuid.uuid4())
    packet_ref = _safe_rel(
        REPLAY_RECORDS_DIR / run_id / f"{replay_event_id}.json"
    )
    _write_replay_event(
        event_id=replay_event_id,
        run_id=run_id,
        replay_equivalent=replay_equivalent,
        packet_ref=packet_ref,
        ledger_path=replay_ledger_path,
    )

    report_path = _write_replay_report(
        run_id=run_id,
        event_id=replay_event_id,
        replay_equivalent=replay_equivalent,
        detail=detail,
        recorded_sha=recorded_sha,
        head_sha=head_sha,
        task_path=task_path,
        recorded_run=recorded_run,
        fresh_run=fresh_run,
        started_at=started_at,
        finished_at=finished_at,
    )

    summary_marker = "EQUIVALENT" if replay_equivalent else "DIVERGENT"
    diverging = [
        field for field, info in detail.items() if not info["equal"]
    ]
    print(
        f"replay_run: {summary_marker} run_id={run_id} "
        f"method={REPLAY_METHOD} "
        f"ledger={_safe_rel(replay_ledger_path)} "
        f"report={_safe_rel(report_path)}"
    )
    if diverging:
        print(
            "replay_run: diverging fields: " + ", ".join(diverging),
            file=sys.stderr,
        )
    return 0 if replay_equivalent else 1


if __name__ == "__main__":
    sys.exit(main())
