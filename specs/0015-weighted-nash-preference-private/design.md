# design: weighted-Nash preference-private bargaining

## Approach

The mechanism layer adds two new bargaining algorithms beside the
existing oracle / ADMM / baselines: a bounded-leakage iterative
weighted-Nash solver (default), and a cryptographic multi-party-
computation weighted-Nash solver (W5 lane). Both return allocations
in the existing engine schema and emit through the existing run-
record + event-ledger chain.

## Algorithm: weighted-Nash plaintext (reference)

Given parties `p in P`, utility functions `u_p`, BATNAs `d_p`,
weights `alpha_p`, and the feasible allocation set `X`, return:

    argmax over x in X of prod_p (max(u_p(x) - d_p, 0))^alpha_p

For the reference plaintext solver the feasible set is discretized
to a quantization grid; the discretization parameter
`NASH_QUANTIZATION_LEVELS` is documented in DEC-NASH-001 and is the
same parameter consumed by the TS engine mirror for parity (R-PROP-
011). Tie-breaking is lexicographic on party index to guarantee
determinism (R-PROP-003).

Infeasibility — every candidate violates some BATNA, capacity, or
dealbreaker — returns a structured `MechanismFailure` with reason
`infeasible_no_feasible_allocation` (R-PROP-009).

## Algorithm: bounded-leakage iterative protocol

Parties never transmit their full utility function. Each round, every
party transmits only:
1. A gradient direction (signed unit vector over the allocation
   coordinates) computed from its local utility.
2. A scalar step proposal bounded by the protocol's step-size schedule.

The protocol aggregates direction vectors using the weighted-Nash
first-order optimality condition and broadcasts the next candidate
allocation. Convergence stops when no party proposes a step that
strictly improves its utility above tolerance.

Leakage measurement (R-NASH-005) bounds the information a transcript
of these messages reveals about each party's utility, expressed as an
epsilon value with a documented worst-case derivation per party.
DEC-NASH-002 fixes the leakage-bound derivation; spec 0015 references
that derivation directly instead of redoing it inline.

## Algorithm: cryptographic MPC mechanism (W5)

The MPC mechanism implements the same plaintext objective using a
secure-multi-party-computation protocol. Two implementation paths are
evaluated in `research.md`: MP-SPDZ (mature, requires external binary)
and a pure-Python BGW-style protocol for 2-party (smaller dependency
surface, weaker scalability). DEC-MPC-001 picks the path and pins the
implementation choice; spec 0015 references that choice.

Correctness is verified against the plaintext solver on a golden
fixture suite (R-NASH-008 acceptance). Leakage reports for the MPC
mechanism record the cryptographic scheme's negligible-function
parameter, not an iteration-derived epsilon.

## Schemas

- LeakageReport (R-NASH-006) lives in
  `src/procurement_lab/engine/schemas.py` as a Pydantic model and is
  mirrored to `ops/schemas/leakage-report.schema.json` for the run-
  evidence packet emitter.
- Run-record extension (R-NASH-010) adds `mechanism_id` and
  `leakage_report_ref` to the existing run-record schema in
  `ops/schemas/run-record.schema.json`.

## Integration with existing engine

The new mechanisms register through the existing mechanism registry in
`src/procurement_lab/algorithms/__init__.py`. SDK consumers
(`compare_mechanisms`, CLI demo) gain new mechanism identifiers per
R-NASH-009 without API breakage; existing identifiers and behavior
remain.

The TypeScript mirror lives in
`packages/engine/src/model/weightedNash.ts` and reads
`packages/engine/src/weighted_nash_params.json`, the same parameter
mirror referenced by DEC-NASH-001. It mirrors the Python plaintext
grid search and bounded-leakage protocol, including transcript hashes,
so the deployed app can run the mechanism without a Python service
while later parity tests compare the two implementations directly.

The NegotiateSurface engine reconnect (spec 0016) consumes this spec's
mechanism selector and leakage report. Spec 0015 does not modify the
UI directly; it provides the API surface that spec 0016 wires.

## Open decisions (resolved or in-flight)

- DEC-NASH-001 (in-flight, W2): mechanism choice + quantization parameter
- DEC-NASH-002 (in-flight, W2): leakage-bound derivation + numerical
  tolerance
- DEC-MPC-001 (in-flight, W5): MPC implementation path choice

## References

See `research.md` for the bibliography. Highlights:
- Nash (1950) for the original axiomatic bargaining solution
- Kalai (1977) for the asymmetric/weighted generalization
- Bogetoft et al. (2009) for MPC in commercial bargaining contexts
- Lindell + Pinkas (2008) for survey on MPC primitives we evaluate
