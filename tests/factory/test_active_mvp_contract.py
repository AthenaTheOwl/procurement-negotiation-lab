"""Active-MVP contract tests for spec 0019."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.factory.contract import (
    validate_active_repo_files,
    validate_expected_artifacts,
    validate_module_map,
)
from scripts.factory.pipeline import run_pipeline
from scripts.factory.state import Store
from scripts.factory.task import (
    ExpectedArtifact,
    GateSpec,
    ModuleMapEntry,
    PRSpec,
    ReviewSpec,
    Task,
    load_task,
)
from scripts.factory.triage import classify_terminal_state
from scripts.factory.workers import GateOutcome

from .conftest import LedgerDirs, init_git_repo


def _write(path: Path, contents: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents, encoding="utf-8")
    return path


def test_load_task_accepts_active_mvp_fields(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "active.yaml",
        """
id: fam-1
title: active repo
target_repo: /tmp/repo
goal: build the thing
active: true
template: data-report
product_vision: Helps grid planners see a binding constraint.
target_user: grid planning analyst
first_user_action: python -m binding_constraint validate
system_layers: [ingest, score]
expected_artifacts:
  - path: PRODUCT_BRIEF.md
  - path: reports/*.jsonl
    kind: glob
module_map:
  - name: cli
    source: src/binding_constraint/cli.py
    layer: ingest
    public_interfaces:
      - "main(argv: list[str]) -> int"
persona_reviews:
  - architecture
  - name: security
    reviewer: codex
triage_policy:
  investigate_on_advisory_gate_failure: false
""",
    )

    task = load_task(task_file)

    assert task.active is True
    assert task.template == "data-report"
    assert task.product_vision.startswith("Helps grid planners")
    assert task.expected_artifacts[1].kind == "glob"
    assert task.module_map[0].layer == "ingest"
    assert [review.name for review in task.persona_reviews] == [
        "architecture",
        "security",
    ]
    assert task.triage_policy.investigate_on_advisory_gate_failure is False


def test_load_task_requires_product_framing_when_active(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "missing-product.yaml",
        """
id: fam-2
title: active repo
target_repo: /tmp/repo
goal: build the thing
active: true
""",
    )

    with pytest.raises(ValueError, match="product_vision"):
        load_task(task_file)


def test_load_task_rejects_unknown_persona_review(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "persona.yaml",
        """
id: fam-3
title: active repo
target_repo: /tmp/repo
goal: build the thing
persona_reviews:
  - ux
""",
    )

    with pytest.raises(ValueError, match="unknown persona_review"):
        load_task(task_file)


def test_load_task_rejects_module_layer_not_declared(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "layer.yaml",
        """
id: fam-4
title: active repo
target_repo: /tmp/repo
goal: build the thing
system_layers: [ingest]
module_map:
  - name: scorer
    source: src/pkg/score.py
    layer: score
""",
    )

    with pytest.raises(ValueError, match="must reference"):
        load_task(task_file)


def test_legacy_factory_task_yamls_still_load() -> None:
    root = Path("ops/factory-tasks")
    legacy = sorted(root.glob("batch2-*.yaml")) + sorted(root.glob("pilot-*.yaml"))
    assert legacy, "expected batch2 and pilot task YAMLs"
    for path in legacy:
        task = load_task(path)
        assert task.id
        assert task.active is False


def test_active_repo_files_report_missing_files(tmp_path: Path) -> None:
    violations = validate_active_repo_files(tmp_path)

    assert {violation.path for violation in violations} == {
        "PRODUCT_BRIEF.md",
        "SYSTEM_MAP.md",
        "STATUS.md",
    }


def test_active_repo_files_report_missing_status_sections(tmp_path: Path) -> None:
    _write(tmp_path / "PRODUCT_BRIEF.md", "brief\n")
    _write(tmp_path / "SYSTEM_MAP.md", "map\n")
    _write(tmp_path / "STATUS.md", "## Current state\nok\n")

    violations = validate_active_repo_files(tmp_path)

    assert [violation.code for violation in violations] == [
        "missing-status-section",
        "missing-status-section",
    ]


def test_expected_artifacts_validate_file_dir_and_glob(tmp_path: Path) -> None:
    _write(tmp_path / "PRODUCT_BRIEF.md", "brief\n")
    (tmp_path / "reports").mkdir()
    _write(tmp_path / "reports" / "sample.jsonl", "{}\n")

    violations = validate_expected_artifacts(
        tmp_path,
        [
            ExpectedArtifact(path="PRODUCT_BRIEF.md"),
            ExpectedArtifact(path="reports", kind="dir"),
            ExpectedArtifact(path="reports/*.jsonl", kind="glob"),
        ],
    )

    assert violations == []


def test_expected_artifacts_report_empty_and_missing(tmp_path: Path) -> None:
    _write(tmp_path / "empty.md", "")

    violations = validate_expected_artifacts(
        tmp_path,
        [
            ExpectedArtifact(path="empty.md"),
            ExpectedArtifact(path="missing.md"),
        ],
    )

    assert [violation.code for violation in violations] == [
        "empty-expected-artifact",
        "missing-expected-artifact",
    ]


def test_module_map_reports_missing_source(tmp_path: Path) -> None:
    violations = validate_module_map(
        tmp_path,
        [ModuleMapEntry(name="cli", source="src/pkg/cli.py", layer="ingest")],
    )

    assert len(violations) == 1
    assert violations[0].gate_name() == "contract:missing-module-source:src-pkg-cli.py"


def test_triage_pass_investigate_and_hold() -> None:
    passing = GateOutcome("unit", "pytest", True, True, "", "")
    advisory = GateOutcome("freshness", "python check.py", False, False, "", "")
    blocking = GateOutcome("unit", "pytest", False, True, "", "failed")

    assert classify_terminal_state(final_status="done", gate_outcomes=[passing]) == "PASS"
    assert (
        classify_terminal_state(final_status="done", gate_outcomes=[passing, advisory])
        == "INVESTIGATE"
    )
    assert classify_terminal_state(final_status="done", gate_outcomes=[blocking]) == "HOLD"
    assert classify_terminal_state(final_status="blocked") == "HOLD"


def test_dry_run_run_record_carries_terminal_triage(
    tmp_path: Path, _redirect_run_evidence_dirs: LedgerDirs
) -> None:
    repo = tmp_path / "repo"
    init_git_repo(repo)
    task = Task(
        id="triage-run",
        title="triage run",
        target_repo=str(repo),
        goal="exercise terminal triage",
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

    assert result.triage == "PASS"
    records = list(_redirect_run_evidence_dirs.records.glob("run-*.json"))
    assert len(records) == 1
    run = json.loads(records[0].read_text(encoding="utf-8"))
    assert run["events"] == [
        {
            "timestamp": run["finished_at"],
            "kind": "terminal_triage",
            "payload": {"triage": "PASS", "final_status": "done"},
        }
    ]
