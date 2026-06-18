# tasks: negotiate-surface engine reconnect

## W0 (Codex lead)

- [x] **T-SPEC-0016-A**: Add this spec ledger and register it in
  `specs/README.md`. *(R-NEGOTIATE-001..006)*
- [x] **T-RESET-001**: Record the local-only contaminated-branch
  abandonment in `ops/RESET_LEDGER.md`.
- [x] **T-RESET-002**: Slim README claims so they point at the active
  W0 reset instead of old roadmap counts.
- [x] **T-RESET-003**: Archive the old product-expansion roadmap and
  replace it with the W0 no-shortcuts roadmap.
- [x] **T-RESET-004**: Add the W0 factory task YAML that future agents
  can run from the factory runtime.
- [x] **T-FACTORY-002**: Add a factory task for the W3 reconnect
  tranche with review checkpoints and W0 gates.

## W3 (Codex lead, Claude review)

- [x] **T-NEG-001**: Define the TypeScript engine contract shared by
  web, mobile, and SDK fixtures. *(R-NEGOTIATE-001)*
- [x] **T-NEG-002**: Reconnect NegotiateSurface to the engine response
path for transcript-exposure weighted-Nash. *(R-NEGOTIATE-002,
  R-NEGOTIATE-004, R-NEGOTIATE-005)*
- [x] **T-NEG-003**: Implement the v1 `?n=` legacy URL translator and
  tests. *(R-NEGOTIATE-003)*
- [x] **T-NEG-004**: Add the mechanism selector with only functional
  options visible. *(R-NEGOTIATE-002)*
- [x] **T-NEG-005**: Add the Playwright two-tab proof for copied URLs.
  *(R-NEGOTIATE-004)*
- [x] **T-LEARN-12**: Add Level 12 as the plain-English introduction
to weighted-Nash, BATNAs, information mode, and exposure reports.
  *(R-NEGOTIATE-005)*

## W4 (paired)

- [x] **T-MP-003**: Extend the SDK multi-party API and fixtures for
  `N >= 2`. *(R-NEGOTIATE-006)*
- [ ] **T-MOB-MP**: Keep mobile parity with the shared contract.
  *(R-NEGOTIATE-006)*

## W5 (Codex lead)

- [ ] **T-MPC-INT-002**: Add MPC mode to NegotiateSurface once
  DEC-MPC-001 chooses the implementation path. *(R-NEGOTIATE-002,
  R-NEGOTIATE-005)*
- [ ] **T-MPC-INT-003**: Add the MPC end-to-end test. *(R-NEGOTIATE-004)*

## Cross-reviews

- [ ] **T-REVIEW-CLAUDE-01**: Claude reviews the W3 math and privacy
  interpretation before the surface reconnect ships.
- [ ] **T-REVIEW-CODEX-MPC**: Codex reviews the W5 MPC integration
  against the selector and URL contract.
