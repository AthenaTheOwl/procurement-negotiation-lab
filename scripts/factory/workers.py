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
    """Worker outcome plus an extensible metadata bag.

    Per DEC-FACTORY-013 the metadata bag carries six addendum-6 fields on
    every worker invocation (real or stub):

    - ``thread_id`` (str | None): opaque conversation/thread handle;
      synthesized as ``<label>-cli-<uuid12>`` when the CLI does not emit
      one so the field is always populated.
    - ``run_id`` (str | None): one-shot invocation handle; same
      synthesis convention with a ``run`` suffix.
    - ``model`` (str | None): model identifier when the CLI surfaces it.
    - ``duration_ms`` (int): wall-clock duration of the subprocess.
    - ``tokens_input`` (int | None): prompt-side token count when the
      CLI emits a usage block. None when unknown.
    - ``tokens_output`` (int | None): completion-side token count.

    The dict shape is intentionally extensible: callers may stash
    additional debugging hints under unreserved keys without breaking
    the documented contract surface.
    """

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

    @property
    def model(self) -> str | None:
        value = self.metadata.get("model")
        return value if isinstance(value, str) else None

    @property
    def duration_ms(self) -> int | None:
        value = self.metadata.get("duration_ms")
        if isinstance(value, bool):
            return None
        return value if isinstance(value, int) else None

    @property
    def tokens_input(self) -> int | None:
        value = self.metadata.get("tokens_input")
        if isinstance(value, bool):
            return None
        return value if isinstance(value, int) else None

    @property
    def tokens_output(self) -> int | None:
        value = self.metadata.get("tokens_output")
        if isinstance(value, bool):
            return None
        return value if isinstance(value, int) else None


class Worker(ABC):
    name: str

    @abstractmethod
    def run(self, prompt: str, *, cwd: Path, timeout: int = 1800) -> WorkerResult: ...


# --- CLI workers ----------------------------------------------------------


def _cli_available(name: str) -> bool:
    return shutil.which(name) is not None


_THREAD_RE = re.compile(
    r'"?(?:thread_?id|threadId|conversation_?id|conversationId)"?\s*[:=]\s*"?([\w\-]+)"?'
)
_RUN_RE = re.compile(r'"?(?:run_?id|runId|session_?id|sessionId)"?\s*[:=]\s*"?([\w\-]+)"?')


def _extract_id(pattern: re.Pattern[str], stream: str) -> str | None:
    if not stream:
        return None
    match = pattern.search(stream)
    return match.group(1) if match else None


def _string_at_path(obj: dict[str, Any], *path: str) -> str | None:
    current: Any = obj
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current if isinstance(current, str) else None


def _int_at_path(obj: dict[str, Any], *path: str) -> int | None:
    current: Any = obj
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    if isinstance(current, bool):  # bool is a subclass of int; skip it
        return None
    return current if isinstance(current, int) else None


def _extract_json_ids_from_obj(parsed: dict[str, Any]) -> dict[str, Any]:
    """Best-effort extraction from known Claude/Codex-style JSON shapes.

    Returns a flat dict with optional ``thread_id``, ``run_id``, ``model``,
    ``tokens_input``, ``tokens_output`` keys. Missing fields are dropped
    so callers can use a simple ``out.update`` to merge multiple objects.
    """
    out: dict[str, Any] = {}
    for key in ("thread_id", "threadId", "conversation_id", "conversationId"):
        if isinstance(parsed.get(key), str):
            out["thread_id"] = parsed[key]
            break
    if "thread_id" not in out:
        for path in (("thread", "id"), ("conversation", "id")):
            value = _string_at_path(parsed, *path)
            if value:
                out["thread_id"] = value
                break
    for key in ("run_id", "runId", "session_id", "sessionId"):
        if isinstance(parsed.get(key), str):
            out["run_id"] = parsed[key]
            break
    if "run_id" not in out:
        for path in (("run", "id"), ("session", "id")):
            value = _string_at_path(parsed, *path)
            if value:
                out["run_id"] = value
                break
    for key in ("model", "model_id", "modelId"):
        if isinstance(parsed.get(key), str):
            out["model"] = parsed[key]
            break
    if "model" not in out:
        value = _string_at_path(parsed, "response", "model") or _string_at_path(
            parsed, "message", "model"
        )
        if value:
            out["model"] = value
    # Token counts. Real CLIs emit these under a usage object with a few
    # naming conventions: input_tokens/output_tokens (Anthropic),
    # prompt_tokens/completion_tokens (OpenAI). Capture either flavour
    # under our canonical tokens_input / tokens_output keys so downstream
    # consumers do not have to branch on provider.
    for usage_path in (("usage",), ("response", "usage"), ("message", "usage")):
        usage = parsed
        for segment in usage_path:
            usage = usage.get(segment) if isinstance(usage, dict) else None
            if usage is None:
                break
        if not isinstance(usage, dict):
            continue
        if "tokens_input" not in out:
            for key in ("input_tokens", "prompt_tokens"):
                value = usage.get(key)
                if isinstance(value, int) and not isinstance(value, bool):
                    out["tokens_input"] = value
                    break
        if "tokens_output" not in out:
            for key in ("output_tokens", "completion_tokens"):
                value = usage.get(key)
                if isinstance(value, int) and not isinstance(value, bool):
                    out["tokens_output"] = value
                    break
        if "tokens_input" in out and "tokens_output" in out:
            break
    # Top-level fallback for the rare CLI that flattens the usage block.
    if "tokens_input" not in out:
        value = _int_at_path(parsed, "tokens_input") or _int_at_path(
            parsed, "input_tokens"
        )
        if value is not None:
            out["tokens_input"] = value
    if "tokens_output" not in out:
        value = _int_at_path(parsed, "tokens_output") or _int_at_path(
            parsed, "output_tokens"
        )
        if value is not None:
            out["tokens_output"] = value
    return out


