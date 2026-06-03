---
id: DEC-NEGOTIATE-001-versioned-surface-contract-before-engine-reconnect
spec: specs/0016-negotiate-surface-engine-reconnect/
requirement: R-NEGOTIATE-001
date: 2026-06-03
status: approved
reversible: true
decision: |
  NegotiateSurface reconnects to the mechanism engine through a
  versioned shared-engine contract before any React wiring lands. The
  contract owns session state, mechanism id, privacy mode, engine
  packet, leakage report reference, and report-export fields.
alternatives:
  - label: Wire weighted-Nash directly into the React component
    rejected_because: |
      Direct component wiring would hide the state contract inside
      view code and make mobile, SDK, and URL fixtures drift. The
      shared contract keeps the surface, SDK, and tests on the same
      shape.
  - label: Keep old links behind a warning banner
    rejected_because: |
      A banner preserves the problem. Valid old `?n=` links should
      translate into the new shape or fail closed with a recovery
      action.
  - label: Show future mechanisms as disabled selector options
    rejected_because: |
      Disabled entries turn the selector into roadmap copy. The
      selector should list only mechanisms with an executable engine
      path.
rationale: |
  Specs 0015 and 0017 define the math and proof layer. Spec 0016 is
  the state boundary that lets the web surface consume that work
  without mixing URL compatibility, mechanism ids, leakage reports,
  and React state. The versioned contract makes W3 smaller because
  every consumer has the same packet shape before UI wiring starts.

  This also protects old public links. The current surface already
  encodes state as `?n=<base64url-json>`. W3 replaces that with a new
  `?neg=` shape, but valid old links still deserve a real adapter.
  Translation is reversible: remove the adapter and contract module,
  and the surface returns to the current v1 `NegotiationState` shape.
evidence:
  - kind: spec
    ref: specs/0016-negotiate-surface-engine-reconnect/requirements.md
  - kind: spec
    ref: specs/0015-weighted-nash-preference-private/requirements.md
  - kind: spec
    ref: specs/0017-engine-property-test-battery/requirements.md
  - kind: doc
    ref: apps/web/src/surfaces/negotiate/NegotiateSurface.tsx
  - kind: doc
    ref: packages/engine/src/learn/negotiationSession.ts
rollback: |
  Delete the shared contract module and translator tests from the W3
  implementation, remove spec 0016 from `specs/README.md`, and drop
  the R-NEGOTIATE-* allowlist rows. Existing `?n=` URL decoding
  remains in `negotiationSession.ts`.
owner: engineering.implementation
systems_map: |
  Browser negotiation state crosses four systems: copied URLs,
  shared TypeScript engine modules, React view state, and SDK/mobile
  fixtures. A versioned contract makes that boundary explicit before
  mechanism code reaches the page.
transferable_principle: |
  When a UI consumes a new engine with public link state, define the
  versioned state contract first. Then the UI, mobile client, SDK,
  and tests can all consume the same packet shape.
falsification_test: |
  If W3 requires separate web-only, mobile-only, or SDK-only packet
  fields for the same negotiation concept, the shared contract failed
  and should be split or redesigned.
adoption_ladder:
  minimum_viable: |
    Spec 0016 and this DEC land; old roadmap framing is archived.
  mid_adoption: |
    W3 implements the contract, legacy translator, selector, and
    two-tab proof for bounded-leakage weighted-Nash.
  full_adoption: |
    W4 lifts the contract to `N >= 2`; W5 adds MPC mode; SDK, web,
    and mobile parity fixtures all share the same contract.
  monitoring_signals:
    - "number of contract-specific adapters in web/mobile/SDK"
    - "Playwright two-tab pass/fail trend"
    - "URL translator failures by fixture class"
    - "mechanism selector entries without executable engine paths"
---

## decision

NegotiateSurface reconnects to the mechanism engine through a
versioned shared-engine contract before any React wiring lands. The
contract owns session state, mechanism id, privacy mode, engine
packet, leakage report reference, and report-export fields.

## coverage

This DEC resolves R-NEGOTIATE-001 directly and covers
R-NEGOTIATE-002 through R-NEGOTIATE-006 collectively until the W3-W5
implementation DECs land. The implementation DECs should remove the
matching allowlist rows as each requirement becomes code-backed.
