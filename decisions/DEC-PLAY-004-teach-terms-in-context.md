---
id: DEC-PLAY-004-teach-terms-in-context
spec: specs/0001-polished-simulator/
requirement: R-PLAY-004
date: 2026-05-24
status: approved
reversible: true
decision: |
  When the simulator uses a technical term (utility, residual, risk
  score, oracle gap, ADMM, CBT, information mode), the definition
  lands inline at the point of use: in a tooltip-style explainer
  attached to the metric, in a sentence under the reveal, or in the
  intro card on the Level that introduces the term. The shared
  glossary lives in `packages/engine/src/data/glossary.ts`; the surface
  code reads from that single source instead of restating definitions.
  No term ships without a definition nearby.
alternatives:
  - label: standalone glossary index page
    rejected_because: |
      A glossary index page parks definitions away from where the
      learner meets them. The learner has to leave the Level, find
      the index, find the term, and return; that round trip is
      where engagement leaks. Inline definitions keep the learner
      on the lesson screen.
  - label: separate glossary page linked from the nav bar
    rejected_because: |
      A nav-bar glossary still requires the learner to interrupt the
      Level. The friction is smaller than a standalone page but
      still nonzero, and the spec asks for definitions "at point of
      use" instead of "available somewhere."
  - label: no glossary at all
    rejected_because: |
      The audience is newcomers to procurement; shipping ADMM and
      residual without definitions assumes the audience the
      simulator is built to teach. The spec names seven terms that
      MUST carry definitions; dropping the glossary breaks that
      contract.
rationale: |
  Just-in-time learning beats just-in-case learning on this surface.
  The shared `glossary` map in `packages/engine/src/data/glossary.ts`
  carries one definition per term; the surface code reads from it
  (the sandbox surface uses `ExplainedMetric help={glossary.utility}`
  and the inline `glossary[term]` reads in `SandboxApp.tsx`) so the
  definitions live next to the metrics they explain. The learn
  surface's intro cards introduce a term on the Level that first
  uses it, then later Levels carry the same definitions via the
  same primitives. The single source means a definition update lands
  everywhere at once, and no surface drifts from the shared text.
evidence:
  - kind: spec
    ref: specs/0001-polished-simulator/requirements.md
  - kind: doc
    ref: packages/engine/src/data/glossary.ts
  - kind: doc
    ref: apps/web/src/surfaces/sandbox/SandboxApp.tsx
  - kind: doc
    ref: apps/web/src/primitives/LevelShell.tsx
rollback: |
  Move the glossary definitions out of
  `packages/engine/src/data/glossary.ts` into a standalone glossary
  page under `apps/web/src/surfaces/glossary/` and add a nav-bar link
  to it. Strip the inline `help={glossary[term]}` props from the
  sandbox metrics and the learn-surface intro cards. The page becomes
  the single landing place for definitions; the inline reads go away.
owner: product
---

## decision

When the simulator uses a technical term, the definition lands inline
at the point of use: a tooltip-style explainer on the metric, a
sentence under the reveal, or the intro card on the Level that
introduces the term. The shared glossary lives in
`packages/engine/src/data/glossary.ts`; the surface code reads from
that single source instead of restating definitions.

## alternatives

- Standalone glossary index page — parks definitions away from where
  the learner meets them and forces a round trip away from the
  Level.
- Separate glossary page linked from the nav bar — still interrupts
  the Level; the spec asks for definitions at point of use.
- No glossary at all — drops a contract the spec names and assumes
  the audience the simulator is built to teach.

## rationale

Just-in-time learning beats just-in-case learning on this surface.
The shared `glossary` map carries one definition per term; the
surface code reads from it so definitions live next to the metrics
they explain. The single source means a definition update lands
everywhere at once and no surface drifts from the shared text.

## evidence

- `specs/0001-polished-simulator/requirements.md` — R-PLAY-004 names
  the seven terms that MUST carry definitions at point of use.
- `packages/engine/src/data/glossary.ts` — the shared definition map
  and the `termOrder` reading order.
- `apps/web/src/surfaces/sandbox/SandboxApp.tsx` — the inline
  `ExplainedMetric help={glossary[term]}` reads and the
  `glossary[term]` lookups in the explainer panels.
- `apps/web/src/primitives/LevelShell.tsx` — the intro card slot the
  Level files render their definitions into.

## rollback

Move glossary definitions out of `packages/engine/src/data/glossary.ts`
into a standalone glossary page under
`apps/web/src/surfaces/glossary/` and add a nav-bar link. Strip the
inline `help={glossary[term]}` props from the sandbox metrics and
the learn intro cards. The page becomes the single landing place;
inline reads go away.
