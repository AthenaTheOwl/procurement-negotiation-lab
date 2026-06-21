"""Defect log, handoff packet, and next-feature writer tests."""

from __future__ import annotations

import json
from pathlib import Path

from scripts.factory.defects import DefectEntry, append_defect, unresolved_defects
from scripts.factory.handoffs import write_handoff_packet
from scripts.factory.next_features import update_status_md
from scripts.factory.pipeline import run_pipeline
from scripts.factory.state import Store
from scripts.factory.task import GateSpec, PRSpec, ReviewSpec, Task

from .conftest import LedgerDirs, init_git_repo


def test_defect_log_appends_jsonl(tmp_path: Path) -> None:
    defects_dir = tmp_path / "defects"

    path = append_defect(
        "task-1",
        DefectEntry(
            kind="gate.failed",
            gate_or_finding="contract:expected-artifacts",
            round=0,
            phase="impl",
            persona="developer",
            summary="report missing",
        ),
        defects_dir,
    )

    assert path is not None and path.is_file()
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
    assert rows[0]["kind"] == "gate.failed"
    assert rows[0]["summary"] == "report missing"
    assert rows[0]["resolved_in_round"] is None
    assert rows[0]["ts"]


def test_unresolved_defects_filters_resolved_rows(tmp_path: Path) -> None:
    defects_dir = tmp_path / "defects"
    append_defect(
        "task-1",
        DefectEntry("gate.failed", "unit", 0, "impl", "dev", "open"),
        defects_dir,
    )
    append_defect(
        "task-1",
        DefectEntry("gate.failed", "unit", 0, "impl", "dev", "closed", 1),
        defects_dir,
    )

    assert [row["summary"] for row in unresolved_defects("task-1", defects_dir)] == ["open"]


def test_update_status_md_creates_sections_and_is_idempotent(tmp_path: Path) -> None:
    first = update_status_md(
        tmp_path,
        deferred_items=["Add CSV export"],
        open_defects=[{"summary": "wire validation command"}],
    )
    second = update_status_md(
        tmp_path,
        deferred_items=["Add CSV export"],
        open_defects=[{"summary": "wire validation command"}],
    )

    text = (tmp_path / "STATUS.md").read_text(encoding="utf-8")
    assert "## Current state" in text
    assert "## Known limits" in text
    assert "## Next feature queue" in text
    assert text.count("- Add CSV export") == 1
    assert text.count("- Resolve factory defect: wire validation command") == 1
    assert first == second


def test_write_handoff_packet_shape(tmp_path: Path) -> None:
    path = write_handoff_packet(
        task_id="task-1",
        title="ship v0",
        status="done",
        summary="done: branch factory/task-1",
        trace_id="abc123",
        target_repo=tmp_path,
        handoff_dir=tmp_path / "handoffs",
        triage="PASS",
        defects=[],
        next_items=["Add CSV export"],
    )

    text = path.read_text(encoding="utf-8")
    assert "# Handoff - task-1" in text
    assert "Status: done" in text
    assert "Triage: PASS" in text
    assert "## What shipped" in text
    assert "## What's next" in text
    assert "- Add CSV export" in text
    assert "## Pick up via" in text
    assert "## Blocked on" in text


def test_pipeline_dry_run_writes_success_handoff(
    tmp_path: Path, _redirect_run_evidence_dirs: LedgerDirs
) -> None:
    repo = tmp_path / "repo"
    init_git_repo(repo)
    task = Task(
        id="handoff-success",
        title="handoff success",
        target_repo=str(repo),
        goal="exercise handoff writer",
        gates=[GateSpec(cmd='python -c "exit(0)"', name="noop")],
        review=ReviewSpec(reviewer="stub", max_patch_rounds=1),
        pr=PRSpec(open=False),
        planner="stub",
        implementer="stub",
    )
    store = Store(tmp_path / "factory.db")
    try:
        result = run_pipeline(task, store=store, dry_run=True)
    finally:
        store.close()

    assert result.ok is True
    handoff = _redirect_run_evidence_dirs.handoffs / "handoff-success.md"
    assert handoff.is_file()
    text = handoff.read_text(encoding="utf-8")
    assert "Status: done" in text
    assert "Triage: PASS" in text


def test_pipeline_blocked_run_writes_defect_log_and_handoff(
    tmp_path: Path, _redirect_run_evidence_dirs: LedgerDirs
) -> None:
    repo = tmp_path / "repo"
    init_git_repo(repo)
    task = Task(
        id="handoff-blocked",
        title="handoff blocked",
        target_repo=str(repo),
        goal="create missing file",
        gates=[GateSpec(cmd='python -c "exit(0)"', name="noop")],
        review=ReviewSpec(reviewer="stub", max_patch_rounds=0),
        pr=PRSpec(open=False),
        planner="stub",
        implementer="stub",
    )
    store = Store(tmp_path / "factory.db")
    try:
        result = run_pipeline(task, store=store, dry_run=False)
    finally:
        store.close()

    assert result.ok is False
    assert result.triage == "HOLD"
    defect_log = _redirect_run_evidence_dirs.defects / "handoff-blocked.jsonl"
    handoff = _redirect_run_evidence_dirs.handoffs / "handoff-blocked.md"
    assert defect_log.is_file()
    assert handoff.is_file()
    assert "implementation-diff" in defect_log.read_text(encoding="utf-8")
    assert "Status: blocked" in handoff.read_text(encoding="utf-8")