def _extract_json_ids(stdout: str) -> dict[str, Any]:
    """Best-effort: parse JSON or JSONL with thread/run/model/usage fields.

    Real CLIs vary: some emit one JSON object, some emit JSONL events, and
    some only include IDs in stderr. This helper prefers real IDs whenever
    they appear and lets `_run_cli` synthesize tagged IDs only as a fallback.
    Token counts (tokens_input/tokens_output) ride alongside the IDs when
    a ``usage`` block is present in any of the parsed objects.
    """
    out: dict[str, Any] = {}
    if not stdout:
        return out
    for line in stdout.splitlines() or [stdout]:
        text = line.strip()
        if not text.startswith("{"):
            continue
        try:
            parsed = _json.loads(text)
        except _json.JSONDecodeError:
            continue
        if not isinstance(parsed, dict):
            continue
        extracted = _extract_json_ids_from_obj(parsed)
        # First non-empty value wins per key; later JSONL events do not
        # clobber an ID already pinned by an earlier event. (The usage
        # block typically rides on the terminal event, but its values
        # are still terminal-event values; later events do not roll
        # them back.)
        for key, value in extracted.items():
            if value is None or value == "":
                continue
            out.setdefault(key, value)
        if {"thread_id", "run_id", "model", "tokens_input", "tokens_output"}.issubset(out):
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
    # Windows-friendly: subprocess.run([bare-name]) with shell=False does NOT
    # honor PATHEXT, so npm-installed CLIs (claude.cmd, codex.cmd) fail with
    # WinError 2. shutil.which resolves the full path including extension.
    resolved = shutil.which(argv[0])
    if resolved is not None:
        argv = [resolved, *argv[1:]]
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
        # Even on failure we still populate thread_id + run_id so downstream
        # consumers can rely on the contract: every WorkerResult carries an
        # opaque ID pair, real-or-synthesized.
        return WorkerResult(
            ok=False,
            stderr=f"timeout after {timeout}s: {cause}",
            metadata={
                "duration_ms": int((time.monotonic() - start) * 1000),
                "thread_id": f"{label}-cli-{uuid.uuid4().hex[:12]}",
                "run_id": f"{label}-run-{uuid.uuid4().hex[:12]}",
                "model": None,
                "tokens_input": None,
                "tokens_output": None,
            },
        )
    except FileNotFoundError as cause:
        return WorkerResult(
            ok=False,
            stderr=f"binary not found: {cause}",
            metadata={
                "duration_ms": int((time.monotonic() - start) * 1000),
                "thread_id": f"{label}-cli-{uuid.uuid4().hex[:12]}",
                "run_id": f"{label}-run-{uuid.uuid4().hex[:12]}",
                "model": None,
                "tokens_input": None,
                "tokens_output": None,
            },
        )
    duration_ms = int((time.monotonic() - start) * 1000)
    json_ids = _extract_json_ids(result.stdout)
    if len(json_ids) < 2:
        for key, value in _extract_json_ids(result.stderr).items():
            json_ids.setdefault(key, value)
    thread_id = (
        json_ids.get("thread_id")
        or _extract_id(_THREAD_RE, result.stdout)
        or _extract_id(_THREAD_RE, result.stderr)
    )
    run_id = (
        json_ids.get("run_id")
        or _extract_id(_RUN_RE, result.stdout)
        or _extract_id(_RUN_RE, result.stderr)
    )
    model = json_ids.get("model")
    if thread_id is None:
        # Synthesize so downstream code can rely on the field. Tagged so it's
        # obvious in logs which IDs are real vs synthesized.
        thread_id = f"{label}-cli-{uuid.uuid4().hex[:12]}"
    if run_id is None:
        run_id = f"{label}-run-{uuid.uuid4().hex[:12]}"
    tokens_input = json_ids.get("tokens_input")
    tokens_output = json_ids.get("tokens_output")
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
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
        },
    )


