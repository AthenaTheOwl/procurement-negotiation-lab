# product expansion roadmap

The active roadmap is the W0 no-shortcuts reset. Specs 0015, 0016,
and 0017 define the next product arc:

- weighted-Nash bargaining and preference privacy in the engine
- NegotiateSurface reconnect with a real versioned URL adapter
- property tests for the engine claims
- `N >= 2` bargaining instead of a two-party ceiling
- bounded-leakage privacy first, MPC privacy as a second mechanism

The May roadmap for specs 0005-0008 is archived at
`docs/archive/2026-05-product-expansion-roadmap.md`.

## W0 complete surface

- `specs/0015-weighted-nash-preference-private/` defines the math and
  protocol scope.
- `specs/0016-negotiate-surface-engine-reconnect/` defines the web,
  URL, selector, and two-tab proof scope.
- `specs/0017-engine-property-test-battery/` defines the property-test
  proof layer.
- `ops/factory-tasks/w0-codex-cleanup-tranche-a.yaml` records the
  Codex W0 factory handoff.

## W1-W2

- Build the property battery scaffold and first four invariants.
- Implement bounded-leakage weighted-Nash in Python.
- Mirror the TypeScript engine path for deployed-web parity.
- Wire the property CI job.

## W3

- Reconnect NegotiateSurface to the engine contract.
- Add the real legacy `?n=` to `?neg=` URL translator.
- Add a functional mechanism selector.
- Add the copied-URL two-tab Playwright proof.

## W4

- Lift the engine and SDK paths to `N >= 2`.
- Exercise `N = 3` through SDK CLI and browser proof.
- Keep mobile parity on the same contract shape or an explicit adapter.

## W5

- Ship the MPC lane after DEC-MPC-001 chooses the implementation path.
- Add golden fixtures comparing MPC against plaintext weighted-Nash.
- Add MPC mode to SDK and NegotiateSurface.

## W6

- Add replay-determinism and chaos tests over the new engine flows.
- Create the release ledger entry.
- Run the dream retrospective over the reset.
