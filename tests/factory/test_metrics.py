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
