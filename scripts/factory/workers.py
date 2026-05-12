"""Workers: claude_code, codex, gate, stub.

Each worker runs in a subprocess inside the per-task worktree.
The factory falls back to `stub` when the requested CLI is not on PATH.
"""

from __future__ import annotations

import json as _json
import re
import shutil
import subprocess
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .task import GateSpec


@dataclass
class WorkerResult:
    ok: bool
    stdout: str = ""
    stderr: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def thread_id(self) -> str | None:
        value = self.metadata.get("thread_id")
        return value if isinstance(value, str) else None

    @property
    def run_id(self) -> str | None:
        value = self.metadata.get("run_id")
        return value if isinstance(value, str) else None


class Worker(ABC):
    name: str

    @abstractmethod
    def run(self, prompt: str, *, cwd: Path, timeout: int = 1800) -> WorkerResult: ...


# --- CLI workers ----------------------------------------------------------


def _cli_available(name: str) -> bool:
    return shutil.which(name) is not None


_THREAD_RE = re.compile(r'"?(?:thread_?id|threadId)"?\s*[:=]\s*"?([\w\-]+)"?')
_RUN_RE = re.compile(r'"?(?:run_?id|runId|session_?id)"?\s*[:=]\s*"?([\w\-]+)"?')


def _extract_id(pattern: re.Pattern[str], stream: str) -> str | None:
    if not stream:
        return None
    match = pattern.search(stream)
    return match.group(1) if match else None


def _extract_json_ids(stdout: str) -> dict[str, str]:
    """Best-effort: if stdout contains a JSON object with thread/run/model, pick fields."""
    out: dict[str, str] = {}
    if not stdout:
        return out
    # try the first balanced JSON object we can find
    text = stdout.strip()
    if not text.startswith("{"):
        return out
    try:
        parsed = _json.loads(text)
    except _json.JSONDecodeError:
        return out
    if not isinstance(parsed, dict):
        return out
    for key in ("thread_id", "threadId"):
        if isinstance(parsed.get(key), str):
            out["thread_id"] = parsed[key]
            break
    for key in ("run_id", "runId", "session_id", "sessionId"):
        if isinstance(parsed.get(key), str):
            out["run_id"] = parsed[key]
            break
    for key in ("model", "model_id"):
        if isinstance(parsed.get(key), str):
            out["model"] = parsed[key]
            break
    return out


def _run_cli(
    argv: list[str],
    *,
    cwd: Path,
    timeout: int,
    prompt_for_stdin: str | None = None,
    label: str = "cli",
) -> WorkerResult:
    start = time.monotonic()
    try:
        result = subprocess.run(  # noqa: S603 - argv is constructed, never shell-interpreted
            argv,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
            input=prompt_for_stdin,
            check=False,
        )
    except subprocess.TimeoutExpired as cause:
        return WorkerResult(
            ok=False,
            stderr=f"timeout after {timeout}s: {cause}",
            metadata={"duration_ms": int((time.monotonic() - start) * 1000)},
        )
    except FileNotFoundError as cause:
        return WorkerResult(
            ok=False,
            stderr=f"binary not found: {cause}",
            metadata={"duration_ms": int((time.monotonic() - start) * 1000)},
        )
    duration_ms = int((time.monotonic() - start) * 1000)
    json_ids = _extract_json_ids(result.stdout)
    thread_id = json_ids.get("thread_id") or _extract_id(_THREAD_RE, result.stdout) or _extract_id(_THREAD_RE, result.stderr)
    run_id = json_ids.get("run_id") or _extract_id(_RUN_RE, result.stdout) or _extract_id(_RUN_RE, result.stderr)
    model = json_ids.get("model")
    if thread_id is None:
        # Synthesize so downstream code can rely on the field. Tagged so it's
        # obvious in logs which IDs are real vs synthesized.
        thread_id = f"{label}-cli-{uuid.uuid4().hex[:12]}"
    if run_id is None:
        run_id = f"{label}-run-{uuid.uuid4().hex[:12]}"
    return WorkerResult(
        ok=result.returncode == 0,
        stdout=result.stdout,
        stderr=result.stderr,
        metadata={
            "returncode": result.returncode,
            "thread_id": thread_id,
            "run_id": run_id,
            "model": model,
            "duration_ms": duration_ms,
        },
    )


class ClaudeCodeWorker(Worker):
    """Invokes the `claude` CLI in non-interactive print mode.

    Uses `claude --print "<prompt>"` so the agent runs to completion and
    emits its final answer to stdout.
    """

    name = "claude_code"

    @staticmethod
    def available() -> bool:
        return _cli_available("claude")

    def run(self, prompt: str, *, cwd: Path, timeout: int = 1800) -> WorkerResult:
        if not self.available():
            return WorkerResult(
                ok=False, stderr="claude CLI not on PATH; install Claude Code first"
            )
        argv = ["claude", "--print", prompt]
        return _run_cli(argv, cwd=cwd, timeout=timeout, label="claude")


