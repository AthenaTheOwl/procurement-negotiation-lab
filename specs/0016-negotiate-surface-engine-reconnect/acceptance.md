# acceptance: negotiate-surface engine reconnect

## Acceptance gates

Spec 0016 ships when every gate below passes on a clean checkout of
the merge commit that closes the W3 reconnect.

### Contract and URL adapter

- `npm.cmd run test --workspace=@lab/engine -- negotiationSession` passes
  with v1 legacy translation and v2 contract tests.
- Unknown URL versions and malformed base64 links fail closed with a
  visible recovery action.
- Valid v1 `?n=` links rewrite to the v2 `?neg=` shape without losing
  session id, history, offers, role acceptance state, or UTF-8 notes.

### Surface

- `npm.cmd run test --workspace=@lab/web -- NegotiateSurface` passes
  with the mechanism selector, leakage report, and report-export
  assertions.
- `npm.cmd run test --workspace=@lab/web -- Level12` passes with the
  weighted-Nash, BATNA, privacy-mode, and leakage-report learning
  proof.
- No mechanism selector entry is visible until its engine path exists.
- The selected mechanism survives copy-link, page reload, and partner
  open.

### End-to-end browser proof

- Playwright opens two independent tabs and proves buyer to supplier
  to buyer flow by copied URLs.
- The proof covers bounded-leakage weighted-Nash in W3.
- The proof covers MPC mode in W5 after DEC-MPC-001 lands.
- BroadcastChannel sync is not used as the only proof path.

### SDK and mobile parity

- `python -m procurement_mechanism_sdk.demo --mechanism weighted_nash_bounded`
  prints a deterministic allocation and leakage report.
- `python -m procurement_mechanism_sdk.demo --mechanism weighted_nash_mpc`
  prints a deterministic allocation and cryptographic leakage report
  after the W5 lane lands.
- Mobile contract fixtures match the web contract fixtures or carry a
  documented adapter with equivalent fields.

### Governance and build

- `python -m uv run pytest` passes.
- `npm.cmd run build` passes.
- `python scripts/spec_check.py` passes.
- `python scripts/voice_lint.py` passes.
- `python scripts/validate_decisions.py` passes.
- Browser QA records the final W3 two-tab surface proof.
