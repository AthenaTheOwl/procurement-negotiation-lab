# design: engine property test battery

## Approach

The property battery lives under `tests/property/`. Each property is a
single file. Files share a `conftest.py` that seeds Hypothesis
globally, caps per-property `max_examples` to a CI-safe number, and
filters generated scenarios through the engine's existing schema
validators so the tests never run on malformed input.

Mechanisms register themselves in `tests/property/registry.py` against
the same identifier set the SDK exposes (spec 0015 R-NASH-009).
Property tests iterate the registry, so adding a new mechanism in a
future spec gains coverage by registration alone.

## Battery composition

| Property | File | Mechanisms covered | Party counts |
|---|---|---|---|
| Individual rationality (R-PROP-002) | test_individual_rationality.py | all registered mechanisms | 2, 3, 5 |
| Determinism (R-PROP-003) | test_determinism.py | all registered mechanisms; TS parity in test_ts_python_parity.py | 2, 3 |
| Monotonicity (R-PROP-004) | test_monotonicity.py | weighted_nash_bounded, weighted_nash_mpc | 2, 3 |
| CBT budget-balance (R-PROP-005) | test_cbt_budget_balance.py | engine.cbt surplus-split | 2 |
| Leakage bound (R-PROP-006) | test_leakage_bound.py | weighted_nash_bounded, weighted_nash_mpc | 2, 3 |
| Pareto efficiency (R-PROP-008) | test_pareto.py | all registered mechanisms (with small action sets) | 2, 3 |
| Infeasibility (R-PROP-009) | test_infeasibility.py | all registered mechanisms | 2, 3 |
| Numerical stability (R-PROP-010) | test_numerical_stability.py | mechanisms with documented Lipschitz constant | 2 |
| TS-Python parity (R-PROP-011) | test_ts_python_parity.py | mechanisms with a TS engine mirror | 2 |

## Hypothesis strategy design

Each strategy generates a `BargainingScenario` matching the engine
schema:
- `n_parties` sampled from `{2, 3, 5}` for batteries that cover
  multi-party; from `{2}` otherwise.
- Per-party utility coefficients sampled from a bounded uniform.
- Per-party BATNA sampled to leave some scenarios infeasible (covered
  by R-PROP-009) and most feasible.
- Per-party bargaining weight sampled from a non-negative bounded
  uniform; equal-weight degenerate case covered explicitly.
- Action set size capped at 16 for Pareto enumeration tractability
  (R-PROP-008); larger for properties that do not enumerate.

`conftest.py` filters generated scenarios against `Scenario.validate`
to drop malformed examples without counting them against
`max_examples`.

## CI workflow

`.github/workflows/engine-properties.yml` runs:
1. `python -m uv run pytest tests/property/` with `-v --tb=short`.
2. On failure, captures the `.hypothesis/` directory as a CI
   artifact, including the minimal counterexample database.
3. Caps the total job at 10 minutes; per-property timeouts are
   enforced by `pytest-timeout`.

The workflow runs on every PR that touches `src/procurement_lab/`,
`packages/engine/`, or `tests/property/`. It does not run on docs-
only PRs.

## Relationship to existing tests

- `tests/test_algorithms.py` and `tests/test_algorithm_baselines.py`
  remain as scenario-specific golden tests; the property battery
  complements but does not replace them.
- `tests/test_admm_smoke.py` and similar smoke tests remain for fast
  CI signal.
- Factory tests under `tests/factory/` are out of scope; spec 0009
  owns those.

## Open decisions

- DEC-PROP-001 (in-flight, W1): documents the property battery
  scope, per-mechanism Lipschitz constants for R-PROP-010, and the
  Pareto enumeration tractability cap.
