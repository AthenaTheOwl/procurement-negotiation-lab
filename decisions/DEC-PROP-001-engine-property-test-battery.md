---
id: DEC-PROP-001-engine-property-test-battery
spec: specs/0017-engine-property-test-battery/
requirement: R-PROP-001
date: 2026-06-01
status: approved
reversible: true
decision: |
  procurement-negotiation-lab adds a Hypothesis-based property test
  battery at ``tests/property/`` that asserts the engine's documented
  mathematical claims (individual rationality, determinism,
  monotonicity, budget-balance, leakage-bound, Pareto efficiency,
  infeasibility handling, numerical stability, TS-Python parity) hold
  across the input distribution, not only on the hand-picked scenarios
  in ``tests/test_algorithms.py``.

  The battery is structured as one property file per invariant. Each
  file uses a Hypothesis ``@given`` strategy that emits valid
  ``BargainingScenario`` objects under the engine's existing schema
  validators. A shared ``conftest.py`` sets a global seed, caps
  ``max_examples`` to a CI-safe number (default 100; tunable per
  property), and filters out malformed examples without counting them
  against the example budget.

  Mechanism coverage is registry-driven. ``tests/property/registry.py``
  lists every mechanism identifier the SDK exposes (matching spec 0015
  R-NASH-009). Property tests iterate the registry, so a new mechanism
  shipped in a future spec gains coverage by registration alone.

  Per-mechanism Lipschitz constants for the numerical-stability
  property (R-PROP-010) are documented in this DEC:

  - centralized-oracle: L = 1.0 (grid-search; bounded by quantization step)
  - admm-consensus: L = empirical_only (no closed-form; tracked in registry)
  - weighted-nash-bounded: L = 2.0 (bounded by step-size schedule documented in DEC-NASH-001)
  - weighted-nash-mpc: L = 1.0 (matches plaintext within crypto-tolerance)
  - alternating-best-response: L = empirical_only
  - price-only-dual: L = 1.5 (bounded by dual variable update rule)
  - consensus-averaging: L = 1.0 (averaging is 1-Lipschitz by construction)

  Mechanisms with ``L = empirical_only`` are excluded from the
  formal stability property; they remain in the registry and are
  tracked under a follow-up DEC for either deriving an analytic bound
  or empirically pinning one.

  Pareto enumeration tractability cap (R-PROP-008) is set at 16
  candidate allocations per scenario. Above that, enumeration cost
  exceeds the CI budget. The Hypothesis strategy for the Pareto
  property limits action sets to that bound; mechanisms whose typical
  use cases exceed it have Pareto coverage via golden fixtures, not
  via property tests.

  CI wiring lives in ``.github/workflows/engine-properties.yml``. The
  job runs ``pytest tests/property/ -v --tb=short`` with a 10-minute
  job-level cap and per-test ``pytest-timeout`` of 60 seconds. On red,
  the ``.hypothesis/`` directory uploads as a CI artifact so the
  minimal counterexample is reachable from the PR.

  The battery does not replace the existing scenario-specific tests
  in ``tests/test_algorithms.py`` and ``tests/test_algorithm_baselines.py``.
  Those stay as fast-signal golden tests; the property battery is the
  invariant layer.
alternatives:
  - label: write one large omnibus property file
    rejected_because: |
      A single file with ten ``@given``-decorated tests would make per-
      property tuning (max_examples, seed, timeout) clumsy, and CI
      failure attribution would require reading the body of a 500-line
      file. One-file-per-invariant keeps each property's contract
      visible at the path and lets the CI artifact name the failing
      invariant directly.
  - label: skip the registry and hard-code mechanism iteration
    rejected_because: |
      Hard-coding mechanism names in every property test means adding
      a new mechanism (e.g., the W5 MPC mechanism) requires editing
      ten files. The registry centralizes the mechanism list so the
      battery extends by one-line registry entry.
  - label: cover every mechanism for every property
    rejected_because: |
      Some invariants do not apply to every mechanism (e.g., the CBT
      budget-balance property is specific to ``engine/cbt.py``;
      monotonicity is documented for weighted-Nash and not for the
      baseline alternatives). Forcing universal coverage would either
      generate false-positive failures on mechanisms that do not
      claim the property, or require per-mechanism skip markers that
      obscure which mechanisms genuinely opt out. The per-property
      file documents which mechanisms it covers in its docstring.
  - label: defer the Pareto tractability cap to a follow-up DEC
    rejected_because: |
      Without the cap, the Pareto property's strategy would generate
      scenarios with action sets in the thousands; enumeration cost
      would blow the CI budget on the first generated scenario. The
      cap belongs in the same DEC that authorizes the property; a
      follow-up DEC can revisit the cap if the strategy is later
      refined.
  - label: derive Lipschitz constants empirically for every mechanism
    rejected_because: |
      Empirical Lipschitz bounds are useful but easy to mistune; a
      bound that holds on 1,000 samples can be violated on the
      1,001st. Mechanisms with closed-form bounds (oracle, weighted-
      Nash, dual, averaging) get the documented constant. Mechanisms
      without a closed form get ``empirical_only`` and are excluded
      from the formal property until a follow-up either derives a
      bound or accepts an empirical one with explicit tolerance.
