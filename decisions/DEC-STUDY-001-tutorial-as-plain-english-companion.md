---
id: DEC-STUDY-001-tutorial-as-plain-english-companion
spec: specs/0001-polished-simulator/
requirement: R-STUDY-001
date: 2026-05-24
status: approved
reversible: true
decision: |
  Ship the tutorial surface as a plain-English companion to the PLAY
  and LAB surfaces. The tutorial covers six sections named in
  R-STUDY-001: the story map, utility functions, coordination
  algorithms, information and uncertainty, CBT and no-worse-off
  participation, and the synthetic-data boundary. Formulas appear
  under an "open the math" toggle so the learner reads the concept
  first and pulls the math in on demand. The surface renders at
  `apps/web/src/surfaces/sandbox/SandboxApp.tsx` under the
  `study-surface` test id; the reference companion lives at
  `docs/tutorial.md`.
alternatives:
  - label: ship the math first, narrative second
    rejected_because: |
      The simulator's first job is teaching. A math-first surface
      filters out the layperson audience the simulator was built
      for. The pedagogical bet is that the learner who reads the
      narrative first will pull the math in once the concept is
      anchored; the math-first ordering inverts that bet.
  - label: keep the tutorial in `docs/tutorial.md` only, off the app
    rejected_because: |
      A docs-only tutorial breaks the surface-pairing rule named in
      R-STUDY-001 (the visitor opens STUDY mode inside the app).
      Off-app docs require a context switch and route the learner
      out of the simulator at exactly the moment they are leaning
      in. The on-app surface keeps the learner in the lesson while
      `docs/tutorial.md` carries the reference companion.
  - label: inline every tutorial section into the matching Level
    rejected_because: |
      Inlining every section inflates each Level into a textbook
      page. The Level surface teaches one concept per Level with
      the consequence-before-math discipline; the tutorial surface
      collects the concepts as a reference the learner returns to
      across Levels. The two surfaces serve different reading
      modes: lesson on PLAY, reference on STUDY.
rationale: |
  The tutorial surface answers the question "what is this app
  teaching me?" without forcing the learner through the eleven Level
  arc first. The six sections map one-to-one onto the R-STUDY-001
  acceptance criteria and the six sections are the same set the
  glossary at `packages/engine/src/data/glossary.ts` carries. The
  "open the math" toggle is the same consequence-before-math
  discipline DEC-PLAY-003 records on the PLAY surface, applied to
  the reference surface. The trade is more copy to maintain in
  exchange for an on-ramp the layperson audience can use without
  finishing the simulator.
evidence:
  - kind: spec
    ref: specs/0001-polished-simulator/requirements.md
  - kind: doc
    ref: apps/web/src/surfaces/sandbox/SandboxApp.tsx
  - kind: doc
    ref: docs/tutorial.md
  - kind: doc
    ref: packages/engine/src/data/glossary.ts
  - kind: decision
    ref: decisions/DEC-PLAY-003-consequence-before-math.md
  - kind: decision
    ref: decisions/DEC-PLAY-004-teach-terms-in-context.md
rollback: |
  Remove the `study-surface` section from
  `apps/web/src/surfaces/sandbox/SandboxApp.tsx` and the legacy
  `#study` hash route. Keep `docs/tutorial.md` as the off-app
  reference. The PLAY and LAB surfaces continue to carry inline
  term definitions per DEC-PLAY-004, so removing the STUDY surface
  drops the consolidated reference view but leaves point-of-use
  teaching intact. Restoring the surface re-imports the
  `StudySurface` component and rewires the hash route; the work is
  bounded to one file plus the App.tsx routing.
owner: domain
---

## decision

Ship the tutorial as a plain-English companion to PLAY and LAB. The
STUDY surface lives at `apps/web/src/surfaces/sandbox/SandboxApp.tsx`
under the `study-surface` test id; the reference companion lives at
`docs/tutorial.md`. The six sections (story map, utility functions,
coordination algorithms, information and uncertainty, CBT and
no-worse-off participation, synthetic-data boundary) map one-to-one
onto the R-STUDY-001 acceptance list. Formulas land under an "open
the math" toggle.

## alternatives

- Math-first ordering — filters out the layperson audience the
  simulator was built for.
- Docs-only tutorial — breaks the on-app surface rule and routes the
  learner away from the simulator at the wrong moment.
- Inline every section into a Level — inflates each Level into a
  textbook page and loses the reference reading mode.

## rationale

The tutorial surface answers "what is this app teaching me?" without
forcing the learner through eleven Levels first. The six sections
match the R-STUDY-001 acceptance criteria one-to-one and reuse the
shared glossary so the term definitions stay consistent across PLAY,
LAB, and STUDY. The "open the math" toggle is the same discipline
DEC-PLAY-003 records on PLAY, applied to the reference surface.

## evidence

- `specs/0001-polished-simulator/requirements.md` — R-STUDY-001 names
  the six required sections.
- `apps/web/src/surfaces/sandbox/SandboxApp.tsx` — the
  `study-surface` section and the "open the math" toggle wiring.
- `docs/tutorial.md` — the off-app reference companion.
- `packages/engine/src/data/glossary.ts` — the shared glossary the
  STUDY surface and the Levels both read from.
- `decisions/DEC-PLAY-003-consequence-before-math.md` — the
  consequence-before-math discipline this DEC inherits.

## rollback

Drop the `study-surface` section from `SandboxApp.tsx` and the
`#study` hash route. `docs/tutorial.md` remains as the off-app
reference; inline term definitions on PLAY and LAB stay per
DEC-PLAY-004. Restoring re-imports the StudySurface component and
rewires the hash route; bounded to one file plus App.tsx routing.
