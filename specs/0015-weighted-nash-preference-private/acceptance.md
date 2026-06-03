# acceptance: weighted-Nash preference-private bargaining

## Acceptance gates

Spec 0015 ships when every gate below passes on a clean checkout of
the merge commit that closes the spec.

### Engine + algorithm

- `python -m uv run pytest tests/test_weighted_nash.py` passes with
  the unit tests covering plaintext, bounded-leakage, and MPC paths.
- `python -m uv run pytest tests/engine/test_privacy.py` passes
  covering the LeakageReport schema and the bounded-leakage iteration
  bookkeeping.
- `python -m uv run pytest tests/test_golden_nash.py` passes against
  the locked golden fixture suite under `tests/fixtures/scenarios/`.
- `python -m uv run pytest tests/property/test_weighted_nash_properties.py`
  passes (covers spec 0017 R-PROP-002, R-PROP-003, R-PROP-004,
  R-PROP-008 for weighted-Nash mechanisms).
- `python -m uv run pytest tests/property/test_leakage_bound.py`
  passes (covers spec 0017 R-PROP-006 for both bounded-leakage and
  MPC).

### SDK + CLI

- `python -m procurement_mechanism_sdk.demo --mechanism weighted_nash_bounded`
  prints a deterministic allocation + leakage report.
- `python -m procurement_mechanism_sdk.demo --mechanism weighted_nash_mpc`
  prints a deterministic allocation + cryptographic leakage report.
- `compare_mechanisms(..., mechanisms=["weighted_nash_bounded",
  "weighted_nash_mpc", "admm", "oracle"])` returns a comparable
  result set with no per-mechanism branching in the caller.

### Multi-party

- An `N = 3` scenario runs end-to-end through `weighted_nash_bounded`
  with a valid allocation, valid leakage report, and no
  `NotImplementedError`.
- The Playwright two-tab test for spec 0016 covers the `N = 2`
  bounded-leakage and `N = 2` MPC flows; the `N = 3` test runs
  through the SDK CLI rather than the UI in this spec cycle.

### Per-run record + replay

- The run-evidence packet emitter writes `mechanism_id` and
  `leakage_report_ref` to the run record (DEC-FACTORY-007 chain).
- The event ledger records a `mechanism.bargaining.completed` event
  carrying the mechanism id and the leakage epsilon.
- The replay-determinism gate green for at least one run per
  mechanism identifier introduced in R-NASH-009.

### Build + lint

- `npm.cmd run build` passes for the web app (TS engine mirror
  compiles).
- `python scripts/voice_lint.py` clean across all docs touched by
  the spec.
- `python scripts/spec_check.py` clean (spec 0015 + 0017 listed in
  `specs/README.md`; R-NASH-* mapped to DECs or allowlisted).
- `python scripts/validate_decisions.py` clean (DEC-NASH-001,
  DEC-NASH-002, DEC-MPC-001 land with systems-thinking fields).

### Browser QA

- Browser QA pass on the negotiate-surface MPC + bounded-leakage
  flows once spec 0016 reconnects the engine (cross-spec gate; this
  spec's acceptance defers the UI portion to spec 0016's acceptance).
