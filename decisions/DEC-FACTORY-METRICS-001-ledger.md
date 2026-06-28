# DEC-FACTORY-METRICS-001 — Factory metrics ledger

**Date:** 2026-06-21
**Status:** accepted (PR1 of the metrics + budget hardening lane)
**Spec:** factory hardening review (Claude + Codex, 2026-06-21)

## Context

The factory kept evidence (the event ledger in `state.py`) and a defect log
(`defects.py`), but nothing rolled them up into the numbers that say whether a
run was good or just busy. Codex and Claude both flagged this as the first gap to
close, and the first one to build, with `stop_reason` baked into the schema so the
budget work (PR2) plugs in without a migration.

## What shipped

- `scripts/factory/metrics.py`: read-only rollup over the Store + defect log.
  Per-task: status, stop_reason, patch_rounds, gate_failures (named), duration,
  cost, defects, escaped. Factory-wide: clean rate, first-attempt pass, rework
  rate, avg patch rounds, gate-failure distribution, stop-reason distribution.
- `factory --metrics`: prints a summary and appends a rollup snapshot to
  `ops/factory-metrics/rollup.jsonl`.
- `STOP_REASONS` taxonomy defined now (incl. reserved `budget_exhausted`,
  `provider_rate_limited`, `gate_flaky`, `scope_violation`). The ledger already
  reads an explicit `stop` event with `{"reason": ...}`, so PR2 only has to emit
  one. Until then stop_reason is derived from status + events + failure_reason.
- `tests/factory/test_metrics.py` (4 tests). Full factory suite: 180 passed.

## What the first real run found (37 tasks)

The ledger immediately earned its keep by exposing that the rosy numbers were an
instrumentation artifact:

- Computed from events alone, clean rate read **100% / 0% rework** — false. The
  SQLite ledger rarely writes a `review.needs_patch`, so the event signal is
  blind to iteration.
- Computed from the **defect log** (which records every gate-failure with its
  round), the honest numbers are **58% clean / 42% rework**, avg 0.5 patch rounds.
  That matches the by-hand batch trend (2/5 → 4/5 → 5/5).
- Top first-pass failure mode, by far: **missing contract artifacts** —
  PRODUCT_BRIEF (×19), SYSTEM_MAP (×19), specs/0002-design files (×10 each),
  reports-present (×11). The IMPLEMENT prompt / templates should front-load these;
  it would cut the 42% rework directly.

## Decision

Compute rework/patch-rounds and gate-failure names from the **defect log**, not the
event ledger, because the defect log is the populated, authoritative source. Keep
the event-based path as a fallback.

## Known instrumentation gaps the ledger surfaced (emit-side follow-ups)

1. **Defects are never closed.** `resolved_in_round` is rarely set when a later
   round fixes a gate, so "escaped" (331 of 379) overcounts — it's "defects without
   a resolved marker on a done task," not 331 shipped bugs. Fix: set
   `resolved_in_round` when a re-run passes the previously-failed gate. Pairs with
   PR2.
2. **Gate failures aren't named in events** — only in the defect log. Either tag
   the `gate.failed` event payload with the gate name, or keep reading names from
   defects (current choice).
3. **Patch rounds aren't logged as events** — derive from defect rounds (current
   choice) or start emitting `review.needs_patch` consistently.

## Next

PR2 (budget + stop reasons): add `BudgetSpec`/explicit `stop` events, which this
ledger already consumes. PR3/PR4 (blast radius + pre-commit hard gates) follow.
