"""Unit tests for the run-evidence emitter helpers.

These tests cover the emitter module in isolation. The pipeline-level
integration test that exercises ``emit_event`` + ``emit_run`` end-to-end
lives in ``test_pipeline.py``.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from procurement_lab.run_evidence import (
    aggregate_gate_results,
    build_run_evidence_fields,
    canonicalize_prompt,
    canonicalize_tool_surface,
    compute_sha256,
    derive_sandbox_image_ref,
    emit_event,
    emit_run,
    make_event,
)


def test_canonicalize_prompt_is_stable_across_calls() -> None:
    a = canonicalize_prompt("hello", "be terse")
    b = canonicalize_prompt("hello", "be terse")
    assert a == b


def test_canonicalize_prompt_without_system_prompt() -> None:
    body = canonicalize_prompt("hello")
    parsed = json.loads(body)
    assert parsed == {"prompt": "hello"}


def test_canonicalize_prompt_distinguishes_inputs() -> None:
    a = canonicalize_prompt("one", "x")
    b = canonicalize_prompt("two", "x")
    assert a != b


def test_canonicalize_tool_surface_is_order_insensitive() -> None:
    a = canonicalize_tool_surface(
        ["claude_code", "codex", "stub"], ["pytest", "voice_lint"]
    )
    b = canonicalize_tool_surface(
        ["stub", "codex", "claude_code"], ["voice_lint", "pytest"]
    )
    assert a == b


def test_canonicalize_tool_surface_dedupes() -> None:
    a = canonicalize_tool_surface(["codex", "codex"], ["pytest"])
    b = canonicalize_tool_surface(["codex"], ["pytest"])
    assert a == b


def test_compute_sha256_returns_64_lowercase_hex() -> None:
    digest = compute_sha256("anything")
    assert re.match(r"^[a-f0-9]{64}$", digest)


def test_compute_sha256_matches_known_vector() -> None:
    # SHA-256("") is the empty-string vector; useful as a sanity check.
    assert compute_sha256("") == (
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    )


def test_emit_event_writes_valid_jsonl(tmp_path: Path) -> None:
    ledger = tmp_path / "run-abc.jsonl"
    event = make_event(
        event_type="tool.call.started",
        actor_kind="role",
        actor_id="engineering.implementation",
        payload={"tool_name": "claude_code", "args": {"step": "plan"}},
        run_id="run-abc",
    )
    emit_event(event, ledger)
    text = ledger.read_text(encoding="utf-8")
    assert text.endswith("\n")
    parsed = json.loads(text.splitlines()[0])
    assert parsed["type"] == "tool.call.started"
    assert parsed["payload"]["tool_name"] == "claude_code"
    assert parsed["run_id"] == "run-abc"


def test_emit_event_appends_a_second_line(tmp_path: Path) -> None:
    ledger = tmp_path / "run-abc.jsonl"
    a = make_event(
        event_type="tool.call.started",
        actor_kind="role",
        actor_id="engineering.implementation",
        payload={"tool_name": "claude_code", "args": {"step": "plan"}},
        run_id="run-abc",
    )
    b = make_event(
        event_type="tool.call.completed",
        actor_kind="role",
        actor_id="engineering.implementation",
        payload={"tool_name": "claude_code", "duration_ms": 12},
        run_id="run-abc",
        parent_event_id=a["event_id"],
    )
    emit_event(a, ledger)
    emit_event(b, ledger)
    lines = ledger.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2
    assert json.loads(lines[1])["parent_event_id"] == a["event_id"]


def test_emit_event_rejects_invalid_event(tmp_path: Path) -> None:
    ledger = tmp_path / "run-bad.jsonl"
    bad = {
        # missing event_id, created_at, actor, payload
        "type": "tool.call.started",
    }
    with pytest.raises(ValueError):
        emit_event(bad, ledger)
    assert not ledger.exists()


def test_emit_run_writes_valid_record_with_replay_fields(tmp_path: Path) -> None:
    record_path = tmp_path / "run-xyz.json"
    run = {
        "id": "run-xyz",
        "spec_id": "specs/0009-factory-dev-control-plane/",
        "agent_id": "procurement-lab-factory@stub",
        "runtime": "procurement-lab-factory",
        "workspace_id": "worktree-xyz",
        "started_at": "2026-05-27T20:00:00Z",
        "finished_at": "2026-05-27T20:01:00Z",
        "status": "done",
        "inputs": [{"kind": "task", "ref": "ops/factory-tasks/example.yaml"}],
        "outputs": [],
        "prompt_snapshot_hash": compute_sha256("anything"),
        "tool_schemas_snapshot_hash": compute_sha256("toolset"),
        "sandbox_image_ref": "worktree-xyz@deadbeefcafe",
        "gate_results_summary": {
            "gates_passed": ["pytest-smoke"],
            "gates_failed": [],
            "all_passed": True,
        },
    }
    emit_run(run, record_path)
    parsed = json.loads(record_path.read_text(encoding="utf-8"))
    assert parsed["id"] == "run-xyz"
    assert re.match(r"^[a-f0-9]{64}$", parsed["prompt_snapshot_hash"])
    assert parsed["gate_results_summary"]["all_passed"] is True


def test_emit_run_rejects_invalid_record(tmp_path: Path) -> None:
    record_path = tmp_path / "run-bad.json"
    bad_run = {
        # missing required fields: spec_id, agent_id, runtime, workspace_id,
        # started_at, status.
        "id": "run-bad",
    }
    with pytest.raises(ValueError):
        emit_run(bad_run, record_path)
    assert not record_path.exists()


def test_aggregate_gate_results_returns_none_when_no_gate_events() -> None:
    assert aggregate_gate_results([]) is None
    other_event = make_event(
        event_type="tool.call.started",
        actor_kind="role",
        actor_id="engineering.implementation",
        payload={"tool_name": "claude_code", "args": {"step": "plan"}},
        run_id="run-1",
    )
    assert aggregate_gate_results([other_event]) is None


def test_aggregate_gate_results_splits_pass_and_fail() -> None:
    passed = make_event(
        event_type="gate.check.passed",
        actor_kind="system",
        actor_id="procurement-lab-factory",
        payload={"gate_name": "pytest-smoke", "duration_ms": 12},
        run_id="run-1",
    )
    failed = make_event(
        event_type="gate.check.failed",
        actor_kind="system",
        actor_id="procurement-lab-factory",
        payload={"gate_name": "voice_lint", "duration_ms": 5},
        run_id="run-1",
    )
    summary = aggregate_gate_results([passed, failed])
    assert summary == {
        "gates_passed": ["pytest-smoke"],
        "gates_failed": ["voice_lint"],
        "all_passed": False,
    }


def test_aggregate_gate_results_all_passed_when_no_failures() -> None:
    passed = make_event(
        event_type="gate.check.passed",
        actor_kind="system",
        actor_id="procurement-lab-factory",
        payload={"gate_name": "pytest-smoke", "duration_ms": 12},
        run_id="run-1",
    )
    summary = aggregate_gate_results([passed])
    assert summary is not None
    assert summary["all_passed"] is True
    assert summary["gates_failed"] == []


def test_build_run_evidence_fields_populates_two_hashes_minimum(
    tmp_path: Path,
) -> None:
    result = build_run_evidence_fields(
        prompt_text="hello world",
        system_prompt=None,
        workers=["stub"],
        gates=["pytest-smoke"],
        worktree_path=None,
        gate_events=[],
    )
    assert "prompt_snapshot_hash" in result.fields
    assert "tool_schemas_snapshot_hash" in result.fields
    assert "sandbox_image_ref" not in result.fields
    assert "gate_results_summary" not in result.fields
    assert set(result.populated) == {
        "prompt_snapshot_hash",
        "tool_schemas_snapshot_hash",
    }


def test_build_run_evidence_fields_populates_gate_summary() -> None:
    passed = make_event(
        event_type="gate.check.passed",
        actor_kind="system",
        actor_id="procurement-lab-factory",
        payload={"gate_name": "pytest-smoke", "duration_ms": 7},
        run_id="run-1",
    )
    result = build_run_evidence_fields(
        prompt_text="prompt",
        system_prompt="sys",
        workers=["stub"],
        gates=["pytest-smoke"],
        worktree_path=None,
        gate_events=[passed],
    )
    assert "gate_results_summary" in result.fields
    assert result.fields["gate_results_summary"]["all_passed"] is True
    assert "gate_results_summary" in result.populated


def test_derive_sandbox_image_ref_returns_none_for_missing_path(
    tmp_path: Path,
) -> None:
    missing = tmp_path / "nope"
    assert derive_sandbox_image_ref(missing) is None
    assert derive_sandbox_image_ref(None) is None


def test_derive_sandbox_image_ref_includes_head_sha_for_real_repo(
    tmp_path: Path,
) -> None:
    import subprocess as _subprocess

    repo = tmp_path / "repo"
    repo.mkdir()
    _subprocess.run(
        ["git", "init", "-b", "main", str(repo)],
        capture_output=True,
        check=True,
    )
    _subprocess.run(
        ["git", "-C", str(repo), "config", "user.email", "factory@test.local"],
        capture_output=True,
        check=True,
    )
    _subprocess.run(
        ["git", "-C", str(repo), "config", "user.name", "factory-test"],
        capture_output=True,
        check=True,
    )
    (repo / "seed.txt").write_text("seed\n", encoding="utf-8")
    _subprocess.run(
        ["git", "-C", str(repo), "add", "-A"], capture_output=True, check=True
    )
    _subprocess.run(
        ["git", "-C", str(repo), "commit", "-m", "seed"],
        capture_output=True,
        check=True,
    )
    ref = derive_sandbox_image_ref(repo)
    assert ref is not None
    assert ref.startswith(repo.as_posix() + "@")
    assert re.match(r".+@[0-9a-f]{40}$", ref)
