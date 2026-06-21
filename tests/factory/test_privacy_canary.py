"""Privacy-canary property test for active-MVP task metadata.

Covers: R-FAM-V1-043.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from scripts.factory.artifacts import ArtifactStore
from scripts.factory.pipeline import run_pipeline
from scripts.factory.state import Store
from scripts.factory.task import (
    ExpectedArtifact,
    GateSpec,
    ModuleMapEntry,
    PRSpec,
    ReviewSpec,
    Task,
)
from scripts.factory.workers import WorkerResult

from .conftest import LedgerDirs, init_git_repo

CANARY = "SEC{2e6f7f9a-793e-44af-8f15-e9ee01d7a637}"


class RecordingWorker:
    """Test worker that records prompts and writes the v0.1 artifact set."""

    def __init__(self, name: str, prompts: list[str]) -> None:
        self.name = name
        self._prompts = prompts

    def run(self, prompt: str, *, cwd: Path, timeout: int = 1800) -> WorkerResult:
        del timeout
        self._prompts.append(prompt)
        if self.name == "planner":
            return WorkerResult(
                ok=True,
                stdout=(
                    "1. CREATE PRODUCT_BRIEF.md -- product framing\n"
                    "2. CREATE SYSTEM_MAP.md -- module map\n"
                    "3. CREATE STATUS.md -- lifecycle state\n"
                    "4. CREATE src/binding_constraint/cli.py -- CLI module\n"
                    "5. CREATE reports/privacy-canary.jsonl -- sample report\n\n"
                    "FILES TO CREATE:\n"
                    "- PRODUCT_BRIEF.md\n"
                    "- SYSTEM_MAP.md\n"
                    "- STATUS.md\n"
                    "- src/binding_constraint/cli.py\n"
                    "- reports/privacy-canary.jsonl\n\n"
                    "FILES THAT MUST NOT BE MODIFIED:\n"
                    "- specs/0001-foundation/requirements.md\n\n"
                    "Riskiest decision: keeping the first slice narrow."
                ),
                metadata={"duration_ms": 0},
            )
        if self.name == "implementer":
            _write_active_repo_files(cwd)
            return WorkerResult(
                ok=True,
                stdout="created active-MVP files",
                metadata={"duration_ms": 0},
            )
        return WorkerResult(
            ok=True,
            stdout="STATUS: CLEAN\nFINDINGS:\n- contract files present",
            metadata={"duration_ms": 0},
        )


def _write_active_repo_files(root: Path) -> None:
    (root / "src" / "binding_constraint").mkdir(parents=True, exist_ok=True)
    (root / "reports").mkdir(parents=True, exist_ok=True)
    (root / "PRODUCT_BRIEF.md").write_text(
        "# Binding Constraint\n\n"
        "Serves grid analysts deciding whether a queued load creates a likely constraint.\n",
        encoding="utf-8",
    )
    (root / "SYSTEM_MAP.md").write_text(
        "# System Map\n\n"
        "- `src/binding_constraint/cli.py`: `main(argv: list[str] | None) -> int`\n",
        encoding="utf-8",
    )
    (root / "STATUS.md").write_text(
        "# Status\n\n"
        "## Current state\n"
        "v0.1 writes a fixture report.\n\n"
        "## Known limits\n"
        "- Fixture inputs only.\n\n"
        "## Next feature queue\n"
        "- Add real queue ingestion.\n",
        encoding="utf-8",
    )
    (root / "src" / "binding_constraint" / "cli.py").write_text(
        "def main(argv: list[str] | None = None) -> int:\n    del argv\n    return 0\n",
        encoding="utf-8",
    )
    (root / "reports" / "privacy-canary.jsonl").write_text(
        json.dumps({"scenario": "fixture", "risk": "low"}) + "\n",
        encoding="utf-8",
    )


def _make_task(repo: Path) -> Task:
    return Task(
        id="privacy-canary",
        title="privacy canary active task",
        target_repo=str(repo),
        goal="Ship the binding-constraint v0.1 fixture report.",
        base_branch="main",
        active=True,
        template="data-report",
        product_vision=f"internal operator note {CANARY}",
        target_user=f"grid planning analyst {CANARY}",
        first_user_action=f"run validation without exposing {CANARY}",
        system_layers=["cli", "report"],
        expected_artifacts=[
            ExpectedArtifact(path="PRODUCT_BRIEF.md"),
            ExpectedArtifact(path="SYSTEM_MAP.md"),
            ExpectedArtifact(path="STATUS.md"),
            ExpectedArtifact(path="src/binding_constraint/cli.py"),
            ExpectedArtifact(path="reports/*.jsonl", kind="glob"),
        ],
        module_map=[
            ModuleMapEntry(
                name="cli",
                source="src/binding_constraint/cli.py",
                layer="cli",
                public_interfaces=["main(argv: list[str] | None) -> int"],
            )
        ],
        gates=[GateSpec(cmd='python -c "exit(0)"', name="noop")],
        review=ReviewSpec(
            reviewer="privacy-review",
            reviewers=["privacy-review"],
            max_patch_rounds=1,
        ),
        pr=PRSpec(open=False),
        planner="privacy-planner",
        implementer="privacy-implementer",
    )


def _all_text_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    out: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file() or ".git" in path.parts:
            continue
        out.append(path)
    return out


def _read_lossy(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def _assert_canary_absent(label: str, value: Any) -> None:
    text = value if isinstance(value, str) else json.dumps(value, sort_keys=True)
    assert CANARY not in text, f"privacy canary leaked through {label}"


def test_active_task_metadata_canary_does_not_leak_to_persisted_sinks(
    tmp_path: Path,
    monkeypatch,
    _redirect_run_evidence_dirs: LedgerDirs,
) -> None:
    repo = tmp_path / "binding-constraint"
    init_git_repo(repo)
    prompts: list[str] = []

    def fake_resolve_worker(name: str, *, allow_stub_fallback: bool = True):
        del allow_stub_fallback
        if name == "privacy-planner":
            return RecordingWorker("planner", prompts)
        if name == "privacy-implementer":
            return RecordingWorker("implementer", prompts)
        if name == "privacy-review":
            return RecordingWorker("reviewer", prompts)
        raise AssertionError(f"unexpected worker: {name}")

    import scripts.factory.pipeline as pipeline_module

    monkeypatch.setattr(pipeline_module, "resolve_worker", fake_resolve_worker)

    artifact_store = ArtifactStore(tmp_path / "artifacts")
    store = Store(tmp_path / "factory.db")
    try:
        result = run_pipeline(
            _make_task(repo),
            store=store,
            dry_run=False,
            artifact_store=artifact_store,
            spec_path="ops/factory-tasks/privacy-canary.yaml",
            event_ledger_dir=_redirect_run_evidence_dirs.events,
            run_records_dir=_redirect_run_evidence_dirs.records,
        )
        row = store.get_task("privacy-canary")
        event_rows = [event.__dict__ for event in store.events_for("privacy-canary")]
    finally:
        store.close()

    assert result.ok is True
    assert result.final_status == "done"
    assert row is not None and row.worktree_path is not None

    for idx, prompt in enumerate(prompts):
        _assert_canary_absent(f"worker prompt {idx}", prompt)

    _assert_canary_absent("sqlite event store", event_rows)

    for path in _all_text_files(_redirect_run_evidence_dirs.events):
        _assert_canary_absent(path.as_posix(), _read_lossy(path))
    for path in _all_text_files(_redirect_run_evidence_dirs.records):
        _assert_canary_absent(path.as_posix(), _read_lossy(path))
    for path in _all_text_files(_redirect_run_evidence_dirs.defects):
        _assert_canary_absent(path.as_posix(), _read_lossy(path))
    for path in _all_text_files(_redirect_run_evidence_dirs.handoffs):
        _assert_canary_absent(path.as_posix(), _read_lossy(path))
    for path in _all_text_files(artifact_store.root):
        _assert_canary_absent(path.as_posix(), _read_lossy(path))
    for path in _all_text_files(Path(row.worktree_path)):
        _assert_canary_absent(path.as_posix(), _read_lossy(path))
