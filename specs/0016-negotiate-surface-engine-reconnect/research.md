# research: negotiate-surface engine reconnect

## Repo scan

The live two-party surface is in
`apps/web/src/surfaces/negotiate/NegotiateSurface.tsx`. It already has
the right public boundary for a no-backend bargaining demo:

- role choice
- offer submit
- URL copy
- partner open
- accept-confirm
- BroadcastChannel sync for local two-tab convenience

The state codec is in
`packages/engine/src/learn/negotiationSession.ts`. It encodes a v1
`NegotiationState` into `?n=<base64url-json>`, caps history, validates
roles, preserves UTF-8 notes, and rejects tampered versions. That is
the legacy input the W3 adapter must translate.

The older participant share codec in
`packages/engine/src/learn/shareEncoder.ts` is useful precedent for a
versioned URL payload with role validation and parameter clamping.

## Local conclusions

- The URL path should remain the state boundary. It makes the demo
  inspectable and avoids backend scope.
- The new contract belongs in the shared engine package, not in React.
  Web, mobile, and SDK fixtures need the same shape.
- The selector cannot list future mechanisms as disabled UI. It must
  read functional engine registrations.
- The v1 translator is a real adapter, not a banner. A valid old link
  should open and rewrite itself.

## External references

- Nash (1950) and Kalai (1977), already cited in spec 0015, define
  the bargaining objective the surface selects.
- MP-SPDZ docs, cited in spec 0015, inform the W5 MPC selector path.
- Playwright multi-page tests are the practical proof path for copied
  URLs and two-tab behavior.

## Open questions

1. Whether `?neg=` should compress the v2 payload. W3 can start with
   base64url JSON and add compression only if copied URLs become too
   long.
2. Whether the report export should reuse existing run-report IDs or
   create a negotiation-specific report type. W3 should reuse the
   current run-report path unless tests expose a schema gap.
3. Whether the mobile surface should use the same v2 URL shape or a
   wrapper around it. W4 owns that parity call.
