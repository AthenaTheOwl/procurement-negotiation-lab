"""Unit tests for the run-evidence emitter helpers.

These tests cover the emitter module in isolation. The pipeline-level
integration test that exercises ``emit_event`` + ``emit_run`` end-to-end
lives in ``test_pipeline.py``.

Covers: R-FACTORY-RUN-EVIDENCE-001, R-FACTORY-RUN-EVIDENCE-002,
R-FACTORY-RUN-EVIDENCE-003, R-FACTORY-RUN-EVIDENCE-004,
R-FACTORY-RUN-EVIDENCE-005, R-FACTORY-RUN-EVIDENCE-006.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from procurement_lab.run_evidence import (
    REPO_NAME,
    SANDBOX_PENDING_PLACEHOLDER,
    aggregate_gate_results,
    build_artifact_uri,
    build_repo_uri,
    build_run_evidence_fields,
    canonicalize_prompt,
    canonicalize_tool_surface,
    compute_sha256,
    derive_sandbox_image_ref,
    emit_event,
    emit_run,
    extract_repo_uri_sha,
    is_repo_uri,
    make_event,
    resolve_uri,
)

from .conftest import init_git_repo


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
    a = canonicalize_tool_surface(["claude_code", "codex", "stub"], ["pytest", "voice_lint"])
    b = canonicalize_tool_surface(["stub", "codex", "claude_code"], ["voice_lint", "pytest"])
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
    repo = tmp_path / "repo"
    init_git_repo(repo)
    ref = derive_sandbox_image_ref(repo)
    assert ref is not None
    # Post-DEC-FACTORY-010: the emitter writes a repo:// URI pinned at the
    # repo root (empty path component, trailing slash required by grammar).
    assert ref.startswith(f"repo://{REPO_NAME}@")
    assert re.match(r"^repo://procurement-negotiation-lab@[0-9a-f]{40}/$", ref)


# ----------------------------------------------------------------- DEC-FACTORY-010 URI scheme tests


def test_build_repo_uri_with_path() -> None:
    """Build a repo:// URI with a SHA + relative path.

    Covers: R-FACTORY-RUN-EVIDENCE-015, R-FACTORY-RUN-EVIDENCE-016.
    """
    sha = "a" * 40
    uri = build_repo_uri(sha, "ops/factory-tasks/example.yaml")
    assert uri == (
        "repo://procurement-negotiation-lab@" + ("a" * 40) + "/ops/factory-tasks/example.yaml"
    )


def test_build_repo_uri_empty_path_is_repo_root() -> None:
    sha = "b" * 40
    uri = build_repo_uri(sha, "")
    assert uri == "repo://procurement-negotiation-lab@" + ("b" * 40) + "/"


def test_build_repo_uri_rejects_short_sha() -> None:
    with pytest.raises(ValueError):
        build_repo_uri("abc", "anything")


def test_build_artifact_uri_round_trip() -> None:
    uri = build_artifact_uri("watchlist-packet@run-abc")
    assert uri == "artifact://procurement-negotiation-lab/watchlist-packet@run-abc"


def test_resolve_uri_repo_uri_returns_local_path() -> None:
    """Resolve a repo:// URI to its on-disk path under the portfolio root.

    Covers: R-FACTORY-RUN-EVIDENCE-017, R-FACTORY-RUN-EVIDENCE-018.
    """
    sha = "c" * 40
    uri = f"repo://procurement-negotiation-lab@{sha}/ops/factory-tasks/x.yaml"
    portfolio = Path("e:/claude_code/random-apps")
    resolved = resolve_uri(uri, portfolio)
    assert resolved == (
        portfolio / "procurement-negotiation-lab" / "ops" / "factory-tasks" / "x.yaml"
    )


def test_resolve_uri_artifact_uri_returns_none() -> None:
    assert resolve_uri("artifact://procurement-negotiation-lab/anything") is None


def test_resolve_uri_legacy_local_path_returns_path_as_is() -> None:
    legacy = "E:/some/legacy/path.yaml"
    assert resolve_uri(legacy) == Path(legacy)


def test_resolve_uri_malformed_uri_returns_path_as_is() -> None:
    # An invalid 30-char SHA does not match the repo URI regex.
    bad = "repo://procurement-negotiation-lab@" + ("a" * 30) + "/x"
    assert resolve_uri(bad) == Path(bad)


def test_extract_repo_uri_sha_pulls_sha_from_uri() -> None:
    sha = "d" * 40
    uri = f"repo://procurement-negotiation-lab@{sha}/ops/x.yaml"
    assert extract_repo_uri_sha(uri) == sha


def test_extract_repo_uri_sha_returns_none_for_legacy_form() -> None:
    legacy = "C:/some/path@" + ("e" * 40)
    assert extract_repo_uri_sha(legacy) is None


def test_is_repo_uri_accepts_pending_placeholder() -> None:
    assert is_repo_uri(SANDBOX_PENDING_PLACEHOLDER)
    assert is_repo_uri(f"repo://procurement-negotiation-lab@{'f' * 40}/")
    assert not is_repo_uri("artifact://procurement-negotiation-lab/anything")
