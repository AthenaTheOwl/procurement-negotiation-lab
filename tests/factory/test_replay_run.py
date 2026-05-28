"""Tests for scripts/replay_run.py.

The replay script reads the committed Run record + ledger under
``ops/run-records/`` and ``ops/event-ledger/``, verifies HEAD matches the
recorded sandbox SHA, re-runs the factory pipeline in dry-run mode under a
tmp scratch directory, and compares three replay-equivalence fields.

Tests follow the same module-reload + path-redirect pattern that
``test_validate_run_evidence.py`` uses so the script's hard-coded
``ops/`` directories can point at fixture data for the duration of one
test.
"""

from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_PATH = REPO_ROOT / "scripts"


@pytest.fixture
def replay_module(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):  # type: ignore[no-untyped-def]
    """Import scripts/replay_run.py with redirected ops directories."""
    sys.path.insert(0, str(SCRIPTS_PATH))
    try:
        module = importlib.import_module("replay_run")
        module = importlib.reload(module)
    finally:
        sys.path.remove(str(SCRIPTS_PATH))
    event_dir = tmp_path / "event-ledger"
    record_dir = tmp_path / "run-records"
    replay_dir = tmp_path / "replay-records"
    event_dir.mkdir()
    record_dir.mkdir()
    replay_dir.mkdir()
    monkeypatch.setattr(module, "EVENT_LEDGER_DIR", event_dir)
    monkeypatch.setattr(module, "RUN_RECORDS_DIR", record_dir)
    monkeypatch.setattr(module, "REPLAY_RECORDS_DIR", replay_dir)
    return module, event_dir, record_dir, replay_dir


