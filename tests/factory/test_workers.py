"""Worker tests. Real CLIs aren't required; we exercise stub + registry fallback."""

from __future__ import annotations

from pathlib import Path

from scripts.factory.task import GateSpec
from scripts.factory.workers import (
    ClaudeCodeWorker,
    CodexWorker,
    GateWorker,
    StubWorker,
    resolve_worker,
)


def test_stub_worker_returns_deterministic_payload(tmp_path: Path) -> None:
    worker = StubWorker(label="planner")
    result = worker.run("hello\nworld", cwd=tmp_path)
    assert result.ok is True
    assert "stub:planner" in result.stdout
    assert "prompt length" in result.stdout
    assert result.metadata["stub"] is True


def test_resolve_worker_falls_back_to_stub(tmp_path: Path) -> None:
    # The host may or may not have `claude` / `codex` on PATH.
    # When missing, resolve_worker must return a StubWorker.
    claude_worker = resolve_worker("claude_code", allow_stub_fallback=True)
    codex_worker = resolve_worker("codex", allow_stub_fallback=True)
    if not ClaudeCodeWorker.available():
        assert isinstance(claude_worker, StubWorker)
    if not CodexWorker.available():
        assert isinstance(codex_worker, StubWorker)


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
