---
id: DEC-MPC-001-mpc-mechanism-path-and-contract
spec: specs/0015-weighted-nash-preference-private/
requirement: R-NASH-008
date: 2026-06-01
status: approved
reversible: true
amends: DEC-NASH-002-bounded-leakage-protocol-and-report
decision: |
  procurement-negotiation-lab ships the cryptographic MPC weighted-Nash
  mechanism at ``src/procurement_lab/algorithms/weighted_nash_mpc.py``
  registered under the identifier ``weighted_nash_mpc`` (DEC-NASH-001
  reserved this slot). The implementation path is:

  ## v1 implementation path: pure-Python BGW for N=2

  - The W5 ship is a pure-Python BGW-style protocol scoped to 2-party
    bargaining. Reference: Ben-Or, Goldwasser, Wigderson (1988)
    "Completeness Theorems for Non-Cryptographic Fault-Tolerant
    Distributed Computation".
  - The protocol operates on additive secret shares modulo a large
    prime (``MPC_PRIME = (1 << 61) - 1``, a Mersenne prime that fits
    in 64-bit arithmetic and is conventional in MPC research code).
  - Each party's utility function is evaluated in shared form using a
    fixed-point representation (``MPC_FIXED_POINT_BITS = 32``) so the
    plaintext + MPC paths return allocations comparable within the
    ``MPC_NUMERICAL_TOLERANCE = 1e-2`` documented in this DEC.
  - The grid-search reduction from DEC-NASH-001 still applies: the
    protocol evaluates the weighted-Nash product on
    ``NASH_QUANTIZATION_LEVELS`` candidate allocations and returns the
    argmax. The argmax computation runs as a secure max-tree.

  ## v1 NON-goal: N>=3 MPC

  Pure-Python BGW for N>=3 requires Lagrange-interpolation share
  reconstruction with secure multiplication via Beaver triples; the
  implementation grows from a few hundred LOC (N=2) to a few thousand
  (N>=3). N>=3 MPC lands in a follow-up DEC that adopts MP-SPDZ as the
  cryptographic backend; until then, ``weighted_nash_mpc`` returns a
  ``MechanismFailure(reason="no_feasible_allocation",
  note="MPC mode supports N=2 only; N>=3 lands in a follow-up DEC")``
  for multi-party scenarios. The transcript-exposure mechanism
  (DEC-NASH-002) remains the disclosure-limited option for N>=3.

  ## Path rejected for v1: MP-SPDZ as default

  MP-SPDZ is mature and supports N>=3 cleanly, but pulling in a
  ~100MB C++ binary as a default dependency tilts the lab toward
  "research stack" instead of "teaching lab". MP-SPDZ becomes a
  follow-on DEC's choice when N>=3 MPC is the priority; until then,
  the pure-Python BGW path keeps the lab dependency-light.

  ## Cryptographic protocol contract

  The MPC mechanism's TranscriptExposureReport (DEC-NASH-002 schema) reports:
  - ``epsilon_measured = MPC_NEGLIGIBLE_BITS`` (set to 1e-9; the
    actual leakage is the cryptographic scheme's negligible function
    in the security parameter, which we encode as a tiny constant
    instead of zero to keep the report schema's ``ge=0``
    constraint satisfied and the comparison with transcript-exposure
    meaningful).
  - ``epsilon_bound = MPC_NEGLIGIBLE_BITS`` (the protocol uses the
    full negligible budget by construction).
  - ``protocol_version = "mpc-bgw/v1"`` so future MPC revisions
    distinguish their reports from this v1.
  - ``sufficiency_note`` carries an explicit note that the leakage
    bound is the cryptographic scheme's negligible-function parameter,
    not an information-theoretic upper bound — distinct from the
    transcript-exposure protocol's contract.

  Compared to transcript exposure (DEC-NASH-002), MPC achieves
  ``epsilon ~ 0`` instead of ``epsilon = R * (N * log_2(3) +
  log_2(K))`` at the cost of (a) higher round count, (b) per-round
  cryptographic operations, (c) external dependencies if/when MP-SPDZ
  is adopted in a follow-up.

  ## Per-run record

  The MPC mechanism's run record (per DEC-NASH-001 R-NASH-010) carries:
  - ``mechanism_id = "weighted_nash_mpc"``
  - ``leakage_report_ref = sha256(canonical_json(TranscriptExposureReport))``
  - Full TranscriptExposureReport stored at
    ``ops/leakage-reports/<run_id>.json`` (same path schema as
    transcript-exposure).

  ## Golden fixture parity contract

  The W5 ship includes golden fixtures at
  ``tests/fixtures/scenarios/nash_mpc_*.json`` exercising the MPC
  mechanism against the same scenarios as the plaintext + bounded
  mechanisms. The MPC allocation must match plaintext within
  ``MPC_NUMERICAL_TOLERANCE = 1e-2`` (looser than plaintext-to-plaintext
  because of fixed-point quantization). The golden test asserts both:
  - MPC and plaintext final allocations match within tolerance
  - MPC transcript-exposure report records ``epsilon_measured <=
    MPC_NEGLIGIBLE_BITS``

  ## Mechanism selector registration

  The new mechanism registers under ``weighted_nash_mpc`` in
  ``src/procurement_lab/algorithms/__init__.py``. SDK
  ``compare_mechanisms`` accepts the identifier without breaking
  existing callers. The CLI demo exposes
  ``--mechanism weighted_nash_mpc``.