def _read_committed_run() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Load the committed sample run + ledger from the live repo paths."""
    run_path = REPO_ROOT / "ops" / "run-records" / "run-16a7bf515611.json"
    ledger_path = REPO_ROOT / "ops" / "event-ledger" / "run-16a7bf515611.jsonl"
    run = json.loads(run_path.read_text(encoding="utf-8"))
    events: list[dict[str, Any]] = []
    for line in ledger_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            events.append(json.loads(line))
    return run, events


def _stage_fixture(
    event_dir: Path,
    record_dir: Path,
    run: dict[str, Any],
    events: list[dict[str, Any]],
) -> None:
    """Write run + ledger to the redirected fixture directories."""
    run_id = run["id"]
    (record_dir / f"{run_id}.json").write_text(
        json.dumps(run, indent=2) + "\n", encoding="utf-8"
    )
    with (event_dir / f"{run_id}.jsonl").open("w", encoding="utf-8") as handle:
        for event in events:
            handle.write(json.dumps(event, sort_keys=True))
            handle.write("\n")


def _current_head_sha() -> str:
    import subprocess

    return subprocess.check_output(
        ["git", "-C", str(REPO_ROOT), "rev-parse", "HEAD"],
        text=True,
    ).strip()


def _retarget_sandbox_sha(run: dict[str, Any], sha: str) -> dict[str, Any]:
    """Return a copy of ``run`` with sandbox_image_ref rewritten to ``sha``.

    Lets the positive test exercise the HEAD-strict gate without requiring
    the suite to be run at the exact commit the committed sample was
    produced from.
    """
    sandbox = run.get("sandbox_image_ref")
    if not isinstance(sandbox, str) or "@" not in sandbox:
        raise AssertionError(
            "fixture run record must have a sandbox_image_ref in "
            "<worktree>@<sha> form"
        )
    prefix = sandbox.split("@", 1)[0]
    fresh = dict(run)
    fresh["sandbox_image_ref"] = f"{prefix}@{sha}"
    return fresh


# ------------------------------------------------------------------ positive


def test_replay_equivalent_for_committed_sample(replay_module) -> None:  # type: ignore[no-untyped-def]
    """Replay against a fixture pinned to current HEAD reports equivalent.

    The committed sample's sandbox_image_ref carries the SHA the run was
    produced at; this test rewrites that SHA to the current HEAD so the
    HEAD-strict gate passes and the equivalence check runs end-to-end.
    """
    module, event_dir, record_dir, replay_dir = replay_module
    run, events = _read_committed_run()
    run = _retarget_sandbox_sha(run, _current_head_sha())
    _stage_fixture(event_dir, record_dir, run, events)

    exit_code = module.main(["--run-id", run["id"]])
    assert exit_code == 0

    # The replay event landed in the redirected ledger dir.
    replay_ledger = sorted(event_dir.glob(f"replay-{run['id']}-*.jsonl"))
    assert len(replay_ledger) == 1, (
        f"expected one replay ledger, got: {[p.name for p in replay_ledger]}"
    )
    event = json.loads(replay_ledger[0].read_text(encoding="utf-8").splitlines()[0])
    assert event["type"] == "run.evidence.replayed"
    assert event["payload"]["replay_equivalent"] is True
    assert event["payload"]["replay_method"] == "equivalence"
    assert event["payload"]["run_id"] == run["id"]

    # The detailed report landed in replay-records/<run-id>/.
    reports = sorted((replay_dir / run["id"]).glob("*.json"))
    assert len(reports) == 1
    report = json.loads(reports[0].read_text(encoding="utf-8"))
    assert report["replay_equivalent"] is True
    assert report["replay_method"] == "equivalence"
    assert set(report["field_comparison"].keys()) == {
        "prompt_snapshot_hash",
        "tool_schemas_snapshot_hash",
        "gate_results_summary",
    }
    for info in report["field_comparison"].values():
        assert info["equal"] is True


# ------------------------------------------------------------------ HEAD mismatch


def test_replay_exits_1_on_head_mismatch(replay_module, capsys) -> None:  # type: ignore[no-untyped-def]
    module, event_dir, record_dir, _ = replay_module
    run, events = _read_committed_run()
    # Force a deliberate mismatch by setting sandbox SHA to a non-HEAD value.
    run = _retarget_sandbox_sha(run, "0" * 40)
    _stage_fixture(event_dir, record_dir, run, events)

    with pytest.raises(SystemExit) as excinfo:
        module.main(["--run-id", run["id"]])
    assert excinfo.value.code != 0
    # The error message is in the SystemExit value (raised via raise SystemExit(msg)).
    message = str(excinfo.value)
    assert "HEAD does not match" in message
    assert "git checkout" in message
    assert "0000000000000000000000000000000000000000" in message


# ------------------------------------------------------------------ missing record


def test_replay_exits_1_on_missing_run_record(replay_module) -> None:  # type: ignore[no-untyped-def]
    module, _, _, _ = replay_module
    with pytest.raises(SystemExit) as excinfo:
        module.main(["--run-id", "run-doesnotexist"])
    assert excinfo.value.code != 0
    assert "missing Run record" in str(excinfo.value)


def test_replay_exits_1_on_missing_ledger(replay_module) -> None:  # type: ignore[no-untyped-def]
    """Run record present but no matching ledger file -> hard error."""
    module, _, record_dir, _ = replay_module
    run, _ = _read_committed_run()
    # Write only the Run record; omit the ledger.
    (record_dir / f"{run['id']}.json").write_text(
        json.dumps(run, indent=2) + "\n", encoding="utf-8"
    )
    with pytest.raises(SystemExit) as excinfo:
        module.main(["--run-id", run["id"]])
    assert excinfo.value.code != 0
    assert "missing event ledger" in str(excinfo.value)


# ------------------------------------------------------------------ divergence


def test_replay_detects_divergence_when_task_mutated(  # type: ignore[no-untyped-def]
    replay_module,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Mutate the task YAML body so the fresh run produces a different hash.

    The replay script reads the recorded task path off Run.inputs[]. We point
    that field at a tmp YAML whose goal text differs from the committed task,
    then replay against a fixture whose recorded prompt_snapshot_hash still
    matches the committed task's hash. Divergence on prompt_snapshot_hash
    forces replay_equivalent to False and the script to exit 1.
    """
    module, event_dir, record_dir, replay_dir = replay_module
    run, events = _read_committed_run()
    run = _retarget_sandbox_sha(run, _current_head_sha())

    # Synthesize a mutated task YAML with a different goal body.
    mutated_task = tmp_path / "mutated-task.yaml"
    mutated_task.write_text(
        "id: mutated-replay\n"
        'title: "mutated task for replay divergence"\n'
        f"target_repo: {REPO_ROOT.as_posix()}\n"
        "base_branch: main\n"
        "goal: |\n"
        "  This goal differs from the committed sample so the fresh\n"
        "  prompt_snapshot_hash will not match.\n"
        "risk: low\n"
        "gates:\n"
        '  - cmd: python -c "exit(0)"\n'
        "    name: noop\n"
        "review:\n"
        "  reviewer: stub\n"
        "  max_patch_rounds: 1\n"
        "pr:\n"
        "  open: false\n"
        "planner: stub\n"
        "implementer: stub\n",
        encoding="utf-8",
    )
    # Rewrite Run.inputs to point at the mutated task; keep the recorded
    # hashes pointing at the original goal. Comparison will diverge.
    run["inputs"] = [{"kind": "task", "ref": str(mutated_task)}]
    _stage_fixture(event_dir, record_dir, run, events)

    exit_code = module.main(["--run-id", run["id"]])
    assert exit_code == 1

    # The replay event records the divergence.
    replay_ledger = sorted(event_dir.glob(f"replay-{run['id']}-*.jsonl"))
    assert len(replay_ledger) == 1
    event = json.loads(replay_ledger[0].read_text(encoding="utf-8").splitlines()[0])
    assert event["payload"]["replay_equivalent"] is False

    reports = sorted((replay_dir / run["id"]).glob("*.json"))
    assert len(reports) == 1
    report = json.loads(reports[0].read_text(encoding="utf-8"))
    assert report["replay_equivalent"] is False
    # prompt_snapshot_hash must be the diverging field.
    assert report["field_comparison"]["prompt_snapshot_hash"]["equal"] is False
