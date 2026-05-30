"""OpenAI Agents SDK runtime adapter for the procurement-lab factory.

Wraps a factory task as an Agents-SDK SandboxAgent run. Emits a sandbox
manifest, persists RunState checkpoints, writes typed traces into the
existing ``ops/event-ledger/`` single source of truth. Operates in stub
mode when ``OPENAI_API_KEY`` is absent (manifest + initial checkpoint +
stub-mode event still get written; no live SDK calls happen).

See DEC-CDCP-021 (athena-site) for the cross-runtime contract.
See DEC-FACTORY-016 (this repo) for the local-adoption decision.

Stub vs live mode
-----------------

The adapter has three operating layers, matching Phase 1's graceful
degradation design:

1. ``openai-agents`` package missing on PYTHONPATH. The import guard
   sets ``_SDK_AVAILABLE = False``, the adapter logs a single warning,
   emits a ``runtime.agents_sdk.unavailable`` event, and falls back to
   the same artifact-only path used in case 2.
2. Package present, ``OPENAI_API_KEY`` absent. The adapter STILL writes
   a conformant sandbox manifest, an initial RunState-shaped checkpoint,
   and a ``runtime.agents_sdk.stub_mode`` event, then returns a Run
   record dict with both new refs populated. No SDK calls happen.
3. Package present, key present. The adapter constructs the SandboxAgent,
   mounts the Manifest, runs to completion, serializes the final
   session_state to the checkpoint path, and emits live events. This
   path is reachable but intentionally not exercised in CI; the next
   workflow installs the SDK and verifies the live shape.

Why a single-ledger discipline
------------------------------

Phase 1 explicitly maps the SDK's trace events into the existing
``ops/event-ledger/<run-id>.jsonl`` rather than minting a parallel
``ops/traces/`` directory. A second trace surface would fork the source
of truth and defeat the CDCP single-ledger discipline. The existing
validator and replay scripts already understand ``tool.call.*`` /
``gate.check.*`` events; the adapter wraps each SDK tool invocation and
emits the same event types.
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Mapping

from procurement_lab.run_evidence import (
    REPO_NAME,
    SANDBOX_PENDING_PLACEHOLDER,
    build_repo_uri,
    canonicalize_prompt,
    canonicalize_tool_surface,
    compute_sha256,
    emit_event,
    emit_run,
    make_event,
)

LOGGER = logging.getLogger(__name__)

# Optional SDK import. The adapter must load cleanly even when
# ``openai-agents`` is not installed; the import guard pattern keeps
# CI and offline runs unblocked. See Phase 1 stub_strategy layer 1.
try:  # pragma: no cover - import probe
    from agents import Agent, Runner  # type: ignore[import-not-found]
    from agents.sandbox import (  # type: ignore[import-not-found]
        Manifest as _SDKManifest,
    )
    from agents.sandbox import (  # type: ignore[import-not-found]
        SandboxAgent,
        SandboxRunConfig,
    )

    _SDK_AVAILABLE = True
except ImportError:  # pragma: no cover - import probe
    Agent = None  # type: ignore[assignment]
    Runner = None  # type: ignore[assignment]
    _SDKManifest = None  # type: ignore[assignment]
    SandboxAgent = None  # type: ignore[assignment]
    SandboxRunConfig = None  # type: ignore[assignment]
    _SDK_AVAILABLE = False


# ----------------------------------------------------------------- emitter dirs

REPO_ROOT_DEFAULT = Path(__file__).resolve().parents[3]
EVENT_LEDGER_DIRNAME = "ops/event-ledger"
SANDBOX_MANIFEST_DIRNAME = "ops/sandbox-manifests"
CHECKPOINT_DIRNAME = "ops/checkpoints"
RUN_RECORDS_DIRNAME = "ops/run-records"

# Manifest schema version pinned to the cached schema. Bump when the
# upstream sandbox-manifest.schema.json revs.
MANIFEST_VERSION = "1.0.0"

# Runtime provider id for the manifest body. Matches the canonical id
# documented in the schema description.
RUNTIME_PROVIDER = "openai-agents-sdk"

# Default model for stub runs. Live mode overrides via run options.
DEFAULT_MODEL = "openai:gpt-5:stub"

# Default tool surface advertised by the adapter. The factory worker
# vocabulary doubles as the manifest tool surface so the schema_hash
# fields stay in sync with the existing hash inputs in run_evidence.
DEFAULT_TOOL_SURFACE: tuple[str, ...] = (
    "claude_code",
    "codex",
    "stub",
)


def _now_iso_microseconds() -> str:
    """Return UTC timestamp at microsecond resolution with Z suffix.

    Workflow B-Recovery lesson: per-second timestamps allowed two adapter
    runs inside the same wall-clock second to overwrite each other's
    artifacts when run back-to-back in tests. The microsecond suffix
    keeps the filename / event timestamp atomic across rapid retries.
    """
    now = datetime.now(UTC)
    return f"{now:%Y-%m-%dT%H:%M:%S}.{now.microsecond:06d}Z"


def _as_posix(path: Path) -> str:
    """Round 5 lesson: resolve + as_posix for every emitted path string.

    Returning Windows-flavored backslashes leaks into JSON payloads and
    forks the schema between the Windows dev host and CI on Linux. The
    Path.resolve() call guarantees an absolute, normalized form; the
    POSIX projection guarantees a single canonical separator.
    """
    return path.resolve().as_posix()


# ----------------------------------------------------------------- schema cache

_SCHEMA_CACHE: dict[str, Mapping[str, Any]] = {}


def _schemas_dir(repo_root: Path) -> Path:
    return repo_root / "ops" / "schemas-cache"


def _load_schema(repo_root: Path, name: str) -> Mapping[str, Any]:
    cached = _SCHEMA_CACHE.get(name)
    if cached is not None:
        return cached
    path = _schemas_dir(repo_root) / name
    if not path.is_file():
        raise FileNotFoundError(
            f"openai_agents_runtime: schema cache missing at {path}. "
            "Run scripts/check_schema_cache_freshness.py."
        )
    schema = json.loads(path.read_text(encoding="utf-8"))
    _SCHEMA_CACHE[name] = schema
    return schema  # type: ignore[no-any-return]


def _validate(
    record: Mapping[str, Any], schema_name: str, repo_root: Path
) -> None:
    try:
        import jsonschema  # type: ignore[import-untyped]
    except ImportError as exc:  # pragma: no cover - tested transitively
        raise SystemExit(
            "openai_agents_runtime: jsonschema is required. "
            "Install with `pip install jsonschema>=4.21`."
        ) from exc
    schema = _load_schema(repo_root, schema_name)
    validator_cls = jsonschema.validators.validator_for(schema)
    validator = validator_cls(schema)
    errors = sorted(validator.iter_errors(record), key=lambda e: e.path)
    if errors:
        details = "; ".join(
            f"{'/'.join(str(p) for p in err.path) or '<root>'}: {err.message}"
            for err in errors
        )
        raise ValueError(
            f"openai_agents_runtime: record does not validate against "
            f"{schema_name}: {details}"
        )


# ----------------------------------------------------------------- adapter


@dataclass
class AgentsSDKRuntimeAdapter:
    """Wraps a factory task as an Agents-SDK run.

    Stub mode (no ``OPENAI_API_KEY``): emits manifest + initial
    checkpoint + a ``runtime.agents_sdk.stub_mode`` event into the
    ledger, returns a synthetic Run record dict with both refs populated.

    Live mode (``OPENAI_API_KEY`` present and ``openai-agents`` installed):
    imports the SDK, constructs SandboxAgent + Manifest + SandboxRunConfig,
    runs to completion via ``Runner.run``, emits live trace events into
    the same ledger, serializes RunState into the checkpoint path on
    every pause event.

    The adapter writes a Run record dict in memory and persists it
    through ``procurement_lab.run_evidence.emit_run``; the same emitter
    path used by the factory pipeline.
    """

    run_id: str
    task_yaml_path: Path
    repo_root: Path
    workspace_root: Path

    # Optional knobs.
    model: str = DEFAULT_MODEL
    tool_surface: tuple[str, ...] = DEFAULT_TOOL_SURFACE
    actor_id: str = "procurement-lab-factory-agents-sdk"
    # Per-run sentinel SHA for repo:// URIs emitted before the
    # artifact-containing commit lands. The post-commit finalize step
    # (scripts/finalize_sandbox_ref.py) rewrites these once the SHA is
    # known. Keeping PENDING in stub mode means we never lie about a
    # commit that does not yet exist.
    pending_sha_placeholder: str = SANDBOX_PENDING_PLACEHOLDER

    # Cached on first call so manifest/checkpoint paths agree.
    _event_ledger_path: Path = field(init=False, default=Path())
    _manifest_path: Path = field(init=False, default=Path())
    _checkpoint_path: Path = field(init=False, default=Path())
    _run_record_path: Path = field(init=False, default=Path())
    _prompt_hash: str = field(init=False, default="")
    _tool_hash: str = field(init=False, default="")

    def __post_init__(self) -> None:
        self.repo_root = self.repo_root.resolve()
        self.task_yaml_path = self.task_yaml_path.resolve()
        self.workspace_root = self.workspace_root.resolve()
        self._event_ledger_path = (
            self.repo_root / EVENT_LEDGER_DIRNAME / f"{self.run_id}.jsonl"
        )
        self._manifest_path = (
            self.repo_root
            / SANDBOX_MANIFEST_DIRNAME
            / f"{self.run_id}.json"
        )
        self._checkpoint_path = (
            self.repo_root
            / CHECKPOINT_DIRNAME
            / f"{self.run_id}.runstate.json"
        )
        self._run_record_path = (
            self.repo_root / RUN_RECORDS_DIRNAME / f"{self.run_id}.json"
        )

    # ------------------------------------------------------------ properties

    @property
    def event_ledger_path(self) -> Path:
        return self._event_ledger_path

    @property
    def manifest_path(self) -> Path:
        return self._manifest_path

    @property
    def checkpoint_path(self) -> Path:
        return self._checkpoint_path

    @property
    def run_record_path(self) -> Path:
        return self._run_record_path

    def is_live_mode(self) -> bool:
        """Live mode requires BOTH the SDK package and an API key."""
        return _SDK_AVAILABLE and bool(os.environ.get("OPENAI_API_KEY"))

    # ------------------------------------------------------------ refs

    def _sandbox_manifest_ref(self) -> str:
        """Return a ``repo://`` URI for the manifest file.

        Uses the PENDING placeholder during emission; ``finalize_sandbox_ref``
        rewrites the SHA after the commit lands.
        """
        # The placeholder is repo://<repo>@PENDING/ ; we tack on the relative
        # path manually so the grammar stays consistent.
        rel = f"{SANDBOX_MANIFEST_DIRNAME}/{self.run_id}.json"
        return f"{self.pending_sha_placeholder}{rel}"

    def _checkpoint_ref(self) -> str:
        rel = f"{CHECKPOINT_DIRNAME}/{self.run_id}.runstate.json"
        return f"{self.pending_sha_placeholder}{rel}"

    def _sandbox_image_ref(self) -> str:
        """Return a ``repo://`` URI for the workspace root.

        Stub mode uses the PENDING placeholder so the post-commit finalize
        step can backfill the SHA once the regeneration commit lands.
        """
        return self.pending_sha_placeholder

    # ------------------------------------------------------------ manifest

    def build_manifest(self) -> dict[str, Any]:
        """Build the manifest body without writing it.

        Exposed separately so tests can mutate fields and assert the
        validator catches malformed shapes.
        """
        manifest: dict[str, Any] = {
            "manifest_version": MANIFEST_VERSION,
            "runtime_provider": RUNTIME_PROVIDER,
            "model": self.model,
            "mounts": [
                {
                    "src": _as_posix(self.repo_root),
                    "dst": "/workspace",
                    "mode": "rw",
                },
                {
                    "src": _as_posix(self.task_yaml_path),
                    "dst": "/workspace/task.yaml",
                    "mode": "ro",
                },
            ],
            "env_refs": ["OPENAI_API_KEY"],
            "tool_surface": [
                {"tool_name": name} for name in self.tool_surface
            ],
            "created_at": _now_iso_microseconds(),
        }
        return manifest

    def emit_manifest(self) -> Path:
        """Write a sandbox-manifest.schema.json-conformant manifest.

        Always callable. Validates against the cached schema BEFORE
        writing so a malformed shape never reaches disk.
        """
        manifest = self.build_manifest()
        _validate(manifest, "sandbox-manifest.schema.json", self.repo_root)
        self._manifest_path.parent.mkdir(parents=True, exist_ok=True)
        self._manifest_path.write_text(
            json.dumps(manifest, sort_keys=True, indent=2, ensure_ascii=False)
            + "\n",
            encoding="utf-8",
        )
        return self._manifest_path

    # ------------------------------------------------------------ checkpoint

    def build_initial_checkpoint(self) -> dict[str, Any]:
        """Build the pre-execution RunState-shaped checkpoint body.

        The exact serialization of the SDK's RunState is provider-specific
        (Phase 1 notes the docs surface ``client.deserialize_session_state``
        but not a public ``RunState.to_json``). For stub mode we record an
        envelope with enough metadata for a downstream consumer to know
        what runtime + run produced it and which mode the adapter was in.
        """
        return {
            "schema_version": 1,
            "run_id": self.run_id,
            "mode": "stub" if not self.is_live_mode() else "live",
            "runtime_provider": RUNTIME_PROVIDER,
            "created_at": _now_iso_microseconds(),
            "session_state": None,
            "run_state": None,
            "notes": (
                "Initial pre-execution checkpoint. Live mode overwrites "
                "this file on each checkpoint.paused event with the "
                "serialized session_state + RunState payload from the "
                "Agents SDK runner."
            ),
        }

    def emit_initial_checkpoint(self) -> Path:
        """Write the initial RunState-shaped checkpoint."""
        checkpoint = self.build_initial_checkpoint()
        self._checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
        self._checkpoint_path.write_text(
            json.dumps(checkpoint, sort_keys=True, indent=2, ensure_ascii=False)
            + "\n",
            encoding="utf-8",
        )
        return self._checkpoint_path

    # ------------------------------------------------------------ events

    def _emit_event(
        self,
        *,
        event_type: str,
        payload: Mapping[str, Any],
        parent_event_id: str | None = None,
    ) -> dict[str, Any]:
        event = make_event(
            event_type=event_type,
            actor_kind="system",
            actor_id=self.actor_id,
            payload=payload,
            run_id=self.run_id,
            parent_event_id=parent_event_id,
        )
        emit_event(event, self._event_ledger_path)
        return event

    # ------------------------------------------------------------ run

    # ------------------------------------------------------------ hashes

    def compute_prompt_hash(self) -> str:
        """SHA-256 over the canonicalized task YAML body.

        The Agents-SDK adapter has no separate system prompt of its own;
        the task YAML body IS the prompt the runtime drives off.
        """
        prompt_text = self.task_yaml_path.read_text(encoding="utf-8")
        return compute_sha256(canonicalize_prompt(prompt_text))

    def compute_tool_surface_hash(self) -> str:
        """SHA-256 over the canonicalized tool + gate surface.

        The adapter does not run gates itself in stub mode, but the
        tool surface still includes the canonical worker vocabulary so
        the hash matches the same input shape as the factory pipeline's
        emitter. Pass an empty gates list to keep the hash dependent
        only on the worker surface in stub mode.
        """
        return compute_sha256(
            canonicalize_tool_surface(list(self.tool_surface), [])
        )

    def run(self) -> dict[str, Any]:
        """Execute the adapter. Returns a Run record dict.

        Stub and live mode both go through the same artifact-emission
        prelude (manifest + initial checkpoint + setup events) so the
        artifact wiring is exercised on every code path.
        """
        started_at = _now_iso_microseconds()

        manifest_path = self.emit_manifest()
        checkpoint_path = self.emit_initial_checkpoint()

        prompt_hash = self.compute_prompt_hash()
        tool_hash = self.compute_tool_surface_hash()

        # pipeline.start lands first so cross-check 1/2 in
        # validate_run_evidence can pair the recorded hashes against
        # the Run record at validate time.
        self._emit_event(
            event_type="pipeline.start",
            payload={
                "prompt_snapshot_hash": prompt_hash,
                "tool_schemas_snapshot_hash": tool_hash,
            },
        )

        # Sandbox-manifest-recorded event lands next so the ledger
        # carries the manifest pointer even if a later step blows up.
        self._emit_event(
            event_type="sandbox.manifest.recorded",
            payload={
                "manifest_path": _as_posix(manifest_path),
                "manifest_ref": self._sandbox_manifest_ref(),
                "runtime_provider": RUNTIME_PROVIDER,
            },
        )
        self._emit_event(
            event_type="runstate.checkpoint.persisted",
            payload={
                "checkpoint_path": _as_posix(checkpoint_path),
                "checkpoint_ref": self._checkpoint_ref(),
                "checkpoint_kind": "initial",
            },
        )

        # Stash the hashes on instance so _run_stub / _run_live can
        # write them into the Run record without recomputing.
        self._prompt_hash = prompt_hash
        self._tool_hash = tool_hash

        if not _SDK_AVAILABLE:
            LOGGER.warning(
                "openai_agents_runtime: openai-agents package not "
                "installed; falling back to stub mode."
            )
            self._emit_event(
                event_type="runtime.agents_sdk.unavailable",
                payload={
                    "reason": "package_missing",
                    "fallback": "stub",
                },
            )
            return self._run_stub(
                manifest_path, checkpoint_path, started_at
            )

        if not self.is_live_mode():
            return self._run_stub(
                manifest_path, checkpoint_path, started_at
            )

        return self._run_live(manifest_path, checkpoint_path, started_at)

    # ------------------------------------------------------------ stub

    def _run_stub(
        self,
        manifest_path: Path,
        checkpoint_path: Path,
        started_at: str,
    ) -> dict[str, Any]:
        """Emit the stub-mode event + synthetic pipeline.complete + Run record."""
        del manifest_path, checkpoint_path  # paths already captured on self.

        self._emit_event(
            event_type="runtime.agents_sdk.stub_mode",
            payload={
                "reason": (
                    "no_api_key"
                    if _SDK_AVAILABLE
                    else "package_missing"
                ),
                "manifest_ref": self._sandbox_manifest_ref(),
                "checkpoint_ref": self._checkpoint_ref(),
            },
        )

        # Synthetic pipeline.complete with an empty gate summary. The
        # adapter does not run gates in stub mode; downstream consumers
        # should treat absence of gate.check.* events for this run_id as
        # "no gates exercised".
        gate_results_summary = {
            "gates_passed": [],
            "gates_failed": [],
            "all_passed": True,
        }
        self._emit_event(
            event_type="pipeline.complete",
            payload={
                "status": "done",
                "gate_results_summary": gate_results_summary,
            },
        )

        # gate.run.evidence_recorded is the terminal event the validator
        # requires for every status==done Run. The fields_populated list
        # MUST match the replay-equivalence fields actually populated on
        # the Run record we are about to write.
        fields_populated = [
            "prompt_snapshot_hash",
            "tool_schemas_snapshot_hash",
            "checkpoint_ref",
            "sandbox_image_ref",
            "gate_results_summary",
        ]
        self._emit_event(
            event_type="gate.run.evidence_recorded",
            payload={
                "run_id": self.run_id,
                "fields_populated": fields_populated,
            },
        )

        finished_at = _now_iso_microseconds()
        run_record = self._build_run_record(
            status="done",
            started_at=started_at,
            finished_at=finished_at,
            gate_results_summary=gate_results_summary,
        )
        emit_run(run_record, self._run_record_path)
        return run_record

    # ------------------------------------------------------------ live

    def _run_live(
        self,
        manifest_path: Path,
        checkpoint_path: Path,
        started_at: str,
    ) -> dict[str, Any]:
        """Execute the Agents SDK runner. Network reachable only in live mode.

        This path is intentionally not exercised by CI. The next workflow
        installs ``openai-agents`` and validates the live shape against
        an actual API key. We keep the body small and explicit so the
        live-mode contract is auditable.
        """
        # Guard: callers can only reach here when is_live_mode() is true,
        # which already checks _SDK_AVAILABLE. Re-asserting keeps mypy
        # happy and gives a clear error if someone refactors the guards.
        if not _SDK_AVAILABLE:  # pragma: no cover - defensive
            raise RuntimeError(
                "openai_agents_runtime._run_live called without SDK"
            )
        if not os.environ.get("OPENAI_API_KEY"):  # pragma: no cover
            raise RuntimeError(
                "openai_agents_runtime._run_live called without "
                "OPENAI_API_KEY"
            )

        # Live-mode construction. The exact constructor names follow the
        # openai-agents 0.17.4 surface documented in Phase 1; if a
        # version bump changes the shape, that's caught by the next
        # workflow when it installs the package and runs the live demo.
        manifest_body = json.loads(
            self._manifest_path.read_text(encoding="utf-8")
        )
        # ``_SDKManifest`` is the agents.sandbox.Manifest class; we
        # build it from the validated body so the SDK constructor sees
        # the same shape that landed in ops/sandbox-manifests/.
        sdk_manifest = _SDKManifest(**manifest_body)  # type: ignore[misc]
        sandbox_run_config = SandboxRunConfig(  # type: ignore[misc]
            session_state=None,
        )
        agent = SandboxAgent(  # type: ignore[misc]
            default_manifest=sdk_manifest,
            base_instructions=(
                "Procurement-lab factory task. Follow the task YAML."
            ),
        )

        # Emit a started event so the ledger records the live call shape.
        started_event = self._emit_event(
            event_type="tool.call.started",
            payload={
                "tool_name": "agents_sdk.runner",
                "args": {
                    "manifest_path": _as_posix(manifest_path),
                    "checkpoint_path": _as_posix(checkpoint_path),
                },
            },
        )

        # Runner.run is async in the documented surface; we use the
        # sync wrapper so the adapter does not need an asyncio loop.
        result = Runner.run_sync(  # type: ignore[union-attr]
            agent,
            self.task_yaml_path.read_text(encoding="utf-8"),
            run_config=sandbox_run_config,
        )

        self._emit_event(
            event_type="tool.call.completed",
            payload={
                "tool_name": "agents_sdk.runner",
                "result": {"status": "ok"},
            },
            parent_event_id=started_event["event_id"],
        )

        # Persist final session_state as a fresh checkpoint. The exact
        # serialization helper name is verified at live-mode workflow
        # time; we attempt to_json first, then model_dump, then a
        # repr-based fallback so the checkpoint always lands.
        self._persist_final_checkpoint(result)

        gate_results_summary = {
            "gates_passed": [],
            "gates_failed": [],
            "all_passed": True,
        }
        self._emit_event(
            event_type="pipeline.complete",
            payload={
                "status": "done",
                "gate_results_summary": gate_results_summary,
            },
        )

        finished_at = _now_iso_microseconds()
        run_record = self._build_run_record(
            status="done",
            started_at=started_at,
            finished_at=finished_at,
            gate_results_summary=gate_results_summary,
        )
        emit_run(run_record, self._run_record_path)
        return run_record

    def _persist_final_checkpoint(self, result: Any) -> None:  # pragma: no cover - live only
        """Serialize whatever the runner exposes into the checkpoint file.

        Phase 1 notes the live SDK exposes ``client.deserialize_session_state``
        but no canonical public ``RunState.to_json``. We try a small ladder
        of serialization helpers and fall back to ``repr`` so the checkpoint
        always lands; the live-mode workflow tightens the contract once
        the exact method is known.
        """
        session_state_payload: Any = None
        run_state_payload: Any = None
        for attr in ("to_json", "model_dump_json", "model_dump"):
            fn = getattr(result, attr, None)
            if callable(fn):
                try:
                    run_state_payload = fn()
                except Exception:  # noqa: BLE001 - best-effort fallback
                    continue
                break
        if run_state_payload is None:
            run_state_payload = repr(result)
        checkpoint = {
            "schema_version": 1,
            "run_id": self.run_id,
            "mode": "live",
            "runtime_provider": RUNTIME_PROVIDER,
            "created_at": _now_iso_microseconds(),
            "session_state": session_state_payload,
            "run_state": run_state_payload,
            "notes": "Final post-run checkpoint.",
        }
        self._checkpoint_path.write_text(
            json.dumps(checkpoint, sort_keys=True, indent=2, ensure_ascii=False)
            + "\n",
            encoding="utf-8",
        )

    # ------------------------------------------------------------ run record

    def _build_run_record(
        self,
        *,
        status: str,
        started_at: str,
        finished_at: str,
        gate_results_summary: Mapping[str, Any],
    ) -> dict[str, Any]:
        """Construct the Run record dict.

        Populates ``sandbox_manifest_ref`` and ``checkpoint_ref`` with
        repo:// URIs containing the PENDING placeholder. The post-commit
        finalize step rewrites both refs to carry the real SHA once the
        regeneration commit lands.

        Includes ``prompt_snapshot_hash`` and ``tool_schemas_snapshot_hash``
        so the validator's done-run cross-checks 1+2 pair the recorded
        Run against the pipeline.start event the adapter emitted.
        """
        record: dict[str, Any] = {
            "id": self.run_id,
            "spec_id": _as_posix(self.task_yaml_path),
            "agent_id": "procurement-lab-factory@openai-agents-sdk",
            "runtime": RUNTIME_PROVIDER,
            "workspace_id": REPO_NAME,
            "started_at": started_at,
            "finished_at": finished_at,
            "status": status,
            "inputs": [
                {
                    "kind": "task",
                    "ref": self._task_input_ref(),
                }
            ],
            "outputs": [],
            "events": [],
            "prompt_snapshot_hash": self._prompt_hash,
            "tool_schemas_snapshot_hash": self._tool_hash,
            "sandbox_image_ref": self._sandbox_image_ref(),
            "sandbox_manifest_ref": self._sandbox_manifest_ref(),
            "checkpoint_ref": self._checkpoint_ref(),
            "gate_results_summary": dict(gate_results_summary),
        }
        return record

    def _task_input_ref(self) -> str:
        """Return a repo:// URI for the task YAML.

        Uses the PENDING placeholder and the path relative to the repo
        root. Stays POSIX-formed per Round 5.
        """
        try:
            rel = self.task_yaml_path.resolve().relative_to(self.repo_root)
            rel_str = rel.as_posix()
        except ValueError:
            # Task path lives outside the repo; surface the absolute
            # POSIX form as a fallback so the consumer can still resolve
            # it (the validator tolerates legacy paths).
            return _as_posix(self.task_yaml_path)
        return f"{self.pending_sha_placeholder}{rel_str}"


# ----------------------------------------------------------------- replay


def rehydrate_from_run_record(
    run_record_path: Path,
    *,
    repo_root: Path | None = None,
) -> AgentsSDKRuntimeAdapter:
    """Build an adapter from a recorded Run record.

    Used by ``scripts/replay_run.py --mode agents-sdk`` to reconstruct
    the adapter state from a previously-emitted Run record + sandbox
    manifest. The replay then re-runs the adapter (in stub mode unless
    the live env vars are set) and compares the resulting refs against
    the recorded ones.
    """
    run = json.loads(run_record_path.read_text(encoding="utf-8"))
    run_id = run.get("id")
    if not isinstance(run_id, str) or not run_id:
        raise ValueError(
            f"rehydrate_from_run_record: missing id in {run_record_path}"
        )
    repo_root_resolved = (
        repo_root.resolve() if repo_root is not None else REPO_ROOT_DEFAULT
    )
    task_path: Path | None = None
    for entry in run.get("inputs") or []:
        if isinstance(entry, dict) and entry.get("kind") == "task":
            ref = entry.get("ref")
            if isinstance(ref, str) and ref:
                # Resolve repo:// URI to a local path or fall through.
                from procurement_lab.run_evidence import resolve_uri

                resolved = resolve_uri(
                    ref,
                    portfolio_root=repo_root_resolved.parent,
                )
                if resolved is not None:
                    task_path = resolved
                break
    if task_path is None:
        raise ValueError(
            f"rehydrate_from_run_record: no task input in {run_record_path}"
        )
    return AgentsSDKRuntimeAdapter(
        run_id=run_id,
        task_yaml_path=task_path,
        repo_root=repo_root_resolved,
        workspace_root=repo_root_resolved,
    )


# ----------------------------------------------------------------- CLI helper


def run_once(
    *,
    run_id: str | None = None,
    task_yaml_path: Path,
    repo_root: Path,
    workspace_root: Path,
) -> dict[str, Any]:
    """Convenience entry point used by the stub-mode demo.

    Generates a fresh run_id when none is supplied so the demo CLI
    invocation stays a single line.
    """
    if run_id is None:
        run_id = f"run-agentsdk-{uuid.uuid4().hex[:12]}"
    adapter = AgentsSDKRuntimeAdapter(
        run_id=run_id,
        task_yaml_path=task_yaml_path,
        repo_root=repo_root,
        workspace_root=workspace_root,
    )
    return adapter.run()
