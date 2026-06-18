# requirements: negotiate-surface engine reconnect

## Scope

Spec 0016 reconnects the share-by-URL negotiation surface to the
mechanism engine introduced by specs 0015 and 0017. The current
NegotiateSurface is a two-party link exchange: each browser posts an
offer, copies a URL, and waits for the partner. The W3 surface must
become a real mechanism workbench: mechanism selection, legacy URL
translation, engine counterpacket generation, exposure display, and
two-tab proof.

Spec 0015 owns the weighted-Nash and transcript-exposure math. Spec 0017 owns the
property battery. Spec 0016 owns the web, URL, and end-to-end state
contract.

## Requirements

### R-NEGOTIATE-001: versioned surface engine contract

WHEN the web surface calls the bargaining engine, THE SYSTEM SHALL use
a versioned TypeScript contract that carries the session state,
party packets, mechanism id, information mode, exposure report reference,
and engine response in one typed payload.

Acceptance:
- The contract lives under `packages/engine/src/learn/` or a sibling
  engine module, not inside a React component.
- The contract version is explicit and increments on incompatible
  URL or packet shape changes.
- The contract names the mechanism ids from spec 0015 R-NASH-009.
- Unit tests reject unknown contract versions and unknown mechanism ids.

### R-NEGOTIATE-002: functional mechanism selector

WHEN a user opens the negotiate surface, THE SYSTEM SHALL present a
mechanism selector whose listed mechanisms all execute real engine
paths.

Acceptance:
- The selector includes transcript-exposure weighted-Nash, MPC
  weighted-Nash, ADMM, and centralized oracle once their engine paths
  land.
- No selector option is a disabled placeholder.
- Selecting a mechanism changes the engine response, run evidence, or
  exposure report in a visible way.
- The selected mechanism is encoded in the share URL and restored on
  page load.

### R-NEGOTIATE-003: legacy URL translator

WHEN a user opens an old `?n=<encoded-session>` link, THE SYSTEM SHALL
decode the v1 `NegotiationState`, translate it into the new versioned
surface state, and redirect or replace history with the new URL shape.

Acceptance:
- Valid v1 links continue to open.
- The translator preserves session id, round history, offers, role
  accept states, and note text.
- Invalid or tampered v1 links fail closed with a visible recovery
  action.
- The translator has unit tests for valid v1, invalid base64, unknown
  roles, oversized history, and UTF-8 notes.

### R-NEGOTIATE-004: two-tab engine round trip

WHEN buyer and supplier use two browser tabs, THE SYSTEM SHALL let one
party submit a packet, let the partner open the link, run the chosen
engine path, and return a counterpacket or accept decision without a
backend.

Acceptance:
- Playwright covers the two-tab flow for transcript-exposure weighted-Nash.
- The partner tab sees the mechanism response and can counter from it.
- The final accepted deal records the mechanism id and information mode.
- The flow works with copied URLs; BroadcastChannel sync is optional
  and cannot be the only proof path.

### R-NEGOTIATE-005: exposure and participation report in the UI

WHEN a disclosure-limited mechanism runs, THE SYSTEM SHALL show the exposure and
participation report beside the proposed deal.

Acceptance:
- The report names the mechanism id, information mode, exposure bound or
  cryptographic parameter, BATNA status, and no-worse-off status.
- Reports are tied to the engine response, not manually duplicated in
  React state.
- The report can be exported into the existing run-report path.
- Tests cover the visible report for transcript-exposure and MPC modes.

### R-NEGOTIATE-006: mobile and SDK parity

WHEN the web surface ships the reconnect, THE SYSTEM SHALL keep the
SDK and mobile surfaces aligned on the same contract shape.

Acceptance:
- The SDK CLI can run the same mechanism ids as the web surface.
- Mobile either uses the same package contract or carries a documented
  adapter with equivalent fields.
- `N = 3` scenarios run through the SDK CLI before the W4 multi-party
  surface work begins.
- Parity tests compare web contract fixtures against SDK fixtures.

## Out of scope

- Implementing the weighted-Nash algorithms themselves (spec 0015).
- Implementing the property battery (spec 0017).
- Adding a backend service. The surface remains URL- and local-state
  based for this pass.
- Hiding engine uncertainty. If a mechanism is unavailable, it is not
  listed in the selector until its engine path exists.
