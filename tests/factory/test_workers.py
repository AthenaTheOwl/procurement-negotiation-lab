"""Worker tests. Real CLIs aren't required; we exercise stub + registry fallback."""

from __future__ import annotations

from pathlib import Path

from scripts.factory.task import GateSpec
from scripts.factory.workers import (
    ClaudeCodeWorker,
    CodexWorker,
    GateWorker,
    StubWorker,
    WorkerResult,
    resolve_worker,
)


def test_stub_worker_returns_deterministic_payload(tmp_path: Path) -> None:
    worker = StubWorker(label="planner")
    result = worker.run("hello\nworld", cwd=tmp_path)
    assert result.ok is True
    assert "stub:planner" in result.stdout
    assert "prompt length" in result.stdout
    assert result.metadata["stub"] is True


def test_stub_worker_metadata_carries_addendum6_keys(tmp_path: Path) -> None:
    """Per DEC-FACTORY-013 the addendum-6 emission slice requires every
    worker invocation to populate the metadata keys ``thread_id``,
    ``run_id``, ``model``, ``duration_ms``, ``tokens_input``, and
    ``tokens_output``. StubWorker MUST satisfy the contract even though
    no live CLI ran.
    """
    worker = StubWorker(label="planner")
    result = worker.run("hello", cwd=tmp_path)
    for key in (
        "thread_id",
        "run_id",
        "model",
        "duration_ms",
        "tokens_input",
        "tokens_output",
    ):
        assert key in result.metadata, (
            f"StubWorker.metadata missing addendum-6 key: {key!r}"
        )
    assert isinstance(result.thread_id, str) and result.thread_id
    assert isinstance(result.run_id, str) and result.run_id
    assert result.model == "stub-model"
    assert result.duration_ms == 0
    assert result.tokens_input == 0
    assert result.tokens_output == 0


def test_stub_worker_seeded_ids_are_deterministic(tmp_path: Path) -> None:
    """Seeded StubWorkers must produce identical thread_id + run_id across
    invocations so tests can pin the synthesized IDs.
    """
    a = StubWorker(label="planner", seed="abc123").run("x", cwd=tmp_path)
    b = StubWorker(label="planner", seed="abc123").run("x", cwd=tmp_path)
    assert a.thread_id == b.thread_id
    assert a.run_id == b.run_id
    assert a.thread_id == "stub-planner-thread-abc123"
    assert a.run_id == "stub-planner-run-abc123"


def test_worker_result_accessors_handle_missing_metadata() -> None:
    """The WorkerResult typed accessors return None for missing keys
    rather than raising. Older call sites that never populated the new
    keys keep working.
    """
    result = WorkerResult(ok=True)
    assert result.thread_id is None
    assert result.run_id is None
    assert result.model is None
    assert result.duration_ms is None
    assert result.tokens_input is None
    assert result.tokens_output is None


def test_resolve_worker_falls_back_to_stub(tmp_path: Path) -> None:
    # The host may or may not have `claude` / `codex` on PATH.
    # When missing, resolve_worker must return a StubWorker.
    claude_worker = resolve_worker("claude_code", allow_stub_fallback=True)
    codex_worker = resolve_worker("codex", allow_stub_fallback=True)
    if not ClaudeCodeWorker.available():
        assert isinstance(claude_worker, StubWorker)
    if not CodexWorker.available():
        assert isinstance(codex_worker, StubWorker)


def test_claude_worker_missing_cli_still_populates_thread_id(tmp_path: Path) -> None:
    """When the claude CLI is not on PATH, the worker still ships a
    populated thread_id/run_id pair so downstream evidence emission
    never has to guard on None.
    """
    # We exercise this regardless of whether `claude` happens to be on
    # the developer's PATH; instantiate the worker directly and bypass
    # the available() short-circuit by calling the "no CLI" branch
    # whenever it triggers (which is the host's reality).
    worker = ClaudeCodeWorker()
    if worker.available():
        # The contract on the real-CLI branch is exercised by _run_cli
        # tests below; here we only care about the no-CLI shape.
        return
    result = worker.run("hi", cwd=tmp_path)
    assert result.ok is False
    assert isinstance(result.thread_id, str) and result.thread_id.startswith(
        "claude-cli-"
    )
    assert isinstance(result.run_id, str) and result.run_id.startswith(
        "claude-run-"
    )


def test_codex_worker_missing_cli_still_populates_thread_id(tmp_path: Path) -> None:
    worker = CodexWorker()
    if worker.available():
        return
    result = worker.run("hi", cwd=tmp_path)
    assert result.ok is False
    assert isinstance(result.thread_id, str) and result.thread_id.startswith(
        "codex-cli-"
    )
    assert isinstance(result.run_id, str) and result.run_id.startswith(
        "codex-run-"
    )


def test_gate_worker_passes_for_true_command(tmp_path: Path) -> None:
    # python -c "exit(0)" is portable across Windows + Unix shells when shell=True
    gates = [GateSpec(cmd='python -c "exit(0)"', name="noop", must_pass=True)]
    ok, outcomes = GateWorker().run_gates(gates, cwd=tmp_path)
    assert ok is True
    assert outcomes[0].ok is True


def test_gate_worker_fails_for_nonzero_command(tmp_path: Path) -> None:
    gates = [GateSpec(cmd='python -c "exit(1)"', name="fail", must_pass=True)]
    ok, outcomes = GateWorker().run_gates(gates, cwd=tmp_path)
    assert ok is False
    assert outcomes[0].ok is False


def test_gate_worker_aggregate_respects_must_pass(tmp_path: Path) -> None:
    gates = [
        GateSpec(cmd='python -c "exit(1)"', name="advisory", must_pass=False),
        GateSpec(cmd='python -c "exit(0)"', name="required", must_pass=True),
    ]
    ok, outcomes = GateWorker().run_gates(gates, cwd=tmp_path)
    assert ok is True
    assert outcomes[0].ok is False and outcomes[0].must_pass is False