_UNSUPPORTED_FLAG_MARKERS = (
    "unknown option",
    "unrecognized option",
    "unrecognised option",
    "unknown argument",
    "no such option",
    "invalid option",
    "unknown flag",
)


def _looks_like_unsupported_flag(stderr: str) -> bool:
    """Detect a CLI complaining about an unknown ``--output-format`` flag.

    The addendum-6 emission slice asks each real-CLI worker to try the
    json-output flag first and fall back to plain text on older CLIs
    that do not yet support it. Different CLIs phrase the rejection
    differently; we match the common substrings case-insensitively.
    """
    if not stderr:
        return False
    lowered = stderr.lower()
    if "--output-format" not in lowered:
        return False
    return any(marker in lowered for marker in _UNSUPPORTED_FLAG_MARKERS)


def _always_populated_synthetic_metadata(label: str) -> dict[str, Any]:
    """Return the always-populated metadata block for a synthetic-only result.

    Used when the CLI is not on PATH so even the no-CLI branch ships a
    thread_id/run_id pair downstream consumers can trust.
    """
    return {
        "thread_id": f"{label}-cli-{uuid.uuid4().hex[:12]}",
        "run_id": f"{label}-run-{uuid.uuid4().hex[:12]}",
        "model": None,
        "duration_ms": 0,
        "tokens_input": None,
        "tokens_output": None,
    }


class ClaudeCodeWorker(Worker):
    """Invokes the `claude` CLI in non-interactive print mode.

    Tries ``claude --print --output-format json "<prompt>"`` first so the
    real CLI emits a structured payload we can parse for thread/run/model
    + token counts. Falls back to plain ``claude --print "<prompt>"`` when
    the installed CLI does not recognize ``--output-format``; the fallback
    still synthesizes a tagged thread_id/run_id pair via ``_run_cli`` so
    the WorkerResult.metadata contract holds.
    """

    name = "claude_code"

    @staticmethod
    def available() -> bool:
        return _cli_available("claude")

    def run(self, prompt: str, *, cwd: Path, timeout: int = 1800) -> WorkerResult:
        if not self.available():
            return WorkerResult(
                ok=False,
                stderr="claude CLI not on PATH; install Claude Code first",
                metadata=_always_populated_synthetic_metadata("claude"),
            )
        argv = ["claude", "--print", "--output-format", "json", prompt]
        first = _run_cli(argv, cwd=cwd, timeout=timeout, label="claude")
        if first.ok or not _looks_like_unsupported_flag(first.stderr):
            return first
        fallback_argv = ["claude", "--print", prompt]
        return _run_cli(fallback_argv, cwd=cwd, timeout=timeout, label="claude")


class CodexWorker(Worker):
    """Invokes the `codex` CLI in non-interactive exec mode.

    Tries ``codex exec --output-format json "<prompt>"`` first so the real
    CLI emits structured metadata. Falls back to ``codex exec "<prompt>"``
    on older CLIs that do not yet support the flag. The fallback still
    synthesizes a tagged ID pair via ``_run_cli``.
    """

    name = "codex"

    @staticmethod
    def available() -> bool:
        return _cli_available("codex")

    def run(self, prompt: str, *, cwd: Path, timeout: int = 1800) -> WorkerResult:
        if not self.available():
            return WorkerResult(
                ok=False,
                stderr="codex CLI not on PATH; install Codex CLI first",
                metadata=_always_populated_synthetic_metadata("codex"),
            )
        argv = ["codex", "exec", "--output-format", "json", prompt]
        first = _run_cli(argv, cwd=cwd, timeout=timeout, label="codex")
        if first.ok or not _looks_like_unsupported_flag(first.stderr):
            return first
        fallback_argv = ["codex", "exec", prompt]
        return _run_cli(fallback_argv, cwd=cwd, timeout=timeout, label="codex")


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
        # Token counts are advisory in dry-run; pin them to 0 (not None)
        # so the WorkerResult.metadata block always carries the addendum-6
        # contract keys and the test fixture can assert on a concrete int.
        return WorkerResult(
            ok=True,
            stdout=body,
            metadata={
                "stub": True,
                "thread_id": self._synth_id("thread"),
                "run_id": self._synth_id("run"),
                "model": "stub-model",
                "duration_ms": 0,
                "tokens_input": 0,
                "tokens_output": 0,
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
