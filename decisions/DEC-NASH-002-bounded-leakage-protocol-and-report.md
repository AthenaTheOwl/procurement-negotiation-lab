---
id: DEC-NASH-002-bounded-leakage-protocol-and-report
spec: specs/0015-weighted-nash-preference-private/
requirement: R-NASH-004
date: 2026-06-01
status: approved
reversible: true
amends: DEC-NASH-001-weighted-nash-mechanism-parameters
decision: |
  procurement-negotiation-lab ships the bounded-leakage preference-
  private protocol at ``src/procurement_lab/engine/privacy.py``. The
  protocol converges to the weighted-Nash allocation without
  transmitting any party's utility function or per-allocation utility
  value. Leakage is measured per-run and reported through a stable
  LeakageReport schema.

  ## Protocol message contract

  Each round ``t`` every party transmits one ``ProtocolMessage``:

  - ``round_seq: int`` — monotonically increasing per protocol run
  - ``party_id: str`` — the public party identifier
  - ``direction: list[int]`` — vector of length ``N`` (allocation
    coordinates); each entry in ``{-1, 0, +1}`` indicating the sign
    of the party's local gradient on that coordinate at the current
    candidate allocation
  - ``step_proposal: float`` — bounded by the step-size schedule from
    DEC-NASH-001 (``eta_t = 0.5 / (1 + t) ** 0.5``); quantized to one
    of ``STEP_QUANTIZATION_LEVELS = 32`` levels
  - ``protocol_version: str`` — pinned to ``"bounded-leakage/v1"`` in
    this DEC

  What is NEVER transmitted:
  - Party utility functions (kept in ``Participant.utility_formula``,
    never serialized to the protocol layer)
  - Per-allocation utility values
  - Party BATNAs (``Participant.outside_option``)
  - Party bargaining-power weights at the per-round message level;
    weights are public scenario inputs and are transmitted once at
    protocol start, not per round.

  The aggregator computes the next candidate allocation by applying
  the weighted-Nash first-order optimality condition to the received
  ``direction`` and ``step_proposal`` messages. Aggregation never
  references the original utility functions.

  Stopping condition: the protocol stops at round ``R`` when no
  party's ``direction`` vector contains a non-zero entry above the
  convergence tolerance from DEC-NASH-001 (``1e-3``), capped at
  ``MAX_ROUNDS = 200``.

  ## Leakage model

  Per-run leakage for party ``p`` is bounded by the information
  content of party ``p``'s transmitted messages:

  - ``direction`` carries up to ``N * log_2(3)`` bits per round
    (``N`` allocation coordinates, 3-way ternary)
  - ``step_proposal`` carries up to ``log_2(STEP_QUANTIZATION_LEVELS)
    = 5`` bits per round
  - Over ``R`` rounds: ``epsilon_measured_p <= R * (N * log_2(3) + 5)``

  This is an information-theoretic upper bound on what a passive
  adversary observing the transcript can infer about party ``p``'s
  utility function. It is loose: a transcript of ``R = 50`` rounds at
  ``N = 4`` gives ``epsilon_measured_p <= 50 * (4 * 1.585 + 5) = 567``
  bits of upper-bound. The bound's value is as a sanity-check
  contract, not a tight inference guarantee. Spec 0015 R-NASH-005
  names the property the test asserts (R-PROP-006 in spec 0017):
  ``epsilon_measured <= epsilon_bound`` per the schema below.

  Comparison points:
  - The plaintext solver (DEC-NASH-001) reveals every party's full
    utility to the centralized aggregator; ``epsilon = +infty`` per
    party. This is the leakage baseline the bounded-leakage protocol
    improves on.
  - The MPC mechanism (DEC-MPC-001, W5) achieves
    ``epsilon = negligible(lambda)`` where ``lambda`` is the
    cryptographic security parameter. It is the leakage upper bound
    by construction.

  The protocol does not claim differential privacy. The leakage
  measurement is the information-theoretic bound, not a calibrated
  DP epsilon. DEC-NASH-002 is explicit on this so the lab does not
  over-claim a guarantee it does not implement.

  ## LeakageReport schema

  The Pydantic model lives in ``src/procurement_lab/engine/schemas.py``;
  the JSON Schema mirror lives in
  ``ops/schemas/leakage-report.schema.json`` and is referenced by the
  run-evidence packet emitter (DEC-FACTORY-007 chain).

  Fields:
  - ``protocol_version: str`` — must equal ``"bounded-leakage/v1"``
    for this DEC's protocol
  - ``run_id: str`` — the per-run identifier
  - ``seed: int`` — the protocol seed (part of the per-run record so
    replay reproduces the message sequence)
  - ``round_count: int`` — total rounds executed
  - ``per_party: list[PartyLeakage]`` where ``PartyLeakage`` is:
    - ``party_id: str``
    - ``epsilon_bound: float`` — declared upper bound per the formula
      above
    - ``epsilon_measured: float`` — measured per the round-and-bit
      formula
    - ``message_log_hash: str`` — SHA-256 of the sorted JSON-serialized
      message log for this party
    - ``sufficiency_note: str`` — human-readable note (e.g., "loose
      ITB upper bound; not a DP guarantee")
  - ``aggregate: AggregateLeakage`` where ``AggregateLeakage`` is:
    - ``max_epsilon_measured: float``
    - ``max_epsilon_bound: float``
    - ``all_within_bound: bool`` — equals ``epsilon_measured <=
      epsilon_bound`` for every party

  ## Determinism

  Every protocol run is seeded with a 64-bit integer that is part of
  the per-run record. Same seed + same scenario + same parameter file
  (DEC-NASH-001) produces the same ``direction``/``step_proposal``
  sequence and the same LeakageReport. The replay-determinism gate
  in ``.github/workflows/run-evidence-gates.yml`` covers runs that
  use the bounded-leakage mechanism.

  ## Run-evidence integration

  The run record (per DEC-NASH-001 R-NASH-010 coverage) carries:
  - ``mechanism_id = "weighted_nash_bounded"`` for bounded-leakage runs
  - ``leakage_report_ref = sha256(canonical_json(LeakageReport))``
  - Full LeakageReport stored at
    ``ops/leakage-reports/<run_id>.json``

  The event ledger writes one ``mechanism.bargaining.completed`` event
  per run with payload ``{mechanism_id, leakage_aggregate.max_epsilon_measured}``.
alternatives:
  - label: send per-allocation utility values in the messages
    rejected_because: |
      Transmitting utility values per allocation gives the aggregator
      enough information to reconstruct each party's utility function
      via interpolation. The protocol's privacy claim — that the
      utility function is never on the wire — would be false in
      practice. The ternary-direction-plus-bounded-step contract gives
      the aggregator enough information to converge while keeping the
      function shape private.
  - label: continuous-real-valued direction vectors instead of ternary
    rejected_because: |
      A continuous gradient direction carries arbitrarily many bits of
      precision; the leakage bound becomes meaningless. Ternary
      direction caps per-round leakage at ``log_2(3) ~= 1.585`` bits
      per coordinate, giving an honest information-theoretic upper
      bound the property tests can assert.
  - label: claim differential-privacy guarantees
    rejected_because: |
      Differential privacy requires calibrated noise injection and a
      privacy budget tracked across composed mechanisms. The bounded-
      leakage protocol does neither: it caps the transcript's
      information content, which is a weaker guarantee. Claiming DP
      would overstate the protocol's properties. The
      ``sufficiency_note`` field in the LeakageReport makes the
      contract honest.
  - label: omit the LeakageReport from the per-run record
    rejected_because: |
      Without LeakageReport in the run record, replay cannot verify
      that the protocol's privacy contract held on a given run. The
      report is the proof surface for spec 0015 R-NASH-005 and the
      property test R-PROP-006. Cross-repo consumers (trace-to-eval-
      harness packets) read ``leakage_report_ref`` as part of the
      run-evidence chain.
  - label: ship without ``protocol_version`` field
    rejected_because: |
      A future protocol revision (different message shape, different
      step-size schedule, different quantization) needs a way to
      distinguish leakage reports from the two versions. The
      ``protocol_version`` field gives that distinction at the schema
      level; older reports stay valid against their version, newer
      reports against theirs.
rationale: |
  Spec 0015 R-NASH-004 names the preference-private iteration
  protocol as a hard requirement. Spec 0015 R-NASH-005 names the
  leakage measurement. Spec 0015 R-NASH-006 names the report schema.
  All three need a concrete decision before code lands; without one,
  the implementation could ship a privacy claim that does not
  match what the protocol implements.

  The ternary-direction-plus-bounded-step contract is the smallest
  message shape that lets a centralized aggregator (which sees only
  the messages, not the utilities) converge to the weighted-Nash
  allocation under DEC-NASH-001's parameters. Ternary directions
  carry the gradient sign without exposing magnitude; bounded steps
  prevent the aggregator from running large-step Newton-style updates
  that would converge in fewer rounds at the cost of inferring more
  about each party's utility curvature.

  The leakage bound is information-theoretic, not differential
  privacy. The choice is deliberate: a tight DP guarantee would
  require noise injection and a calibrated budget, neither of which
  this protocol implements. The bounded transcript provides a weaker
  but real guarantee — an adversary observing the full transcript
  cannot infer more than ``R * (N * log_2(3) + 5)`` bits about each
  party's utility. The ``sufficiency_note`` field on the report makes
  the contract honest in the public record.

  The MPC mechanism (DEC-MPC-001, W5) is the high-end privacy
  alternative for users who need cryptographic guarantees. DEC-NASH-002
  names it as a comparison point; the bounded-leakage protocol is the
  default because it ships without external dependencies (MP-SPDZ
  binary, network sockets between parties) and is teachable in the
  lab's learn-flow.

  Reversibility is moderate. The protocol message shape is wire-
  visible; clients that consume the LeakageReport schema break if
  the schema changes. A follow-up DEC revising the protocol bumps
  ``protocol_version`` from ``"bounded-leakage/v1"`` to a new value
  and ships a translator between versions where useful.
evidence:
  - kind: spec
    ref: specs/0015-weighted-nash-preference-private/requirements.md
  - kind: spec
    ref: specs/0015-weighted-nash-preference-private/design.md
  - kind: decision
    ref: decisions/DEC-NASH-001-weighted-nash-mechanism-parameters.md
  - kind: decision
    ref: decisions/DEC-FACTORY-007-factory-emits-conformant-run-evidence.md
  - kind: doc
    ref: src/procurement_lab/engine/privacy.py
  - kind: doc
    ref: src/procurement_lab/engine/schemas.py
  - kind: doc
    ref: ops/schemas/leakage-report.schema.json
rollback: |
  Drop ``src/procurement_lab/engine/privacy.py``. Drop the
  ``LeakageReport`` and ``PartyLeakage`` Pydantic models from
  ``src/procurement_lab/engine/schemas.py``. Drop
  ``ops/schemas/leakage-report.schema.json``. Drop
  ``ops/leakage-reports/``. Remove the ``leakage_report_ref`` field
  from the per-run record schema and the
  ``mechanism.bargaining.completed`` event type. Drop the property
  test ``tests/property/test_leakage_bound.py``. The R-NASH-004 +
  R-NASH-005 + R-NASH-006 rows stay in the spec_check allowlist
  (already deferred); ``weighted_nash.py`` falls back to plaintext-
  only behavior when ``information_mode=PRIVATE`` is requested
  (returns ``MechanismFailure(reason="private_mode_unsupported")``).
owner: science.proof-gate-runner
systems_map: |
  Information-theoretic privacy bound vs cryptographic guarantee — a
  protocol claiming "preference privacy" without naming what is
  transmitted, what is not, and how much information leaks risks
  overclaiming a guarantee the implementation does not provide.
  DEC-NASH-002 closes that gap by fixing the message shape, the
  leakage formula, and the report schema. The protocol's privacy
  property is the bound, not "no information leaks"; the
  ``sufficiency_note`` field makes the bound's looseness visible to
  the consumer of the LeakageReport.
transferable_principle: |
  Any privacy-preserving protocol must (a) name what is and is not
  transmitted, (b) bound the information content of the transcript,
  (c) report the bound and the measurement per-run. Without all three,
  the protocol's privacy claim is unfalsifiable. This pattern applies
  to any mechanism (bargaining, auction, matching) where parties have
  private types and want a mechanism-design solution computed without
  revealing the types.
falsification_test: |
  If the protocol's transcript on any golden-fixture run contains
  more than ``R * (N * log_2(3) + 5)`` bits of information about any
  party's utility function (measured by an adversarial reconstruction
  test against the transcript), the bounded-leakage claim is
  falsified for that run. Spec 0017 R-PROP-006 + an adversarial
  reconstruction test (deferred to a follow-up spec because it
  requires an inference-attack harness) are the proof surface.
