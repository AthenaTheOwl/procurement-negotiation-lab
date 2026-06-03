# traceability: engine property test battery

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-PROP-001** property test framework (owner_role: science.proof-gate-runner) | A1, A2 | tests/property/ scaffold + conftest.py + registry.py present; max_examples cap honored; deterministic seed | planned |
| **R-PROP-002** individual rationality invariant (owner_role: science.proof-gate-runner) | A2, A3, C1 | test_individual_rationality.py covers every registered mechanism at N=2,3,5; passes in CI | planned |
| **R-PROP-003** determinism invariant (owner_role: science.proof-gate-runner) | A2, A4 | test_determinism.py asserts allocation equality on two runs; tolerance documented in DEC-NASH-001 | planned |
| **R-PROP-004** monotonicity invariant (owner_role: science.proof-gate-runner) | A2, A5, C1 | test_monotonicity.py runs weight-perturbation pairs; weighted_nash covered | planned |
| **R-PROP-005** CBT budget-balance invariant (owner_role: science.proof-gate-runner) | A2, A6 | test_cbt_budget_balance.py asserts surplus-share sum equals total surplus within tolerance | planned |
| **R-PROP-006** leakage-bound invariant (owner_role: science.proof-gate-runner) | A2, A7, C1 | test_leakage_bound.py covers bounded-leakage + MPC; measured_epsilon <= declared_bound | planned |
| **R-PROP-007** CI property workflow (owner_role: operations.release-manager) | B1 | engine-properties.yml runs pytest tests/property/ on PRs; uploads .hypothesis/ on red; 10-minute cap | planned |
| **R-PROP-008** Pareto efficiency invariant (owner_role: science.proof-gate-runner) | A2, A9, C1 | test_pareto.py enumerates feasible frontier for small action sets; no Pareto-dominating alternative | planned |
| **R-PROP-009** infeasibility handling invariant (owner_role: science.proof-gate-runner) | A2, A10 | test_infeasibility.py covers every mechanism; MechanismFailure returned; no uncaught exceptions | planned |
| **R-PROP-010** numerical stability invariant (owner_role: science.proof-gate-runner) | A2, A11 | test_numerical_stability.py covers mechanisms with declared Lipschitz constant; bound documented per mechanism | planned |
| **R-PROP-011** TS-Python parity property (owner_role: engineering.implementation) | B2 | test_ts_python_parity.py compiles and invokes TS engine mirror; allocations match within tolerance | planned |

## Proof record

The property battery itself is the proof surface for spec 0017. Each
property test file maps 1:1 to an R-PROP-* requirement. The
engine-properties.yml workflow runs the battery on every PR. DEC-PROP-001
carries the systems-thinking fields and resolves the per-mechanism
Lipschitz constants + Pareto enumeration tractability cap.