alternatives:
  - label: MP-SPDZ as v1 default
    rejected_because: |
      MP-SPDZ is mature + supports N>=3 cleanly, but a ~100MB C++ binary
      as default dependency tilts the lab away from "teach mechanism
      design" toward "ship a research stack". Pure-Python BGW for N=2
      ships in a few hundred LOC, lands fast, and gives the lab a real
      cryptographic mechanism for the 2-party teaching surface. MP-SPDZ
      adopts in a follow-up when N>=3 MPC is the priority.
  - label: SPDZ in pure Python instead of BGW
    rejected_because: |
      SPDZ-style protocols (Damgard, Pastro, Smart, Zakarias 2012) use
      homomorphic-encryption-based offline phases that pay off at
      production scale but add complexity for a teaching lab.
      BGW operates on simple additive secret shares + secure
      multiplication via partial degree reduction; the protocol is
      teachable from first principles and the code stays around
      ~500 LOC. The lab's audience benefits more from BGW's
      readability than from SPDZ's deployment-tier optimizations.
  - label: skip MPC entirely; ship only transcript-exposure
    rejected_because: |
      Spec 0015 R-NASH-008 names the cryptographic MPC mechanism as a
      hard requirement under "no shortcuts, no limitations". Shipping
      only the transcript-exposure mechanism (DEC-NASH-002) leaves the lab
      with one disclosure-limited option, not two. The comparison
      view (transcript-exposure upper bound vs MPC cryptographic
      contract) is exactly the comparison the lab's audience benefits
      from teaching. Skipping MPC means failing the spec's contract.
  - label: claim epsilon_measured = 0 instead of negligible_bits
    rejected_because: |
      The TranscriptExposureReport schema constrains ``epsilon_measured`` to
      ``>= 0``; technically zero is allowed. But the cryptographic
      scheme's actual leakage is a negligible function of the security
      parameter, not exactly zero. Encoding ``epsilon_measured = 0``
      would overclaim the guarantee in the TranscriptExposureReport text record;
      the ``MPC_NEGLIGIBLE_BITS = 1e-9`` value keeps the bookkeeping
      honest while allowing the bounded-vs-MPC comparison view to
      render meaningfully (a 0-vs-1000-bits comparison looks like a
      bug; a 1e-9-vs-1000-bits comparison reads as "the gap is
      unbounded").
  - label: skip the golden-fixture parity contract
    rejected_because: |
      Without parity against plaintext on golden fixtures, the MPC
      mechanism's correctness claim is unverifiable. The 1e-2 tolerance
      accounts for fixed-point quantization; tighter tolerance would
      require a fixed-point representation with more bits and would
      blow the CI runtime. The parity contract is the minimum proof
      that the MPC path returns the same allocation as plaintext.
rationale: |
  Spec 0015 R-NASH-008 is a hard requirement. The user's "no shortcuts,
  no limitations" direction during the 2026-06-01 reset pushes against
  the obvious shortcut (ship only transcript-exposure). At the same time
  the engineering reality is that deployment-tier MPC for N>=3 with
  ranks of LOC and external dependencies overshoots a teaching lab's
  scope.

  The compromise is honest: pure-Python BGW for N=2 covers the
  cryptographic-guarantee surface for the most common teaching
  scenario (buyer + supplier), with a clean N>=3 path documented as a
  follow-up DEC adopting MP-SPDZ when the priority shifts that way.
  The transcript-exposure mechanism (DEC-NASH-002) remains the N>=3
  disclosure-limited option until then.

  The protocol contract (epsilon_measured = negligible, separate
  protocol_version, golden fixture parity at 1e-2 tolerance) is
  explicit so consumers of the TranscriptExposureReport can distinguish bounded
  from MPC at the schema level without inspecting the mechanism
  identifier.

  Reversibility: dropping the MPC mechanism reverts to bounded-only
  behavior. Old golden fixtures + property tests for MPC become
  no-ops; the transcript-exposure tests remain. Future MP-SPDZ adoption
  is additive — adds a second MPC mechanism identifier without
  removing the BGW path.
evidence:
  - kind: spec
    ref: specs/0015-weighted-nash-preference-private/requirements.md
  - kind: decision
    ref: decisions/DEC-NASH-001-weighted-nash-mechanism-parameters.md
  - kind: decision
    ref: decisions/DEC-NASH-002-bounded-leakage-protocol-and-report.md
  - kind: doc
    ref: src/procurement_lab/algorithms/weighted_nash_mpc.py
  - kind: doc
    ref: tests/fixtures/scenarios/nash_mpc_basic.json
rollback: |
  Drop ``src/procurement_lab/algorithms/weighted_nash_mpc.py``. Remove
  the ``weighted_nash_mpc`` identifier from
  ``src/procurement_lab/algorithms/__init__.py`` and from
  ``tests/property/registry.py``. Drop
  ``tests/fixtures/scenarios/nash_mpc_*.json`` and the MPC parity
  test. The R-NASH-008 row stays in the spec_check allowlist (already
  deferred). The transcript-exposure mechanism + plaintext mechanism stay
  untouched.
owner: science.proof-gate-runner
systems_map: |
  Disclosure-limited mechanism design at multiple guarantee tiers —
  one mechanism family with three implementations (plaintext,
  transcript-exposure, MPC) gives the lab's audience three teachable
  comparison points: full revelation, information-theoretic upper
  bound, cryptographic contract. The TranscriptExposureReport schema lets consumers
  compare the three at the data level; the mechanism selector lets
  callers pick by use case. The DEC's "honest non-claim" pattern
  (negligible_bits instead of zero, sufficiency_note carrying the
  protocol's contract verbatim) keeps each guarantee tier's claim
  matched to what its implementation provides.
transferable_principle: |
  Mechanism design libraries that offer multiple privacy tiers must
  fix the schema-level distinction between tiers so consumers can
  reason about the differences without reading the implementation.
  The pattern: one report schema with a protocol_version field; per-
  tier sufficiency_note carrying the contract; per-tier guarantee
  encoded as numerical values that render meaningfully in side-by-
  side comparison.
falsification_test: |
  If the MPC mechanism's final allocation differs from the plaintext
  reference allocation by more than MPC_NUMERICAL_TOLERANCE = 1e-2 on
  any golden fixture, the correctness claim is falsified for that
  fixture. The golden fixture parity test
  ``tests/test_golden_nash.py::test_mpc_matches_plaintext_within_tolerance``
  is the proof surface.
adoption_ladder:
  minimum_viable: |
    weighted_nash_mpc ships with pure-Python BGW for N=2;
    TranscriptExposureReport correctly populated with
    epsilon_measured = MPC_NEGLIGIBLE_BITS;
    golden parity test green; W5 ship.
  mid_adoption: |
    SDK + CLI integration of MPC mechanism (Codex T-MPC-INT-001 +
    T-MPC-INT-002 + T-MPC-INT-003); NegotiateSurface (spec 0016)
    exposes MPC mode; Playwright two-tab covers the MPC flow end-to-end.
  full_adoption: |
    Follow-up DEC adopts MP-SPDZ as second MPC backend for N>=3;
    weighted_nash_mpc grows a backend selector
    ("--mpc-backend bgw|mpspdz"); lab pedagogy includes both
    cryptographic options on the comparison surface; trace-to-eval-
    harness packets include MPC TranscriptExposureReport via the run-evidence
    chain.
  monitoring_signals:
    - "MPC golden-parity test pass/fail trend on main"
    - "weighted_nash_mpc CI runtime trend vs the engine-properties cap"
    - "MPC N=2 vs transcript-exposure N=2 allocation gap on shared fixtures"
    - "MechanismFailure rate on N>=3 MPC requests (signals demand for the MP-SPDZ follow-up DEC)"
---

## decision

procurement-negotiation-lab implements the cryptographic MPC weighted-
Nash mechanism via a pure-Python BGW-style protocol scoped to N=2 for
the W5 ship. N>=3 MPC defers to a follow-up DEC adopting MP-SPDZ as
the cryptographic backend. The TranscriptExposureReport schema
(DEC-NASH-002) extends to carry the MPC mechanism's cryptographic
contract (``epsilon_measured = MPC_NEGLIGIBLE_BITS``, ``protocol_version =
"mpc-bgw/v1"``, sufficiency_note encoding the contract).

## coverage

This DEC resolves the following requirements added to spec
``0015-weighted-nash-preference-private``:

- ``R-NASH-008`` cryptographic MPC second mechanism: pure-Python BGW
  for N=2 ships in W5; TranscriptExposureReport extends with the MPC contract;
  mechanism registers under ``weighted_nash_mpc``; golden fixture
  parity contract at 1e-2 tolerance.

N>=3 MPC remains a follow-up DEC's scope; the transcript-exposure
mechanism (DEC-NASH-002) is the N>=3 disclosure-limited option.