rationale: |
  Spec 0017 adds the property battery as the proof layer the engine's
  claims have lacked. The repo today ships point-checks against three
  hand-picked scenarios in ``tests/test_algorithms.py``. The math
  claims the lab makes are stronger than those checks support: the
  README and ``docs/algorithms.md`` describe invariants that hold
  across the input distribution, not on three scenarios.

  This DEC fixes the per-mechanism Lipschitz constants and the Pareto
  tractability cap inline so the battery can ship without a follow-up
  scaffolding pass. The constants are derivable from each mechanism's
  algorithm spec (oracle from quantization step, dual from update
  rule, weighted-Nash from step-size schedule in DEC-NASH-001). The
  Pareto cap is set conservatively at 16; widening it is a CI-budget
  decision tracked under a follow-up DEC if the property surfaces a
  false-positive miss on real scenarios that exceed the cap.

  The registry-driven mechanism coverage matters because spec 0015
  adds two new mechanisms (weighted-Nash bounded-leakage and MPC) in
  W2 and W5. Hard-coded mechanism iteration in every property file
  would force a 10-file edit per new mechanism; the registry pattern
  reduces that to one-line registry entries.

  CI wiring matches the existing run-evidence-gates pattern: a
  separate job with no ``continue-on-error``, proof tokens registered
  in ``REQUIRED_WORKFLOW_PROOFS``, ``.hypothesis/`` artifact upload
  on red. The 10-minute cap is sized against the existing
  ``tests/test_algorithms.py`` runtime; the property battery will run
  longer than the point checks but inside the cap.

  Reversibility is high. The only files added are the ``tests/property/``
  tree, one CI workflow, and the proof-token registration. Rolling
  back is additive-revert: drop the directory, drop the workflow,
  drop the spec_check proof tokens.
evidence:
  - kind: spec
    ref: specs/0017-engine-property-test-battery/requirements.md
  - kind: spec
    ref: specs/0017-engine-property-test-battery/design.md
  - kind: doc
    ref: tests/property/
  - kind: doc
    ref: .github/workflows/engine-properties.yml
rollback: |
  Drop ``tests/property/``. Drop
  ``.github/workflows/engine-properties.yml``. Remove the
  proof tokens for ``engine-properties.yml`` from
  ``scripts/spec_check.py::REQUIRED_WORKFLOW_PROOFS``. Drop the
  R-PROP-* rows from ``decisions/.spec-check-allowlist.yaml``
  and remove the spec entry from ``specs/README.md``. The existing
  tests/test_algorithms.py and tests/test_algorithm_baselines.py
  stay untouched.
owner: science.proof-gate-runner
systems_map: |
  Property-based testing of a multi-mechanism engine — point-check
  tests validate three hand-picked scenarios, leaving invariants that
  should hold across the input distribution unverified. The property
  battery flips the responsibility: instead of asserting on chosen
  scenarios, it asserts that documented invariants hold for any
  scenario the engine accepts. Registry-driven mechanism coverage
  means new mechanisms extend the proof surface by registration, not
  by file edits.
transferable_principle: |
  When a system claims an invariant (no-regret, monotonicity,
  budget-balance, leakage-bound, Lipschitz stability), ship a property
  test that asserts the invariant across the input distribution. The
  test's job is to find the counterexample the author did not think
  of. Registry-driven dispatch keeps the battery cheap to extend as
  the system grows.
falsification_test: |
  If a new mechanism is registered in ``tests/property/registry.py``
  with a documented invariant claim but the corresponding property
  test does not run against it, the battery's coverage claim is
  falsified for that mechanism. CI proves the negative:
  ``engine-properties.yml`` job reports the mechanism count vs the
  per-property coverage count and fails if they diverge.
adoption_ladder:
  minimum_viable: |
    Four property files (test_individual_rationality.py,
    test_determinism.py, test_monotonicity.py,
    test_cbt_budget_balance.py) cover the existing mechanisms in the
    registry. ``conftest.py`` sets the global seed and example cap.
    ``registry.py`` lists current mechanisms. The W1 ship.
  mid_adoption: |
    Property files for leakage-bound, Pareto, infeasibility, numerical
    stability, and TS-Python parity land alongside spec 0015's
    weighted-Nash + MPC implementations (W2-W5).
    ``engine-properties.yml`` CI job runs the full battery on every PR
    touching engine code.
  full_adoption: |
    The pattern propagates to any sibling repo that ships a
    mathematical engine with documented invariants: trace-to-eval-
    harness for run-evidence packets, supplier-risk-rag-agent for
    retrieval-quality invariants. Each repo's registry drives its own
    property battery; the chaos-test pattern (DEC-FACTORY-014) and
    the property-test pattern compose into a full proof layer.
  monitoring_signals:
    - "engine-properties.yml job pass/fail trend on main"
    - "per-property max_examples vs counterexample-found rate"
    - "mechanisms registered without a paired property covering each documented invariant"
    - "CI runtime trend for the property battery vs the 10-minute cap"
---

## decision

procurement-negotiation-lab adds a Hypothesis-based property test
battery at ``tests/property/`` covering the eleven invariants in
spec 0017 (R-PROP-001 through R-PROP-011). Each invariant is one
property file; a shared ``conftest.py`` and ``registry.py`` make the
battery deterministic and extensible. CI runs the battery on every
PR touching engine code via ``.github/workflows/engine-properties.yml``.

Per-mechanism Lipschitz constants for the numerical-stability
property and the Pareto enumeration tractability cap are documented
inline so the W1 ship has no scaffolding dependencies. New
mechanisms extend the battery by registry entry plus a docstring
declaring which invariants they claim.

## coverage

This DEC resolves R-PROP-001 (property test framework) for spec
0017. The remaining R-PROP-002..011 are resolved by the
corresponding property files plus this DEC's per-mechanism
parameter table.
