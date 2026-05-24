---
id: DEC-PLAY-003-consequence-before-math
spec: specs/0001-polished-simulator/
requirement: R-PLAY-003
date: 2026-05-24
status: approved
reversible: true
decision: |
  When a learn-surface Level reveals the result of a choice, the reveal
  panel renders the plain-English consequence first and parks any
  numeric quantities, residuals, utilities, or gaps under an explicit
  "under the hood" section beneath the consequence. The `LevelShell`
  primitive in `apps/web/src/primitives/LevelShell.tsx` ships the
  reveal slot; each Level fills the slot with the consequence
  paragraph at the top and the math at the bottom.
alternatives:
  - label: math first, consequence second
    rejected_because: |
      A math-first reveal trains the learner to read numbers before
      they have a story to hang the numbers on. The learn surface is
      built for newcomers to procurement; the first job is naming
      what happened in business language so the math has somewhere to
      land. Math-first inverts that order and turns each reveal into
      a quiz on numeric literacy instead of a lesson on procurement.
  - label: math only, with no plain-English consequence
    rejected_because: |
      A math-only reveal forces the learner to interpret residuals,
      utilities, and gaps without the verbal cue that connects the
      number to the story. The lab surface
      (`apps/web/src/surfaces/sandbox/`) offers a math-rich view for
      readers who already speak the language; the learn surface
      cannot adopt the same shape without losing its audience.
  - label: hide the math entirely from the learn surface
    rejected_because: |
      Hiding the math leaves the learner with no path to the
      mechanism behind the consequence. The "under the hood" section
      is the on-ramp from story to model; removing it cuts the bridge
      the spec asks the learn surface to build.
rationale: |
  Meaning comes before mechanism on the learn surface. The
  consequence paragraph names what happened in procurement terms
  (the supplier shipped 350, the buyer planned 500, the gap cost
  shoppers); the "under the hood" section names the math that drives
  the number (the residual, the utility function, the joint
  optimum). Putting consequence first means a newcomer can leave a
  Level having learned the procurement story even if the math
  passes over their head, while a math-curious learner still gets
  the model in the same screen. The shared `LevelShell` reveal slot
  enforces the ordering; Level callsites cannot reorder it without
  changing the primitive.
evidence:
  - kind: spec
    ref: specs/0001-polished-simulator/requirements.md
  - kind: doc
    ref: apps/web/src/primitives/LevelShell.tsx
  - kind: doc
    ref: apps/web/src/surfaces/learn/Level01.tsx
  - kind: doc
    ref: apps/web/src/primitives/PredictReveal.tsx
rollback: |
  Replace the `LevelShell` reveal slot's free-form `ReactNode` with a
  structured `{ math, consequence }` object and have each Level pass
  the two halves in author order. Document a per-Level toggle on
  whether the math or the consequence renders first. The reveal panel
  keeps working; the ordering contract goes away.
owner: product
---

## decision

When a learn-surface Level reveals the result of a choice, the reveal
panel renders the plain-English consequence first and parks any
numeric quantities under an explicit "under the hood" section
beneath. The `LevelShell` reveal slot ships the layout; each Level
fills the slot with the consequence at the top and the math at the
bottom.

## alternatives

- Math first, consequence second — trains the learner to read numbers
  before they have a story to hang them on; inverts the spec's
  ordering.
- Math only, no plain-English consequence — works for the lab
  surface, which serves readers who already speak the language; the
  learn surface cannot adopt the same shape without losing its
  audience.
- Hide the math entirely — cuts the bridge from story to model the
  spec asks the learn surface to build.

## rationale

Meaning comes before mechanism on the learn surface. The consequence
paragraph names what happened in procurement terms; the "under the
hood" section names the math behind the number. Consequence-first
means a newcomer leaves a Level with the procurement story even if
the math passes over their head, while a math-curious learner still
gets the model in the same screen.

## evidence

- `specs/0001-polished-simulator/requirements.md` — R-PLAY-003 names
  consequence-before-math as the reveal contract.
- `apps/web/src/primitives/LevelShell.tsx` — the reveal slot that
  Level files render into.
- `apps/web/src/surfaces/learn/Level01.tsx` — the consequence
  paragraph at the top of the reveal, math under it.
- `apps/web/src/primitives/PredictReveal.tsx` — the predict-then-reveal
  helper used by Levels that wrap the reveal in a guess.

## rollback

Replace the `LevelShell` reveal slot's free-form `ReactNode` with a
structured `{ math, consequence }` object and let each Level pass the
two halves in author order. The reveal panel keeps working; the
ordering contract goes away.
