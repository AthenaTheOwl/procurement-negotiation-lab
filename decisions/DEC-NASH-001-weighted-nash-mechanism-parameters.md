---
id: DEC-NASH-001-weighted-nash-mechanism-parameters
spec: specs/0015-weighted-nash-preference-private/
requirement: R-NASH-001
date: 2026-06-01
status: approved
reversible: true
decision: |
  procurement-negotiation-lab implements the weighted-Nash bargaining
  solver at ``src/procurement_lab/algorithms/weighted_nash.py`` with
  two cooperating components:

  - A plaintext reference solver that searches a quantization grid
    over the feasible allocation set and returns the allocation
    maximizing ``prod_p (max(u_p(x) - d_p, 0)) ** alpha_p`` where
    ``u_p`` is party ``p``'s utility, ``d_p`` is its BATNA, and
    ``alpha_p`` is its bargaining weight.
  - A transcript-exposure iterative protocol that converges to the same
    allocation under limited disclosure, invoked when
    ``information_mode=PRIVATE``. The protocol's exposure accounting and
    TranscriptExposureReport schema are fixed in DEC-NASH-002.

  Parameters pinned by this DEC:

  - ``NASH_QUANTIZATION_LEVELS = 64`` per allocation coordinate
    (i.e., for an N-coordinate allocation the grid has ``64 ** N``
    points). The bound is sized so that 2-party single-period
    scenarios search 64 candidate allocations and 3-party single-
    period scenarios search 4096 — within the CI budget for the
    property battery in spec 0017 R-PROP-008.
  - Tie-breaking is lexicographic: first by ``party.id`` ascending,
    then by allocation coordinate values ascending. This guarantees
    determinism (spec 0017 R-PROP-003) without depending on Python's
    dict ordering or floating-point comparison stability.
  - Bargaining weights ``alpha_p`` are non-negative reals; the sum
    is not required to be one. Equal weights reduce to the symmetric
    Nash bargaining solution. Weights are part of the public
    scenario, not part of any party's private state.
  - Infeasibility (no candidate satisfies every party's BATNA + the
    capacity constraints + dealbreakers if any) returns a structured
    ``MechanismFailure(reason=<code>)`` with one of:
    ``no_feasible_allocation``, ``batna_floor_unreachable``,
    ``capacity_exceeded``, ``dealbreaker_conflict``. The solver
    never raises an unhandled exception.
  - Numerical tolerance for parity tests is ``1e-4`` between two
    plaintext runs and ``1e-3`` between plaintext and the transcript-
    exposure protocol's final allocation. The TS-Python parity test
    (spec 0017 R-PROP-011) inherits the plaintext tolerance.
  - The step-size schedule for the transcript-exposure iterative protocol
    is ``eta_t = eta_0 / (1 + t) ** beta`` with ``eta_0 = 0.5`` and
    ``beta = 0.5``. The schedule is part of the protocol contract so
    the TS engine mirror reproduces it bit-identically given the same
    seed.
  - The mechanism registers under two identifiers in
    ``src/procurement_lab/algorithms/__init__.py``:
    ``weighted_nash_bounded`` (this DEC) and ``weighted_nash_mpc``
    (DEC-MPC-001, W5). The plaintext solver also registers as
    ``weighted_nash_plaintext`` for golden-fixture parity testing.
  - SDK ``compare_mechanisms`` accepts the new identifiers without
    breaking existing callers; the allocation schema returned by the
    new mechanisms matches the existing ``AlgorithmRun`` shape.

  This DEC pins the parameters that downstream code reads from a
  single module-level constants block in ``algorithms/weighted_nash.py``.
  Changes to the parameters require a follow-up DEC referencing this
  one as the parent.
