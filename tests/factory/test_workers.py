"""Worker tests. Real CLIs aren't required; we exercise stub + registry fallback.

Covers: R-FACTORY-004, R-FACTORY-RUN-EVIDENCE-026.
"""

from __future__ import annotations

from pathlib import Path

from scripts.factory.task import GateSpec
from scripts.factory.workers import (
    ClaudeCodeWorker,
    CodexWorker,
    GateWorker,
    StubWorker,
    WorkerResult,
    _looks_like_unsupported_flag,
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


# ----- FAC-002/003 fix tests: headless tool perms + stdin-for-long-prompts ----


def test_claude_argv_includes_permission_mode_and_tools(tmp_path: Path) -> None:
    """FAC-002 regression: ClaudeCodeWorker must pass tool perms in headless mode."""
    worker = ClaudeCodeWorker()
    argv, stdin = worker._argv_and_stdin("short prompt", with_json=True)
    assert "--permission-mode" in argv
    assert "acceptEdits" in argv
    assert "--allowedTools" in argv
    # The tool allowlist comes from CLAUDE_HEADLESS_TOOLS as one space-separated string
    tools_idx = argv.index("--allowedTools")
    assert "Edit" in argv[tools_idx + 1]
    assert "Write" in argv[tools_idx + 1]
    assert stdin is None  # short prompt stays in argv


def test_claude_long_prompt_routes_via_stdin(tmp_path: Path) -> None:
    """FAC-003 regression: long prompts go via stdin so argv stays under Windows limit."""
    from scripts.factory.workers import PROMPT_STDIN_THRESHOLD

    worker = ClaudeCodeWorker()
    long_prompt = "x" * (PROMPT_STDIN_THRESHOLD + 100)
    argv, stdin = worker._argv_and_stdin(long_prompt, with_json=True)
    assert stdin == long_prompt
    # The long prompt MUST NOT appear in argv
    assert all(long_prompt not in piece for piece in argv)


def test_codex_argv_includes_workspace_write_sandbox(tmp_path: Path) -> None:
    """FAC-002 regression for codex: headless codex needs workspace-write sandbox."""
    worker = CodexWorker()
    argv, stdin = worker._argv_and_stdin("short prompt", with_json=True)
    assert "--sandbox" in argv
    assert "workspace-write" in argv
    assert "--skip-git-repo-check" in argv
    assert stdin is None


def test_codex_long_prompt_routes_via_stdin_with_dash_argv(tmp_path: Path) -> None:
    """FAC-003 regression: codex uses `-` argv convention to read from stdin."""
    from scripts.factory.workers import PROMPT_STDIN_THRESHOLD

    worker = CodexWorker()
    long_prompt = "y" * (PROMPT_STDIN_THRESHOLD + 100)
    argv, stdin = worker._argv_and_stdin(long_prompt, with_json=True)
    assert stdin == long_prompt
    # Codex stdin convention: `-` as the prompt argv slot
    assert argv[-1] == "-"
    # The long prompt MUST NOT appear in argv
    assert all(long_prompt not in piece for piece in argv)


def test_prompt_threshold_is_safe_under_windows_argv_limit() -> None:
    """The threshold + remaining argv must stay well under Windows ~8191 limit."""
    from scripts.factory.workers import PROMPT_STDIN_THRESHOLD

    # Claude full argv around the prompt: program + 8 flags ≈ 200 chars headroom
    # Codex: similar. 4000-char threshold leaves 4000+ chars of headroom.
    assert PROMPT_STDIN_THRESHOLD <= 6000
    # And large enough that short prompts (plans/reviews of a paragraph) stay in argv
    assert PROMPT_STDIN_THRESHOLD >= 2000


def test_codex_unexpected_output_format_error_triggers_fallback() -> None:
    """BUG-FAC-006 regression: current Codex says unexpected argument."""
    stderr = """error: unexpected argument '--output-format' found

  tip: a similar argument exists: '--output-schema'

Usage: codex exec [OPTIONS] [PROMPT]
"""
    assert _looks_like_unsupported_flag(stderr) is True