class CodexWorker(Worker):
    """Invokes the `codex` CLI in non-interactive exec mode.

    `codex exec "<prompt>"` is the documented one-shot form; this worker
    assumes the CLI is configured (auth, working model, etc.) outside the
    factory.
    """

    name = "codex"

    @staticmethod
    def available() -> bool:
        return _cli_available("codex")

    def run(self, prompt: str, *, cwd: Path, timeout: int = 1800) -> WorkerResult:
        if not self.available():
            return WorkerResult(
                ok=False, stderr="codex CLI not on PATH; install Codex CLI first"
            )
        argv = ["codex", "exec", prompt]
        return _run_cli(argv, cwd=cwd, timeout=timeout, label="codex")


# --- gate worker ---------------------------------------------------------


@dataclass
class GateOutcome:
    name: str
    cmd: str
    ok: bool
    must_pass: bool
    stdout: str
    stderr: str


class GateWorker:
    """Runs a list of shell commands. Each is a separate subprocess.

    Returns the per-gate outcomes plus an aggregate `ok` that is True only if
    every must-pass gate exited 0.
    """

    name = "gate"

    def run_gates(
        self, gates: list[GateSpec], *, cwd: Path, timeout: int = 1800
    ) -> tuple[bool, list[GateOutcome]]:
        outcomes: list[GateOutcome] = []
        aggregate_ok = True
        for gate in gates:
            gate_cwd = Path(gate.cwd) if gate.cwd else cwd
            try:
                result = subprocess.run(  # noqa: S602 - intentional shell=True for gate convenience
                    gate.cmd,
                    cwd=str(gate_cwd),
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                    shell=True,
                    check=False,
                )
                ok = result.returncode == 0
                outcomes.append(
                    GateOutcome(
                        name=gate.display_name(),
                        cmd=gate.cmd,
                        ok=ok,
                        must_pass=gate.must_pass,
                        stdout=result.stdout,
                        stderr=result.stderr,
                    )
                )
            except subprocess.TimeoutExpired as cause:
                outcomes.append(
                    GateOutcome(
                        name=gate.display_name(),
                        cmd=gate.cmd,
                        ok=False,
                        must_pass=gate.must_pass,
                        stdout="",
                        stderr=f"timeout: {cause}",
                    )
                )
                ok = False
            if not ok and gate.must_pass:
                aggregate_ok = False
        return aggregate_ok, outcomes


# --- stub worker (dry-run / offline) -------------------------------------


class StubWorker(Worker):
    """Deterministic placeholder for offline / dry-run / missing-CLI mode."""

    def __init__(self, label: str = "stub", seed: str | None = None):
        self.name = f"stub:{label}"
        self.label = label
        self.seed = seed  # set during tests for stable IDs

    def _synth_id(self, kind: str) -> str:
        if self.seed:
            return f"stub-{self.label}-{kind}-{self.seed}"
        return f"stub-{self.label}-{kind}-{uuid.uuid4().hex[:12]}"

    def run(self, prompt: str, *, cwd: Path, timeout: int = 1800) -> WorkerResult:
        head = prompt.splitlines()[0] if prompt else "<empty>"
        body = (
            f"[stub:{self.label}] would have run in {cwd}\n"
            f"prompt head: {head[:160]}\n"
            f"prompt length: {len(prompt)} chars"
        )
        return WorkerResult(
            ok=True,
            stdout=body,
            metadata={
                "stub": True,
                "thread_id": self._synth_id("thread"),
                "run_id": self._synth_id("run"),
                "model": "stub-model",
                "duration_ms": 0,
            },
        )


# --- registry ------------------------------------------------------------


def resolve_worker(name: str, *, allow_stub_fallback: bool = True) -> Worker:
    """Resolve a worker by name. Falls back to StubWorker when the CLI isn't installed.

    `name` is one of: "claude_code", "codex", "stub".
    """
    if name == "claude_code":
        worker = ClaudeCodeWorker()
        if not ClaudeCodeWorker.available() and allow_stub_fallback:
            return StubWorker(label="claude_code")
        return worker
    if name == "codex":
        worker = CodexWorker()
        if not CodexWorker.available() and allow_stub_fallback:
            return StubWorker(label="codex")
        return worker
    if name == "stub" or name.startswith("stub:"):
        return StubWorker(label=name.removeprefix("stub:") or "generic")
    raise ValueError(f"unknown worker: {name}")
