# requirements: engine property test battery

## Scope

Spec 0017 stands up the property-based test layer the bargaining
engine currently lacks. Existing tests (`test_algorithms.py`,
`test_algorithm_baselines.py`) are point checks against hand-picked
scenarios. The math claims the lab makes — individual rationality,
determinism, monotonicity, budget-balance, Pareto efficiency, leakage
bounds, infeasibility handling, numerical stability — need invariant
tests that hold across the input distribution, not against three
golden scenarios.

This spec defines the property test battery for every mechanism the
engine exposes: the existing oracle, ADMM, and baselines, plus the
weighted-Nash and MPC mechanisms introduced in spec 0015. The battery
runs in CI on every PR via the workflow defined under R-PROP-007.

## Requirements

### R-PROP-001: property test framework

WHEN a developer runs the engine test suite, THE SYSTEM SHALL execute
a Hypothesis-based property test battery with deterministic seeds and
a bounded CI runtime.

Acceptance:
- The battery lives under `tests/property/`.
- Each property test file uses `hypothesis` strategies that produce
  valid bargaining scenarios per the engine schemas.
- `tests/property/conftest.py` sets a global seed and caps each
  property at a CI-safe example count (default 100; configurable per
  property).
- On failure, the failure record includes the minimal counterexample
  and the seed, suitable for regression-pinning.

### R-PROP-002: individual rationality invariant

WHEN any mechanism returns an allocation, THE SYSTEM SHALL satisfy
individual rationality for every party: no party receives utility
below its BATNA.

Acceptance:
- `tests/property/test_individual_rationality.py` exercises every
  registered mechanism on Hypothesis-generated scenarios.
- For each generated scenario, the test asserts
  `u_p(allocation) >= d_p` for every party `p`.
- The test handles infeasible scenarios by checking the structured
  failure path (no party allocated) instead of asserting on values.
- The battery runs at `N in {2, 3, 5}` party counts.

### R-PROP-003: determinism invariant

WHEN any mechanism runs twice on identical inputs (including the
random seed for protocols that use one), THE SYSTEM SHALL return
identical outputs to within a documented floating-point tolerance.

Acceptance:
- `tests/property/test_determinism.py` runs each mechanism twice per
  generated scenario and asserts allocation equality.
- The TS engine mirror (per R-NASH-001 and spec 0016) is included in
  the parity comparison via `tests/property/test_ts_python_parity.py`.
- Floating-point tolerance is documented in the test docstring and
  matches the tolerance documented in DEC-NASH-001.

### R-PROP-004: monotonicity invariant

WHEN one party's bargaining-power weight strictly increases (other
inputs held constant), THE SYSTEM SHALL produce an allocation where
that party's utility is weakly greater than the original allocation.

Acceptance:
- `tests/property/test_monotonicity.py` generates pairs of scenarios
  that differ only in one party's `alpha_p`.
- For each pair, the property asserts that the party whose weight
  increased receives weakly higher utility under the new allocation.
- The property covers weighted-Nash (R-NASH-003) at minimum and any
  other mechanism that documents a monotonicity claim.

### R-PROP-005: CBT budget-balance invariant

WHEN the CBT surplus-split heuristic runs on a feasible scenario, THE
SYSTEM SHALL return an allocation whose surplus distribution sums to
the available surplus (no slack created or destroyed).

Acceptance:
- `tests/property/test_cbt_budget_balance.py` covers the existing
  `engine/cbt.py` path.
- The test asserts `sum(surplus_share_p) == total_surplus` within
  tolerance for every generated feasible scenario.
- Infeasible scenarios are routed through the structured failure path
  and not asserted.

### R-PROP-006: transcript-exposure-bound invariant

WHEN the transcript-exposure protocol runs (per R-NASH-004), THE
SYSTEM SHALL produce a report whose measured exposure is no greater
than the declared per-protocol bound.

Acceptance:
- `tests/property/test_leakage_bound.py` generates scenarios under
  `information_mode=private` and runs the protocol end-to-end.
- The test reads the TranscriptExposureReport (R-NASH-006 schema) and
  asserts `measured_exposure <= declared_bound` for every party.
- The cryptographic MPC mechanism (R-NASH-008) is exercised in the
  same property file with the negligible-function parameter check.

### R-PROP-007: CI property workflow

WHEN a PR opens against the repo, THE SYSTEM SHALL run the property
battery and fail the check on any property red.

Acceptance:
- `.github/workflows/engine-properties.yml` runs `pytest
  tests/property/` on every PR.
- On failure, the workflow uploads the Hypothesis failure bundle as a
  CI artifact.
- The workflow caps total runtime at 10 minutes; per-property
  `max_examples` is tuned to respect this.

### R-PROP-008: Pareto efficiency invariant

WHEN a mechanism returns an allocation, THE SYSTEM SHALL produce an
allocation that no other feasible allocation strictly dominates on
every party's utility.

Acceptance:
- `tests/property/test_pareto.py` generates scenarios with small
  enough action sets to enumerate the feasible frontier.
- The test asserts no alternative allocation Pareto-dominates the
  mechanism's chosen allocation.
- Mechanisms that document explicit Pareto-suboptimality (none today)
  are excluded with a per-mechanism marker and documented in
  DEC-PROP-001.

### R-PROP-009: infeasibility handling invariant

WHEN a scenario has no feasible allocation (every candidate violates
at least one party's BATNA, capacity, or dealbreaker), THE SYSTEM
SHALL return a structured failure record with a reason code, not
raise an unhandled exception.

Acceptance:
- `tests/property/test_infeasibility.py` generates pathological
  scenarios (impossible BATNA stacks, zero-capacity slots, contradictory
  dealbreakers).
- The test asserts each mechanism returns a `MechanismFailure` with a
  reason code, never an uncaught exception.
- The reason codes are documented in `engine/schemas.py` and
  referenced by the SDK error documentation.

### R-PROP-010: numerical stability invariant

WHEN a scenario is perturbed by small numerical noise, THE SYSTEM
SHALL produce an allocation whose utility changes are bounded by a
Lipschitz constant documented per mechanism.

Acceptance:
- `tests/property/test_numerical_stability.py` perturbs party utility
  parameters by epsilon and runs each mechanism on both versions.
- The test asserts
  `|u(allocation_perturbed) - u(allocation_original)| <= L * epsilon`
  for each documented mechanism Lipschitz constant `L`.
- Mechanisms without a declared `L` are excluded and tracked under
  DEC-PROP-001 for follow-up.

### R-PROP-011: TS-Python parity property

WHEN the TypeScript engine mirror runs the same scenario as the Python
engine, THE SYSTEM SHALL return the same allocation within a
documented tolerance.

Acceptance:
- `tests/property/test_ts_python_parity.py` runs each generated
  scenario through both the Python engine and the TS engine mirror
  (compiled and invoked via `node` subprocess).
- The test asserts allocation equality within the tolerance documented
  in DEC-NASH-001 for non-protocol mechanisms and within the
  protocol-tolerance for the iterative transcript-exposure protocol.
- The TS engine mirror is built as part of the test setup (no
  expectation that it is published).

## Out of scope

- Performance / load testing of the engine (covered in spec 0007
  production hardening).
- End-to-end Playwright tests of the NegotiateSurface UI (covered in
  spec 0016 negotiate-surface-engine-reconnect).
- Property tests over the factory orchestrator state machine (covered
  by `tests/factory/` and spec 0009).
- Coverage of mechanisms that are not yet implemented (each new
  mechanism adds property coverage as part of its own ship).
