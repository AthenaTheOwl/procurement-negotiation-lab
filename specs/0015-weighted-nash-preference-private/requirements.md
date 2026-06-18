# requirements: weighted-Nash transcript-exposure bargaining

## Scope

Spec 0015 closes the credibility gap on the lab's flagship mechanism
claim. This spec defines the product, protocol, and measurement
requirements for a real weighted-Nash bargaining solver that can run
without sending utility functions to the aggregator, with a
cryptographic multi-party-computation mode available as a second
mechanism.

Spec 0015 is the math and protocol spec. The surface that consumes it
(NegotiateSurface engine reconnect, mechanism selector UI, URL state
translator) is spec 0016. The property and invariant test battery that
proves it is spec 0017.

## Requirements

### R-NASH-001: weighted-Nash bargaining solver

WHEN two or more parties enter bargaining with declared utility
functions, BATNAs, and bargaining-power weights, THE SYSTEM SHALL
return the allocation that maximizes the weighted product of utility
gains above each party's BATNA.

Acceptance:
- The solver lives in `src/procurement_lab/algorithms/weighted_nash.py`.
- The solver returns an allocation that maximizes
  `prod_p (u_p(x) - d_p)^alpha_p` over the feasible set, where `d_p` is
  party `p`'s BATNA and `alpha_p` is its bargaining-power weight.
- The solver handles infeasible problems by returning a structured
  failure with a reason code, not by raising.
- The solver is deterministic for a given input, including tie-breaking.

### R-NASH-002: disagreement-point (BATNA) model

WHEN a party declares a BATNA, THE SYSTEM SHALL treat it as a hard
floor below which the party rejects any allocation.

Acceptance:
- The party schema accepts a BATNA expressed in the same utility units
  as the party's utility function.
- The solver excludes any candidate allocation where any party's
  utility falls below its BATNA from the feasible set.
- The SDK and engine surface a participation report that flags BATNA
  violations explicitly.

### R-NASH-003: bargaining-power weights

WHEN parties declare bargaining-power weights `alpha_p`, THE SYSTEM
SHALL scale each party's contribution to the Nash product by that
weight.

Acceptance:
- Weights are non-negative reals; sum is not required to be one.
- Equal weights reduce to the symmetric Nash bargaining solution.
- The solver documents the weight semantics in `docs/algorithms.md`.
- Property test R-PROP-004 confirms that increasing a party's weight
  weakly improves that party's utility at the solution.

### R-NASH-004: transcript-exposure iteration protocol

WHEN two or more parties participate, THE SYSTEM SHALL run an iterative
protocol that converges to the weighted-Nash allocation without sending
each party's full utility function to the other parties or to any
centralized oracle.

Acceptance:
- The protocol lives in `src/procurement_lab/engine/privacy.py` and is
  invoked by the weighted-Nash solver when `information_mode=private`.
- The protocol exchanges only the messages defined in the protocol
  spec; party utility functions are never transmitted.
- The protocol converges to within a documented numerical tolerance of
  the plaintext weighted-Nash solution under the participation report
  contract.
- The protocol is deterministic given its random seed; the seed is
  part of the per-run record.

### R-NASH-005: transcript-exposure measurement

WHEN the transcript-exposure protocol runs, THE SYSTEM SHALL produce a
per-run report quantifying an upper bound on how much each party's
utility information could be inferred from the messages they sent.

Acceptance:
- The report is a structured object with one entry per party.
- Each entry includes an exposure-bit bound (historically serialized as
  `epsilon_*` for compatibility), the protocol round count, and the
  message log hash.
- The report is part of the per-run record and is exposed in
  the SDK return value and the UI participation report.
- Property test R-PROP-006 confirms that the measured exposure stays
  within the declared per-protocol bound.

### R-NASH-006: transcript-exposure report schema

WHEN any consumer reads a transcript-exposure report, THE SYSTEM SHALL
provide it in a stable machine-readable form.

Acceptance:
- The schema lives in `src/procurement_lab/engine/schemas.py` as a
  Pydantic model and is mirrored in JSON Schema under the historical
  compatibility path `ops/schemas/leakage-report.schema.json`.
- The schema is validated against by the run-evidence packet emitter
  (DEC-FACTORY-007 chain).
- Spec 0017 R-PROP-006 references this schema for its invariant tests.

### R-NASH-007: multi-party generalization

WHEN `N >= 2` parties enter bargaining, THE SYSTEM SHALL run weighted-
Nash bargaining without code paths that special-case `N = 2`.

Acceptance:
- The solver accepts party counts from 2 through 10 inclusive.
- No `NotImplementedError` branch fires for `N > 2` (existing engine
  branches that hard-fail at `N > 2` are lifted).
- The SDK demo and Playwright two-tab test both exercise an `N = 3`
  scenario.
- Spec 0017 R-PROP-002, R-PROP-004, and R-PROP-008 run their batteries
  at `N in {2, 3, 5}`.

### R-NASH-008: cryptographic MPC second mechanism

WHEN a session selects `privacy_mode=mpc`, THE SYSTEM SHALL run a
secure-multi-party-computation protocol that returns the weighted-Nash
allocation with a cryptographic protocol contract, not iterative
transcript-exposure accounting.

Acceptance:
- The MPC mechanism lives in
  `src/procurement_lab/algorithms/weighted_nash_mpc.py`.
- The MPC mechanism returns the same allocation as the plaintext
  weighted-Nash solver to within a documented numerical tolerance on
  the golden fixture suite.
- The MPC mechanism reports the cryptographic scheme's negligible-
  function parameter in its exposure report.
- The mechanism is exposed through the SDK mechanism selector and the
  UI mechanism selector (spec 0016).
- The MPC mechanism does not gate W2 ship of the transcript-exposure
  mechanism; its W5 schedule is owned by DEC-MPC-001.

### R-NASH-009: mechanism selector exposed in SDK

WHEN a developer calls the SDK, THE SYSTEM SHALL let the caller choose
among bargaining mechanisms — transcript-exposure weighted-Nash, MPC
weighted-Nash, ADMM, centralized oracle, baseline alternatives —
through a stable parameter.

Acceptance:
- `compare_mechanisms()` accepts a list of mechanism names that
  includes the new identifiers `weighted_nash_bounded` and
  `weighted_nash_mpc`.
- The CLI demo exposes `--mechanism` with the same identifiers.
- Each mechanism returns the same allocation schema, so callers can
  diff outputs without per-mechanism branching.

### R-NASH-010: per-run record references mechanism + exposure

WHEN a run completes, THE SYSTEM SHALL include the mechanism identifier
and the exposure report (or its hash) in the per-run record consumed by
the run-evidence packet emitter.

Acceptance:
- The run record adds `mechanism_id` (matching R-NASH-009 identifiers)
  and `leakage_report_ref` fields.
- The event ledger contains a `mechanism.bargaining.completed` event
  carrying the mechanism id and exposure summary.
- The replay-determinism gate covers runs that use transcript-exposure and
  MPC mechanisms in addition to the existing oracle and ADMM runs.

## Out of scope

- Mechanism design for auctions, matching, or single-party optimization
  (covered elsewhere or not in this lab).
- LLM-judged mechanism comparison (DEC-MCPSEC-002 rejected the broader
  LLM-judge framing; the same reasoning applies here).
- Public broadcast of party utility functions for pedagogical
  visualization (covered in spec 0001 polished simulator's transparent
  mode and excluded from the private-mode protocol here).
- Continuous renegotiation / multi-round dynamics (handled by the
  existing rounds infrastructure in `engine/rounds.py`; the protocol
  in R-NASH-004 is single-bargaining-instance).