adoption_ladder:
  minimum_viable: |
    ``privacy.py`` implements the protocol; ``LeakageReport`` schema
    lands; ``test_leakage_bound.py`` asserts ``epsilon_measured <=
    epsilon_bound`` on Hypothesis-generated scenarios. Property test
    green; the W2 ship.
  mid_adoption: |
    Run-evidence packet emitter (DEC-FACTORY-007 chain) includes
    ``leakage_report_ref`` on every bounded-leakage run; replay-
    determinism gate covers bounded-leakage runs; the
    ``mechanism.bargaining.completed`` event type lands.
  full_adoption: |
    NegotiateSurface (spec 0016) UI exposes the LeakageReport to the
    user (e.g., "this round leaked at most N bits about your
    preferences"); the MPC mechanism (DEC-MPC-001) provides a
    comparison view with the cryptographic guarantee; the protocol-
    version field supports an upgrade path to revised protocols
    without breaking existing reports.
  monitoring_signals:
    - "leakage-bound property test pass/fail trend on main"
    - "per-run max_epsilon_measured distribution on real runs"
    - "delta between bounded-leakage final allocation and plaintext on golden fixtures"
    - "LeakageReport schema-version drift"
    - "MAX_ROUNDS hit rate (protocol failing to converge in bound)"
---

## decision

procurement-negotiation-lab implements the bounded-leakage preference-
private protocol at ``src/procurement_lab/engine/privacy.py``. The
protocol exchanges ternary direction vectors plus bounded step
proposals; never transmits utility functions or values. Per-run
leakage is measured against an information-theoretic upper bound and
reported through a stable LeakageReport schema mirrored from a
Pydantic model to JSON Schema for the run-evidence packet emitter.

## coverage

This DEC resolves the following requirements added to spec
``0015-weighted-nash-preference-private``:

- ``R-NASH-002`` BATNA model: BATNAs are not transmitted in any
  protocol message; the aggregator never sees them; the solver
  enforces ``u_p(allocation) >= d_p`` via the structured-failure path
  from DEC-NASH-001.
- ``R-NASH-004`` preference-private iteration protocol: ternary
  direction + bounded step + deterministic seed.
- ``R-NASH-005`` leakage measurement: per-run formula
  ``epsilon_measured = R * (N * log_2(3) + 5)`` per party.
- ``R-NASH-006`` LeakageReport schema: Pydantic model in
  ``schemas.py`` + JSON Schema mirror; consumed by the run-evidence
  emitter.
