"""Tests for factory v2-lite: phase, persona, test_matrix, attribution."""

from __future__ import annotations

from pathlib import Path

import pytest

from scripts.factory.attribution import attribute_failure
from scripts.factory.state import Store
from scripts.factory.task import GateSpec, MatrixEntry, load_task


def _write(path: Path, body: str) -> Path:
    path.write_text(body, encoding="utf-8")
    return path


# ----- task.py: phase + persona + test_matrix ----------------------------


def test_load_task_defaults_preserve_pre_v2_behavior(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "min.yaml",
        """
id: t-default
title: default
target_repo: /tmp/repo
goal: g
""",
    )
    task = load_task(task_file)
    assert task.phase == "impl"
    assert task.persona == "default"
    assert task.test_matrix == []
    assert task.all_gates() == []


def test_load_task_accepts_phase_persona_and_matrix(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "v2.yaml",
        """
id: t-v2
title: v2-lite
target_repo: /tmp/repo
goal: g
phase: test
persona: scientist
test_matrix:
  - tier: unit
    cmd: pytest tests/unit -q
  - tier: integration
    cmd: pytest tests/integration -q
    blocking: true
  - tier: chaos
    cmd: pytest tests/chaos -q
    blocking: false
    name: chaos-smoke
""",
    )
    task = load_task(task_file)
    assert task.phase == "test"
    assert task.persona == "scientist"
    assert len(task.test_matrix) == 3
    assert task.test_matrix[0].tier == "unit"
    assert task.test_matrix[2].blocking is False
    # all_gates() concats and prefixes test-matrix entries with "tier:"
    gates = task.all_gates()
    assert all(isinstance(g, GateSpec) for g in gates)
    assert len(gates) == 3
    assert gates[0].name == "tier:unit"
    assert gates[1].name == "tier:integration"
    assert gates[1].must_pass is True
    assert gates[2].name == "tier:chaos:chaos-smoke"
    assert gates[2].must_pass is False
    assert gates[2].tier == "chaos"


def test_load_task_rejects_unknown_phase(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "bad.yaml",
        """
id: t-bad
title: bad
target_repo: /tmp/repo
goal: g
phase: deployinate
""",
    )
    with pytest.raises(ValueError, match="unknown phase"):
        load_task(task_file)


def test_load_task_rejects_unknown_tier(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "badtier.yaml",
        """
id: t-bt
title: bt
target_repo: /tmp/repo
goal: g
test_matrix:
  - tier: smoke
    cmd: pytest
""",
    )
    with pytest.raises(ValueError, match="unknown test tier"):
        load_task(task_file)


def test_matrix_entry_to_gate_preserves_blocking_and_cwd() -> None:
    entry = MatrixEntry(
        tier="interface", cmd="pytest tests/interface", blocking=True, cwd="apps/web"
    )
    gate = entry.to_gate()
    assert gate.name == "tier:interface"
    assert gate.must_pass is True
    assert gate.cwd == "apps/web"
    assert gate.tier == "interface"


def test_all_gates_concats_gates_then_matrix(tmp_path: Path) -> None:
    task_file = _write(
        tmp_path / "concat.yaml",
        """
id: t-cat
title: cat
target_repo: /tmp/repo
goal: g
gates:
  - cmd: ruff check
    name: lint
test_matrix:
  - tier: unit
    cmd: pytest
""",
    )
    task = load_task(task_file)
    gates = task.all_gates()
    assert len(gates) == 2
    assert gates[0].name == "lint"
    assert gates[1].name == "tier:unit"


# ----- state.py: migration is idempotent --------------------------------


def test_state_migration_adds_phase_persona_columns(tmp_path: Path) -> None:
    db = tmp_path / "factory.db"
    # First open creates schema + applies migrations
    store1 = Store(path=db)
    store1.close()
    # Second open is a no-op for the new columns
    store2 = Store(path=db)
    cursor = store2._conn.execute("PRAGMA table_info(tasks)")  # noqa: SLF001
    columns = {row[1] for row in cursor.fetchall()}
    assert "phase" in columns
    assert "persona" in columns
    store2.close()


def test_state_update_task_accepts_phase_persona(tmp_path: Path) -> None:
    store = Store(path=tmp_path / "factory.db")
    store.upsert_task("t-1", "phase persist", "spec.yaml")
    store.update_task("t-1", phase="design", persona="architect")
    row = store.get_task("t-1")
    assert row is not None
    assert row.phase == "design"
    assert row.persona == "architect"
    store.close()


# ----- attribution.py: root-cause walking -------------------------------


def test_attribute_failure_on_empty_task_returns_empty_report(tmp_path: Path) -> None:
    store = Store(path=tmp_path / "factory.db")
    store.upsert_task("t-empty", "empty", "spec.yaml")
    report = attribute_failure(store, "t-empty")
    assert report.symptom_event_id is None
    assert report.root_cause_event_id is None
    assert report.phase_chain == []
    store.close()


def test_attribute_failure_traces_chain_when_no_failure(tmp_path: Path) -> None:
    store = Store(path=tmp_path / "factory.db")
    store.upsert_task("t-clean", "clean", "spec.yaml")
    trace = "abc123"
    store.append_event("t-clean", "pipeline.start", {"phase": "design"}, trace_id=trace)
    store.append_event("t-clean", "plan.done", {"phase": "design"}, trace_id=trace)
    store.append_event("t-clean", "implement.done", {"phase": "impl"}, trace_id=trace)
    store.append_event("t-clean", "gates.done", {"phase": "impl"}, trace_id=trace)
    report = attribute_failure(store, "t-clean", trace_id=trace)
    assert report.symptom_event_id is None
    assert report.phase_chain == ["design", "impl"]
    store.close()


