"""Metrics ledger: rollup math + stop-reason derivation, on a synthetic Store."""
from __future__ import annotations

from pathlib import Path

from scripts.factory.metrics import compute_rollup, derive_stop_reason
from scripts.factory.state import Store


def _store(tmp_path: Path) -> Store:
    return Store(tmp_path / "factory.db")


def test_clean_vs_rework_vs_failed(tmp_path: Path) -> None:
    s = _store(tmp_path)
    # a clean done task: no patch rounds, no gate failures
    s.upsert_task("t-clean", "clean", "spec")
    s.update_task("t-clean", status="done")
    # a reworked done task: one review.needs_patch round
    s.upsert_task("t-rework", "rework", "spec")
    s.update_task("t-rework", status="done")
    s.append_event("t-rework", "review.needs_patch", {})
    # a failed task on a gate
    s.upsert_task("t-fail", "fail", "spec")
    s.update_task("t-fail", status="failed")
    s.append_event("t-fail", "gate.failed", {"gate": "contract-presence", "duration_ms": 1200})

    r = compute_rollup(s)
    assert r.tasks_total == 3
    assert r.by_status["done"] == 2
    assert r.clean_rate == 0.5            # 1 of 2 done tasks was clean
    assert r.first_attempt_pass_rate == 0.5
    assert r.rework_rate == 0.5
    assert r.gate_failure_distribution == {"contract-presence": 1}
    assert r.stop_reason_distribution["completed_clean"] == 1
    assert r.stop_reason_distribution["completed_with_rework"] == 1
    assert r.stop_reason_distribution["gate_failure"] == 1
    s.close()


def test_explicit_stop_event_wins(tmp_path: Path) -> None:
    # PR2 forward-compat: a `stop` event with a reserved reason is trusted as-is.
    s = _store(tmp_path)
    s.upsert_task("t-budget", "budget", "spec")
    s.update_task("t-budget", status="failed")
    s.append_event("t-budget", "stop", {"reason": "budget_exhausted"})
    row = s.get_task("t-budget")
    assert derive_stop_reason(row, s.events_for("t-budget"), patch_rounds=0) == "budget_exhausted"
    s.close()


def test_failure_reason_hint_maps_to_reserved(tmp_path: Path) -> None:
    s = _store(tmp_path)
    s.upsert_task("t-rl", "rl", "spec")
    s.update_task("t-rl", status="failed", failure_reason="provider returned 429 rate limit")
    row = s.get_task("t-rl")
    assert derive_stop_reason(row, s.events_for("t-rl"), patch_rounds=0) == "provider_rate_limited"
    s.close()


def test_rollup_writes_jsonl(tmp_path: Path) -> None:
    from scripts.factory.metrics import write_rollup
    s = _store(tmp_path)
    s.upsert_task("t1", "t1", "spec")
    s.update_task("t1", status="done")
    r = compute_rollup(s)
    out = write_rollup(r, tmp_path / "factory-metrics")
    assert out.is_file()
    assert out.read_text(encoding="utf-8").strip().startswith("{")
    s.close()


# --- defect-log-derived logic (the path that drives the honest numbers) ---

def _write_defects(defects_dir: Path, task_id: str, entries) -> None:
    from scripts.factory.defects import DefectEntry, append_defect
    for e in entries:
        append_defect(task_id, DefectEntry(**e), defects_dir)


def test_patch_rounds_derived_from_defect_rounds(tmp_path: Path) -> None:
    # events log no rework, but the defect log shows failures at rounds 0 and 1.
    # patch_rounds must come from the defect log, not the (blind) event ledger.
    s = _store(tmp_path)
    ddir = tmp_path / "defects"
    s.upsert_task("t-iter", "iter", "spec")
    s.update_task("t-iter", status="done")
    _write_defects(ddir, "t-iter", [
        {"kind": "gate.failed", "gate_or_finding": "contract-presence", "round": 0, "phase": "impl", "persona": "d", "summary": "x"},
        {"kind": "gate.failed", "gate_or_finding": "reports-present", "round": 1, "phase": "impl", "persona": "d", "summary": "x", "resolved_in_round": 2},
    ])
    r = compute_rollup(s, ddir)
    task = next(t for t in r.tasks if t["id"] == "t-iter")
    assert task["patch_rounds"] == 1            # max defect round
    assert task["stop_reason"] == "completed_with_rework"
    assert r.clean_rate == 0.0                  # the one done task was not clean
    s.close()


def test_named_gate_failures_come_from_defect_log(tmp_path: Path) -> None:
    s = _store(tmp_path)
    ddir = tmp_path / "defects"
    s.upsert_task("t-gf", "gf", "spec")
    s.update_task("t-gf", status="failed")
    _write_defects(ddir, "t-gf", [
        {"kind": "gate.failed", "gate_or_finding": "contract-presence", "round": 0, "phase": "impl", "persona": "d", "summary": "x"},
        {"kind": "gate.failed", "gate_or_finding": "contract-presence", "round": 1, "phase": "impl", "persona": "d", "summary": "x"},
        {"kind": "gate.failed", "gate_or_finding": "reports-present", "round": 1, "phase": "impl", "persona": "d", "summary": "x"},
    ])
    r = compute_rollup(s, ddir)
    assert r.gate_failure_distribution == {"contract-presence": 2, "reports-present": 1}
    s.close()


def test_escaped_uses_resolved_in_round_on_done_tasks(tmp_path: Path) -> None:
    s = _store(tmp_path)
    ddir = tmp_path / "defects"
    s.upsert_task("t-esc", "esc", "spec")
    s.update_task("t-esc", status="done")
    _write_defects(ddir, "t-esc", [
        {"kind": "gate.failed", "gate_or_finding": "g1", "round": 0, "phase": "impl", "persona": "d", "summary": "x", "resolved_in_round": 1},
        {"kind": "gate.failed", "gate_or_finding": "g2", "round": 0, "phase": "impl", "persona": "d", "summary": "x"},  # unresolved
    ])
    r = compute_rollup(s, ddir)
    task = next(t for t in r.tasks if t["id"] == "t-esc")
    assert task["defects_total"] == 2
    assert task["defects_escaped"] == 1         # only the one without resolved_in_round
    s.close()


def test_escaped_not_counted_on_unfinished_task(tmp_path: Path) -> None:
    # an unresolved defect on a still-running task has not escaped — nothing shipped.
    s = _store(tmp_path)
    ddir = tmp_path / "defects"
    s.upsert_task("t-run", "run", "spec")
    s.update_task("t-run", status="running")
    _write_defects(ddir, "t-run", [
        {"kind": "gate.failed", "gate_or_finding": "g1", "round": 0, "phase": "impl", "persona": "d", "summary": "x"},
    ])
    r = compute_rollup(s, ddir)
    task = next(t for t in r.tasks if t["id"] == "t-run")
    assert task["defects_total"] == 1
    assert task["defects_escaped"] == 0
    s.close()