alternatives:
  - label: continuous interior-point solver instead of grid search
    rejected_because: |
      A continuous solver on the Nash product would be more accurate
      for high-dimensional allocations, but it complicates two things
      spec 0015 needs simple: the TS engine mirror (R-NASH-001 + spec
      0017 R-PROP-011) and the property battery (spec 0017 R-PROP-008
      Pareto enumeration). The grid quantization makes both
      tractable. If the discretization gap turns out to matter on
      real scenarios, a follow-up DEC swaps the plaintext solver
      under the same module-level constants block.
  - label: step-size schedule as a learnable hyperparameter
    rejected_because: |
      Learnable step sizes would require recording the schedule per
      run in the TranscriptExposureReport (DEC-NASH-002 schema), which couples
      the privacy contract to a hyperparameter optimizer that does
      not exist in the engine today. The fixed schedule
      ``0.5 / (1 + t) ** 0.5`` matches standard subgradient methods
      and gives a deterministic protocol contract.
  - label: skip the structured failure path and raise on infeasible
    rejected_because: |
      Raising on infeasible would break the SDK's mechanism comparison
      surface (``compare_mechanisms`` could not run a fair comparison
      across mechanisms because one infeasibility crashes the run).
      The structured ``MechanismFailure`` lets the SDK route every
      mechanism through the same return path and lets the UI render a
      "no deal" state without exception handling.
  - label: bargaining weights normalized to sum to one
    rejected_because: |
      Normalizing weights to sum to one would change the solver's
      behavior under the standard asymmetric Nash bargaining
      formulation (Kalai 1977): the solution is unchanged by positive
      scaling of weights, but users who set ``alpha = (2, 1)`` intend
      "the buyer's gain matters twice as much" not
      ``alpha = (2/3, 1/3)``. The DEC keeps weights unnormalized to
      match standard convention.
  - label: ship only the plaintext solver in W2; defer transcript exposure
    rejected_because: |
      Spec 0015 R-NASH-004 names the preference-private iteration
      protocol as a hard requirement, not a stretch. The credibility
      gap the spec closes is specifically "two-party preference-
      private weighted-Nash". Shipping plaintext alone reproduces the
      centralized-oracle's information-revealing pattern and does not
      close the gap. The W2 ship includes both.
rationale: |
  Spec 0015 names ten requirements for the weighted-Nash mechanism.
  DEC-NASH-001 fixes the parameters that downstream code, tests, and
  the TS engine mirror all depend on; without those parameters fixed
  before code lands, the three implementations (Python, TS, MPC in
  W5) drift apart at the parameter level and the parity tests give
  false reassurance.

  The grid-search plaintext solver is intentionally simple. The lab's
  audience is mechanism-design learners, not optimization researchers.
  The plaintext solver is the reference against which the iterative
  protocol's exposure-vs-accuracy trade-off is measured (DEC-NASH-002's
  transcript-exposure report). Making the reference solver
  trivially correct keeps the discussion of transcript-exposure approximation
  honest: the protocol earns its complexity by preserving accuracy
  while reducing disclosure to the aggregator, not by inventing a better
  optimizer.

  The 64-level quantization is a CI-budget choice, not a math choice.
  Spec 0017 R-PROP-008 enumerates the feasible frontier for Pareto
  verification; 64 ** N points at N=2 gives 4096-point enumerations
  per scenario, fitting the 10-minute CI cap. If the quantization
  proves too coarse for typical scenarios, a follow-up DEC widens it
  and re-tunes the property battery's per-test ``max_examples``.

  Reversibility is high. Every parameter lives in a single
  ``WEIGHTED_NASH_PARAMS`` block at the top of
  ``algorithms/weighted_nash.py``. The TS engine mirror reads the
  same parameters from a generated JSON file
  (``packages/engine/src/weighted_nash_params.json``) generated by a
  build step from the Python constants — DEC-NASH-001 names the file
  but the build step lands in W2's Codex lane (T-NASH-009).
evidence:
  - kind: spec
    ref: specs/0015-weighted-nash-preference-private/requirements.md
  - kind: spec
    ref: specs/0015-weighted-nash-preference-private/design.md
  - kind: decision
    ref: decisions/DEC-PROP-001-engine-property-test-battery.md
  - kind: doc
    ref: src/procurement_lab/algorithms/weighted_nash.py
  - kind: doc
    ref: packages/engine/src/weighted_nash_params.json
rollback: |
  Drop ``src/procurement_lab/algorithms/weighted_nash.py``. Remove
  the ``weighted_nash_bounded`` and ``weighted_nash_plaintext``
  entries from ``src/procurement_lab/algorithms/__init__.py``. Drop
  the corresponding registry entries from
  ``tests/property/registry.py``. Drop
  ``packages/engine/src/weighted_nash_params.json`` and the build
  step that emits it. Drop ``tests/test_weighted_nash.py`` and the
  property tests that import the new mechanism. The R-NASH-* rows
  stay in the spec_check allowlist (already deferred); the spec 0015
  files remain (the spec is the contract, the implementation is
  the proof).