def test_attribute_failure_walks_to_first_cross_phase_predecessor(
    tmp_path: Path,
) -> None:
    store = Store(path=tmp_path / "factory.db")
    store.upsert_task("t-prop", "prop", "spec.yaml")
    trace = "deadbeef"
    # Design phase events.
    store.append_event(
        "t-prop", "pipeline.start", {"phase": "design"}, trace_id=trace
    )
    store.append_event("t-prop", "plan.done", {"phase": "design"}, trace_id=trace)
    # Impl phase: gates fail at the end. The bug is in design, but the symptom
    # is in impl. Attribution should pull the previous design event as root.
    store.append_event("t-prop", "implement.done", {"phase": "impl"}, trace_id=trace)
    store.append_event("t-prop", "gates.failed", {"phase": "impl"}, trace_id=trace)
    report = attribute_failure(store, "t-prop", trace_id=trace)
    assert report.symptom_kind == "gates.failed"
    assert report.symptom_phase == "impl"
    assert report.root_cause_kind == "plan.done"
    assert report.root_cause_phase == "design"
    assert report.propagation_distance == 2
    assert report.phase_chain == ["design", "impl"]
    store.close()


def test_attribute_failure_handles_same_phase_failure(tmp_path: Path) -> None:
    store = Store(path=tmp_path / "factory.db")
    store.upsert_task("t-same", "same", "spec.yaml")
    trace = "cafe"
    store.append_event(
        "t-same", "pipeline.start", {"phase": "impl"}, trace_id=trace
    )
    store.append_event("t-same", "plan.done", {"phase": "impl"}, trace_id=trace)
    store.append_event("t-same", "gates.failed", {"phase": "impl"}, trace_id=trace)
    report = attribute_failure(store, "t-same", trace_id=trace)
    # No cross-phase predecessor -> symptom is its own root.
    assert report.symptom_kind == "gates.failed"
    assert report.root_cause_event_id == report.symptom_event_id
    assert report.propagation_distance == 0
    store.close()


def test_attribute_failure_uses_most_recent_trace_when_omitted(
    tmp_path: Path,
) -> None:
    store = Store(path=tmp_path / "factory.db")
    store.upsert_task("t-multi", "multi", "spec.yaml")
    store.append_event(
        "t-multi", "pipeline.start", {"phase": "impl"}, trace_id="old"
    )
    store.append_event(
        "t-multi", "pipeline.start", {"phase": "design"}, trace_id="new"
    )
    store.append_event(
        "t-multi", "review.needs_patch", {"phase": "design"}, trace_id="new"
    )
    report = attribute_failure(store, "t-multi")
    assert report.trace_id == "new"
    assert report.symptom_kind == "review.needs_patch"
    store.close()


# ----- BUG-FAC-005 fix: prose-verdict fallback in review parser -------


def test_parse_prose_verdict_recognizes_approve() -> None:
    """Reviewer wrote prose instead of STATUS: line — extract CLEAN verdict."""
    from scripts.factory.pipeline import _parse_prose_verdict

    text = (
        "## Verdict\n\nApprove with the two issues above addressed. The design "
        "is internally consistent..."
    )
    assert _parse_prose_verdict(text) == "CLEAN"


def test_parse_prose_verdict_recognizes_reject() -> None:
    from scripts.factory.pipeline import _parse_prose_verdict

    assert _parse_prose_verdict("The plan itself is wrong; suggest a rewrite.") == "REJECT"


def test_parse_prose_verdict_returns_none_for_ambiguous() -> None:
    from scripts.factory.pipeline import _parse_prose_verdict

    assert _parse_prose_verdict("Looks pretty good overall, some thoughts:") is None


def test_combined_review_status_uses_prose_fallback() -> None:
    """When no STATUS: line is present, the prose fallback fires."""
    from scripts.factory.pipeline import _combined_review_status

    review = "## Verdict\n\nApprove with minor notes. Ready to ship."
    assert _combined_review_status(review) == "CLEAN"


def test_combined_review_status_prefers_structured_line() -> None:
    """A structured STATUS: line wins over prose hints."""
    from scripts.factory.pipeline import _combined_review_status

    review = "STATUS: NEEDS_PATCH\nFINDINGS:\n- Approve... wait, no, needs work."
    assert _combined_review_status(review) == "NEEDS_PATCH"


def test_combined_review_status_defaults_to_clean_when_no_blockers() -> None:
    """Reviewer wrote prose with no STATUS line and no blocker language.
    Since gates have already passed by the time the reviewer fires, default
    to CLEAN. Reviewer findings still land in the artifact.
    """
    from scripts.factory.pipeline import _combined_review_status

    review = (
        "The design is consistent. A few minor polish notes:\n"
        "- The regex on identity could be tighter.\n"
        "- Consider naming the singleton chain case explicitly.\n"
        "Otherwise it reads well."
    )
    assert _combined_review_status(review) == "CLEAN"


def test_combined_review_status_blocker_signal_returns_needs_patch() -> None:
    """When reviewer prose contains an explicit blocker, hold the gate."""
    from scripts.factory.pipeline import _combined_review_status

    review = (
        "The design is well-organized but there is a blocking issue: a "
        "committed secret in `.env.example` must fix before merge."
    )
    assert _combined_review_status(review) == "NEEDS_PATCH"


def test_combined_review_status_recognizes_ship_ready_prose() -> None:
    """'ship-ready' / 'ship ready' must parse as CLEAN."""
    from scripts.factory.pipeline import _combined_review_status

    assert _combined_review_status("Net: ship-ready after fixing two small notes.") == "CLEAN"
    assert _combined_review_status("Overall ship ready.") == "CLEAN"
