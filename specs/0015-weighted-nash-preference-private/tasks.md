# tasks: weighted-Nash preference-private bargaining

## W2 (Claude lead, Codex parity reviewer)

- A1: Author DEC-NASH-001 — mechanism choice, quantization parameter,
  numerical tolerance.
- A2: Author DEC-NASH-002 — leakage-bound derivation for the bounded-
  leakage iterative protocol.
- A3: Implement `src/procurement_lab/engine/privacy.py` and the
  LeakageReport Pydantic model + JSON Schema mirror.
- A4: Implement `src/procurement_lab/algorithms/weighted_nash.py`
  (plaintext reference + bounded-leakage iterative protocol).
- A5: Register the new mechanism identifiers in the algorithms
  registry and extend `compare_mechanisms` and the CLI demo.
- A6: Extend the run-record schema with `mechanism_id` +
  `leakage_report_ref` and emit through the existing event-ledger
  chain.
- A7: Author math chapters in `docs/algorithms.md` covering the
  plaintext objective, the bounded-leakage protocol, and the leakage-
  bound derivation referenced in DEC-NASH-002.

## W2 (Codex lead, Claude parity reviewer)

- [x] B1: Implement the TypeScript engine mirror under
  `packages/engine/src/model/weightedNash.ts` so the deployed app can
  run plaintext and bounded-leakage solvers client-side at parity with
  the Python implementation.
- B2: Stand up the engine-properties CI workflow under
  `.github/workflows/engine-properties.yml` (defined in spec 0017
  R-PROP-007; W2 wires the workflow itself, populated by spec 0017's
  property tests).

## W4 (paired across both agents)

- [ ] C1: Lift the existing ADMM and oracle implementations to handle
  `N >= 2` parties; remove the `NotImplementedError` branches at
  `N > 2` (R-NASH-007). Centralized oracle and weighted-Nash wrappers
  are live; ADMM remains for Claude's W4 lane.
- [x] C2: Extend SDK + CLI multi-party support so `compare_mechanisms`
  accepts `N` and demos exercise `N = 3`.
- [ ] C3: Mobile parity for multi-party scenarios so the Expo app does
  not regress against the web app.

## W5 (Claude lead, Codex integration reviewer) — MPC lane

- D1: Author DEC-MPC-001 — MPC implementation path choice (MP-SPDZ vs
  pure-Python BGW for 2-party).
- D2: Implement
  `src/procurement_lab/algorithms/weighted_nash_mpc.py` per the
  DEC-MPC-001 path choice.
- D3: Golden fixture suite proving MPC and plaintext match within
  tolerance (R-NASH-008 acceptance).
- D4: Property tests in `tests/property/test_leakage_bound.py`
  cover the MPC mechanism (spec 0017 R-PROP-006).

## W5 (Codex lead, Claude review)

- E1: SDK integration of the MPC mechanism through
  `compare_mechanisms` and CLI demo (`--mechanism weighted_nash_mpc`).
- E2: NegotiateSurface UI selector exposes MPC mode (spec 0016).
- E3: Playwright two-tab test runs the MPC flow end-to-end.

## Cross-reviews

Every task above has a paired cross-review task on the other side.
The execution pack (CODEX_EXECUTION_PACK.md / CLAUDE_EXECUTION_PACK.md
in `_factory-resets/2026-06-01/per-pilot/procurement-negotiation-
lab/`) names every `T-REVIEW-CLAUDE-*` and `T-REVIEW-CODEX-*` task ID.
