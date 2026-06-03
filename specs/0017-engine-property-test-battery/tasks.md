# tasks: engine property test battery

## W1 (Claude lead, Codex review)

- A1: Author DEC-PROP-001 — property battery scope, per-mechanism
  Lipschitz constants, Pareto enumeration tractability cap.
- A2: Scaffold `tests/property/` with `__init__.py`, `conftest.py`
  (seed, max_examples cap, scenario validation filter), and
  `registry.py` (mechanism registry mirroring SDK identifiers).
- A3: Implement `tests/property/test_individual_rationality.py`
  covering R-PROP-002.
- A4: Implement `tests/property/test_determinism.py` covering
  R-PROP-003.
- A5: Implement `tests/property/test_monotonicity.py` covering
  R-PROP-004.
- A6: Implement `tests/property/test_cbt_budget_balance.py` covering
  R-PROP-005.

## W2 (Claude lead)

- A7: Implement `tests/property/test_leakage_bound.py` covering
  R-PROP-006 (depends on spec 0015 weighted_nash.py + privacy.py).
- A8: Implement `tests/property/test_weighted_nash_properties.py`
  consolidating IR + monotonicity + Pareto for the new mechanisms.

## W2 (Codex lead, Claude review)

- B1: Stand up `.github/workflows/engine-properties.yml` covering
  R-PROP-007. Workflow runs property battery on every PR touching
  engine code; uploads `.hypothesis/` directory on failure.
- B2: Implement `tests/property/test_ts_python_parity.py` covering
  R-PROP-011 (depends on Codex's TS engine mirror in spec 0015 task
  B1).

## W3 (Claude lead)

- A9: Implement `tests/property/test_pareto.py` covering R-PROP-008.
- A10: Implement `tests/property/test_infeasibility.py` covering
  R-PROP-009.
- A11: Implement `tests/property/test_numerical_stability.py`
  covering R-PROP-010 (mechanisms with documented Lipschitz constant
  only; others tracked in DEC-PROP-001 follow-up).

## W4 (paired)

- C1: Lift the property battery to run at `N in {2, 3, 5}` party
  counts for batteries that cover multi-party (R-PROP-002, R-PROP-004,
  R-PROP-006, R-PROP-008). Depends on spec 0015 R-NASH-007 multi-
  party lift.

## Cross-reviews

The CLAUDE_EXECUTION_PACK.md and CODEX_EXECUTION_PACK.md in
`_factory-resets/2026-06-01/per-pilot/procurement-negotiation-lab/`
name every `T-REVIEW-CLAUDE-*` and `T-REVIEW-CODEX-*` task ID for
the property battery work.
