"""Tests for the OpenAI Agents SDK runtime adapter.

These tests cover the adapter in isolation. Live SDK calls are mocked so
the test suite never reaches the OpenAI network. Stub mode is the
dominant path because that is what CI runs in.

Each test redirects the adapter's output directories under ``tmp_path``
via the adapter's ``repo_root`` parameter so the committed evidence
under ``ops/event-ledger/`` etc. stays untouched. The cached schemas
under ``ops/schemas-cache/`` are copied into the tmp repo root so the
adapter's validator path resolves.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

from procurement_lab.runtime import openai_agents_runtime as adapter_mod
from procurement_lab.runtime.openai_agents_runtime import (
    AgentsSDKRuntimeAdapter,
    rehydrate_from_run_record,
)

REAL_REPO_ROOT = Path(__file__).resolve().parents[2]
REAL_TASK_YAML = (
    REAL_REPO_ROOT / "ops" / "factory-tasks" / "example-rename-fc-count.yaml"
)


@pytest.fixture
def fake_repo(tmp_path: Path) -> Path:
    """Build a minimal repo skeleton with the cached schemas + a task YAML.

    The adapter only needs ``ops/schemas-cache/`` and the input task to
    work; the rest of the repo body is irrelevant. Copying the schemas
    rather than reaching back into the real repo keeps the test
    hermetic and the temp dir self-contained.
    """
    schemas_src = REAL_REPO_ROOT / "ops" / "schemas-cache"
    schemas_dst = tmp_path / "ops" / "schemas-cache"
    shutil.copytree(schemas_src, schemas_dst)

    task_src = REAL_TASK_YAML
    task_dst = tmp_path / "ops" / "factory-tasks" / task_src.name
    task_dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(task_src, task_dst)

    # Pre-create the emitter directories so a missing parent doesn't
    # surface as a path error inside the adapter (the adapter would
    # mkdir anyway, but creating them upfront mirrors a real repo).
    (tmp_path / "ops" / "event-ledger").mkdir(parents=True, exist_ok=True)
    (tmp_path / "ops" / "run-records").mkdir(parents=True, exist_ok=True)
    (tmp_path / "ops" / "sandbox-manifests").mkdir(parents=True, exist_ok=True)
    (tmp_path / "ops" / "checkpoints").mkdir(parents=True, exist_ok=True)

    return tmp_path


@pytest.fixture(autouse=True)
def _clear_schema_cache() -> None:
    """The adapter caches schemas at module scope. Reset before each test."""
    adapter_mod._SCHEMA_CACHE.clear()


def _make_adapter(repo_root: Path, run_id: str = "run-adapter-test") -> AgentsSDKRuntimeAdapter:
    task = repo_root / "ops" / "factory-tasks" / REAL_TASK_YAML.name
    return AgentsSDKRuntimeAdapter(
        run_id=run_id,
        task_yaml_path=task,
        repo_root=repo_root,
        workspace_root=repo_root,
    )


# ----------------------------------------------------------------- positive


def test_stub_mode_emits_manifest_checkpoint_and_run_record(
    fake_repo: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Happy path: stub mode produces all four artifacts in conformant shape."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    adapter = _make_adapter(fake_repo)
    result = adapter.run()

    # Manifest landed.
    assert adapter.manifest_path.is_file()
    manifest = json.loads(adapter.manifest_path.read_text(encoding="utf-8"))
    assert manifest["runtime_provider"] == "openai-agents-sdk"
    assert manifest["manifest_version"] == "1.0.0"
    assert any(m["mode"] == "rw" for m in manifest["mounts"])

    # Initial checkpoint landed.
    assert adapter.checkpoint_path.is_file()
    checkpoint = json.loads(adapter.checkpoint_path.read_text(encoding="utf-8"))
    assert checkpoint["mode"] == "stub"
    assert checkpoint["run_id"] == adapter.run_id

    # Ledger has the expected sequence of event types.
    ledger_lines = adapter.event_ledger_path.read_text(
        encoding="utf-8"
    ).splitlines()
    event_types = [json.loads(line)["type"] for line in ledger_lines if line]
    assert "pipeline.start" in event_types
    assert "sandbox.manifest.recorded" in event_types
    assert "runstate.checkpoint.persisted" in event_types
    assert "runtime.agents_sdk.stub_mode" in event_types
    assert "pipeline.complete" in event_types
    assert "gate.run.evidence_recorded" in event_types

    # Run record is conformant and carries both new refs.
    assert adapter.run_record_path.is_file()
    run = json.loads(adapter.run_record_path.read_text(encoding="utf-8"))
    assert run["id"] == adapter.run_id
    assert run["status"] == "done"
    assert run["sandbox_manifest_ref"].startswith("repo://")
    assert "ops/sandbox-manifests/" in run["sandbox_manifest_ref"]
    assert run["checkpoint_ref"].startswith("repo://")
    assert "ops/checkpoints/" in run["checkpoint_ref"]
    assert run["sandbox_manifest_ref"].endswith(f"{adapter.run_id}.json")
    assert run["checkpoint_ref"].endswith(
        f"{adapter.run_id}.runstate.json"
    )

    # Returned dict matches the written record body.
    assert result["id"] == run["id"]
    assert result["sandbox_manifest_ref"] == run["sandbox_manifest_ref"]


def test_stub_mode_run_record_validates_against_schema(
    fake_repo: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The Run record the adapter writes must pass run.schema.json."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    import jsonschema

    adapter = _make_adapter(fake_repo, run_id="run-adapter-schemavalid")
    adapter.run()
    run = json.loads(adapter.run_record_path.read_text(encoding="utf-8"))

    schema_path = fake_repo / "ops" / "schemas-cache" / "run.schema.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    jsonschema.validate(instance=run, schema=schema)


def test_stub_mode_manifest_validates_against_schema(
    fake_repo: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The sandbox manifest the adapter writes must pass its schema."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    import jsonschema

    adapter = _make_adapter(fake_repo, run_id="run-adapter-manifestvalid")
    adapter.run()
    manifest = json.loads(adapter.manifest_path.read_text(encoding="utf-8"))

    schema_path = (
        fake_repo / "ops" / "schemas-cache" / "sandbox-manifest.schema.json"
    )
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    jsonschema.validate(instance=manifest, schema=schema)


def test_stub_mode_fields_populated_matches_replay_equivalence_fields(
    fake_repo: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Validator cross-check 3: fields_populated must equal Run replay fields."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    adapter = _make_adapter(fake_repo, run_id="run-adapter-crosscheck")
    adapter.run()

    run = json.loads(adapter.run_record_path.read_text(encoding="utf-8"))
    REPLAY_FIELDS = (
        "prompt_snapshot_hash",
        "tool_schemas_snapshot_hash",
        "determinism",
        "checkpoint_ref",
        "sandbox_image_ref",
        "gate_results_summary",
    )
    actually_in_run = sorted(name for name in REPLAY_FIELDS if name in run)

    ledger_lines = adapter.event_ledger_path.read_text(
        encoding="utf-8"
    ).splitlines()
    terminal_events = [
        json.loads(line)
        for line in ledger_lines
        if line
        and json.loads(line)["type"] == "gate.run.evidence_recorded"
    ]
    assert terminal_events, "expected exactly one terminal event"
    recorded_fields = sorted(terminal_events[-1]["payload"]["fields_populated"])
    assert recorded_fields == actually_in_run


# ----------------------------------------------------------------- negative


def test_malformed_manifest_is_caught_before_write(
    fake_repo: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A manifest missing required fields raises ValueError BEFORE any write."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    adapter = _make_adapter(fake_repo, run_id="run-adapter-badmanifest")

    # Wedge the build_manifest path so it returns an invalid shape.
    def _bad_manifest() -> dict[str, object]:
        return {
            "manifest_version": "1.0.0",
            "runtime_provider": "openai-agents-sdk",
            # Intentionally omit `model`, `mounts`, `tool_surface`.
        }

    monkeypatch.setattr(adapter, "build_manifest", _bad_manifest)

    with pytest.raises(ValueError, match="sandbox-manifest.schema.json"):
        adapter.emit_manifest()

    # The malformed manifest must not have landed on disk.
    assert not adapter.manifest_path.exists()


def test_manifest_with_bad_mount_mode_is_rejected(
    fake_repo: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A mount.mode outside {ro, rw} is caught by the schema validator."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    adapter = _make_adapter(fake_repo, run_id="run-adapter-badmount")

    def _bad_manifest() -> dict[str, object]:
        m = adapter.__class__.build_manifest(adapter)
        m["mounts"][0]["mode"] = "rwx"  # not in the enum
        return m

    monkeypatch.setattr(adapter, "build_manifest", _bad_manifest)

    with pytest.raises(ValueError, match="sandbox-manifest.schema.json"):
        adapter.emit_manifest()


# ----------------------------------------------------------------- stub vs live


def test_is_live_mode_requires_both_sdk_and_api_key(
    fake_repo: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Live mode is true only when BOTH the SDK and the key are present."""
    adapter = _make_adapter(fake_repo)

    # No SDK, no key.
    monkeypatch.setattr(adapter_mod, "_SDK_AVAILABLE", False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    assert adapter.is_live_mode() is False

    # SDK, no key.
    monkeypatch.setattr(adapter_mod, "_SDK_AVAILABLE", True)
    assert adapter.is_live_mode() is False

    # SDK + key.
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    assert adapter.is_live_mode() is True

    # No SDK + key (still false).
    monkeypatch.setattr(adapter_mod, "_SDK_AVAILABLE", False)
    assert adapter.is_live_mode() is False


def test_no_api_key_falls_back_to_stub(
    fake_repo: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """When the key is absent, run() takes the stub path even if SDK is present."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(adapter_mod, "_SDK_AVAILABLE", True)

    adapter = _make_adapter(fake_repo, run_id="run-adapter-stubpath")
    result = adapter.run()

    # Stub-mode event landed.
    ledger_lines = adapter.event_ledger_path.read_text(
        encoding="utf-8"
    ).splitlines()
    event_types = {json.loads(line)["type"] for line in ledger_lines if line}
    assert "runtime.agents_sdk.stub_mode" in event_types
    assert result["status"] == "done"


def test_live_mode_invokes_runner_run_sync_when_key_present(
    fake_repo: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """With key + mocked SDK, run() takes the live path and calls Runner.run_sync.

    The SDK itself is not installed in CI; we monkeypatch fake stand-ins
    into the adapter module so the live branch executes and the mocks
    record that they were called. No network goes out.
    """
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setattr(adapter_mod, "_SDK_AVAILABLE", True)

    calls: dict[str, int] = {"run_sync": 0, "manifest_init": 0}

    class FakeManifest:
        def __init__(self, **kwargs: object) -> None:
            calls["manifest_init"] += 1
            self.kwargs = kwargs

    class FakeSandboxRunConfig:
        def __init__(self, **kwargs: object) -> None:
            self.kwargs = kwargs

    class FakeSandboxAgent:
        def __init__(self, **kwargs: object) -> None:
            self.kwargs = kwargs

    class FakeResult:
        def model_dump(self) -> dict[str, object]:
            return {"ok": True, "mock": "fake-runner-result"}

    class FakeRunner:
        @staticmethod
        def run_sync(agent: object, prompt: str, **kwargs: object) -> object:
            calls["run_sync"] += 1
            return FakeResult()

    monkeypatch.setattr(adapter_mod, "_SDKManifest", FakeManifest)
    monkeypatch.setattr(adapter_mod, "SandboxRunConfig", FakeSandboxRunConfig)
    monkeypatch.setattr(adapter_mod, "SandboxAgent", FakeSandboxAgent)
    monkeypatch.setattr(adapter_mod, "Runner", FakeRunner)

    adapter = _make_adapter(fake_repo, run_id="run-adapter-livepath")
    result = adapter.run()

    assert calls["run_sync"] == 1
    assert calls["manifest_init"] == 1
    # Live mode still produces a conformant Run record + writes the
    # final checkpoint with mode=live.
    assert result["status"] == "done"
    final_checkpoint = json.loads(
        adapter.checkpoint_path.read_text(encoding="utf-8")
    )
    assert final_checkpoint["mode"] == "live"
    # Ledger should NOT carry the stub_mode marker on the live path.
    event_types = {
        json.loads(line)["type"]
        for line in adapter.event_ledger_path.read_text(
            encoding="utf-8"
        ).splitlines()
        if line
    }
    assert "runtime.agents_sdk.stub_mode" not in event_types
    assert "tool.call.started" in event_types
    assert "tool.call.completed" in event_types


def test_sdk_unavailable_emits_unavailable_event_then_stub(
    fake_repo: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """When the SDK package is missing, run() emits unavailable + stub events."""
    monkeypatch.setattr(adapter_mod, "_SDK_AVAILABLE", False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    adapter = _make_adapter(fake_repo, run_id="run-adapter-nopackage")
    adapter.run()

    event_types = [
        json.loads(line)["type"]
        for line in adapter.event_ledger_path.read_text(
            encoding="utf-8"
        ).splitlines()
        if line
    ]
    assert "runtime.agents_sdk.unavailable" in event_types
    assert "runtime.agents_sdk.stub_mode" in event_types


# ----------------------------------------------------------------- rehydrate


def test_rehydrate_from_run_record_round_trip(
    fake_repo: Path, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """rehydrate builds an adapter that produces the same refs on rerun."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    adapter = _make_adapter(fake_repo, run_id="run-adapter-rehydrate")
    first = adapter.run()

    # The repo:// URI in the recorded inputs uses "procurement-negotiation-lab"
    # as the repo name; for the fake repo on disk, the directory name is
    # the tmp_path leaf (not "procurement-negotiation-lab"). To exercise
    # the rehydrate path without renaming the tmp dir, build a sibling
    # symlink. On Windows, symlinks may require admin; instead, monkey-
    # patch run_evidence.resolve_uri to point at the fake repo directly.
    from procurement_lab import run_evidence as re_mod

    def fake_resolve_uri(uri: str, portfolio_root: Path | None = None) -> Path | None:
        # Strip the repo:// prefix and append the inner path to fake_repo.
        if uri.startswith("repo://"):
            # repo://name@SHA/<rel>
            after = uri.split("/", 3)[-1]
            return fake_repo / after
        return Path(uri)

    monkeypatch.setattr(re_mod, "resolve_uri", fake_resolve_uri)

    rehydrated = rehydrate_from_run_record(
        adapter.run_record_path, repo_root=fake_repo
    )
    assert rehydrated.run_id == adapter.run_id

    # Running the rehydrated adapter again over-writes the artifacts;
    # the manifest_ref + checkpoint_ref must match.
    second = rehydrated.run()
    assert first["sandbox_manifest_ref"] == second["sandbox_manifest_ref"]
    assert first["checkpoint_ref"] == second["checkpoint_ref"]
