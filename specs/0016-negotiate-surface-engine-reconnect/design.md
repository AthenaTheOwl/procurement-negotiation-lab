# design: negotiate-surface engine reconnect

## Approach

The existing NegotiateSurface has a useful browser contract: state
lives in the URL, two tabs can sync by link, and the visitor can run
the flow without a backend. Spec 0016 preserves that boundary while
replacing the offer-only session with a typed engine session.

The contract has three layers:

1. **Surface state** - session id, parties, current role, history, and
   selected mechanism.
2. **Engine packet** - party packet, mechanism id, privacy mode, seed
   or determinism data when available, and prior engine response.
3. **Evidence packet** - leakage report ref, participation report,
   run-report export ref, and browser proof metadata.

The contract lives in the shared engine package so web, mobile, and
SDK fixtures can share it.

## URL versions

The current URL shape is `?n=<base64url-json>` and decodes through
`packages/engine/src/learn/negotiationSession.ts`. Spec 0016 adds a
new shape:

```text
?neg=<base64url-json>
```

The payload includes a version field and a `mechanism` object. The
legacy adapter reads `?n=`, decodes v1, maps it to the new state, then
rewrites history to `?neg=`. The adapter does not show a banner in
place of translation; it translates or fails closed.

## Mechanism selector

The selector reads the registered mechanism list from the engine
contract. A mechanism appears only when its engine path exists. The
display order for W3 is:

1. bounded-leakage weighted-Nash
2. ADMM
3. centralized oracle
4. MPC weighted-Nash once W5 lands

The selector stores the chosen mechanism in URL state and feeds it to
the engine packet.

## Two-tab flow

Playwright owns the primary proof. The test opens two pages, seeds the
buyer tab, copies the URL, opens it in the supplier tab, submits a
counterpacket, and verifies the buyer tab can accept the result. The
proof path uses copied URLs; BroadcastChannel sync remains an
enhancement, not the acceptance gate.

## Report path

Engine responses include a report object that the existing run-report
path can export. The UI does not rebuild leakage or participation
status from display strings; it renders fields from the engine
response.

## Relationship to W4 and W5

W3 ships the two-party flow. W4 lifts the same contract to `N >= 2`.
W5 adds the MPC mechanism path and UI selector entry. The contract is
versioned so each lift is explicit.