owner: science.proof-gate-runner
systems_map: |
  Mechanism-design lab credibility — the repo claims weighted-Nash
  bargaining as a flagship mechanism but ships no code that
  implements it. DEC-NASH-001 closes that gap by fixing the
  parameters that all three implementations (Python plaintext,
  Python transcript exposure, future MPC) and the TS engine mirror share.
  Parameters live in one place so the three implementations stay in
  parity; the DEC is the parity contract.
transferable_principle: |
  Multi-implementation systems (Python + TS + future MPC) need a
  parameter-level contract before code lands. Pinning constants in a
  DEC plus a generated parameter file makes the parity tests
  meaningful: a parity failure means a real implementation drift, not
  a parameter-table drift. This pattern applies to any system where
  a reference implementation and a deployed implementation need to
  stay in lockstep.
falsification_test: |
  If two implementations (Python plaintext vs TS engine mirror, or
  Python plaintext vs Python transcript exposure) produce allocations
  that differ by more than the documented tolerance on the golden
  fixture suite while both report reading the same
  ``weighted_nash_params.json``, the parameter-level contract is
  falsified. The TS-Python parity test (spec 0017 R-PROP-011) is the
  proof surface.
adoption_ladder:
  minimum_viable: |
    ``weighted_nash.py`` ships with the plaintext solver + transcript-
    exposure protocol; both read parameters from ``WEIGHTED_NASH_PARAMS``;
    unit tests + golden fixtures + property tests green; the W2 ship.
  mid_adoption: |
    TS engine mirror lands (W2 Codex lane T-NASH-009) reading
    ``weighted_nash_params.json``; parity test green; the deployed
    NegotiateSurface (spec 0016) consumes the transcript-exposure
    mechanism.
  full_adoption: |
    MPC mechanism lands (W5, DEC-MPC-001) registering under
    ``weighted_nash_mpc`` and reading the same parameters file; SDK
    ``compare_mechanisms`` runs all three side-by-side on shared
    scenarios; the parameter file is the single source of truth across
    Python, TS, and MPC paths.
  monitoring_signals:
    - "TS-Python parity test pass/fail trend on main"
    - "delta between plaintext and transcript-exposure final allocations on golden fixtures"
    - "MechanismFailure reason-code distribution on real runs"
    - "weighted_nash_params.json drift between Python constants and the generated file"
---

## decision

procurement-negotiation-lab implements weighted-Nash bargaining at
``src/procurement_lab/algorithms/weighted_nash.py`` with a plaintext
grid-search reference plus a transcript-exposure iterative protocol. All
parameters (quantization, step-size, tie-breaking, tolerance, failure
codes, mechanism identifiers) are pinned in a single
``WEIGHTED_NASH_PARAMS`` block and mirrored to
``packages/engine/src/weighted_nash_params.json`` for the TS engine.

The transcript-exposure protocol's disclosure contract — what is
transmitted, what is not, how exposure is measured, what the
TranscriptExposureReport schema looks like — is in the sibling DEC-NASH-002.

## coverage

This DEC resolves the following requirements added to spec
``0015-weighted-nash-preference-private``:

- ``R-NASH-001`` weighted-Nash solver: ``algorithms/weighted_nash.py``
  implements the plaintext reference; tie-breaking is lexicographic;
  infeasibility returns ``MechanismFailure`` with one of four reason
  codes.
- ``R-NASH-003`` bargaining-power weights: weights are non-negative
  reals, unnormalized; equal weights reduce to symmetric Nash.
- ``R-NASH-009`` mechanism selector: ``weighted_nash_bounded`` and
  ``weighted_nash_plaintext`` register in the algorithms package;
  SDK ``compare_mechanisms`` accepts the new identifiers without
  breaking existing callers.
- ``R-NASH-010`` per-run record: ``mechanism_id`` is the registered
  identifier; ``leakage_report_ref`` is the legacy field name for the SHA-256 of the
  TranscriptExposureReport (DEC-NASH-002 schema).
