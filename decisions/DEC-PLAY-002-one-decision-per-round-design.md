---
id: DEC-PLAY-002-one-decision-per-round-design
spec: specs/0001-polished-simulator/
requirement: R-PLAY-002
date: 2026-05-24
status: approved
reversible: true
decision: |
  Each Level on the learn surface presents exactly one decision moment.
  The `LevelShell` primitive in `apps/web/src/primitives/LevelShell.tsx`
  enforces the shape: a single stakes line, the manipulable visual,
  one prompt, one Continue button, one optional reveal panel. The next
  Level is gated by a single user advance; no Level offers multiple
  parallel decisions in the same view.
alternatives:
  - label: free-form sandbox playground per Level
    rejected_because: |
      A sandbox per Level lets the user wander through several
      decisions in one view, which loses the signal of which choice
      caused which consequence. The lab surface
      (`apps/web/src/surfaces/sandbox/`) covers the playground role
      separately; the learn surface is the guided path.
  - label: multi-choice batches (pick three options, see all three results)
    rejected_because: |
      A batch view shows the user three outcomes at once. The learn
      surface teaches by isolating cause from effect; a batch
      collapses three causes into one screen and makes the lesson
      harder to attribute to a specific choice.
  - label: branching decision tree with multiple parallel sub-paths
    rejected_because: |
      A branching tree is what the negotiate surface
      (`apps/web/src/surfaces/negotiate/`) does for two-party
      negotiation; the learn surface is the linear ladder, by design.
      Adding branching to learn would double the Level count and
      duplicate the lesson logic.
rationale: |
  The learn surface is a linear ladder of eleven Levels. Each Level
  isolates one concept, one decision, and one consequence reveal. The
  `LevelShell` primitive ships the shape so every Level has the same
  rhythm: briefing, manipulable visual, decision, consequence,
  continue. The sandbox surface covers the open-ended playground role;
  the learn surface is the guided path that earns its keep by being
  predictable. One decision per round means one signal per round,
  which is the right grain for a learning sequence whose Levels each
  pin a named idea (gap, settle, ADMM, transfer, no-worse-off).
evidence:
  - kind: spec
    ref: specs/0001-polished-simulator/requirements.md
  - kind: doc
    ref: apps/web/src/primitives/LevelShell.tsx
  - kind: doc
    ref: apps/web/src/surfaces/learn/Level01.tsx
  - kind: doc
    ref: apps/web/src/surfaces/learn/Level06.tsx
rollback: |
  Replace the `LevelShell` primitive's single prompt plus single
  Continue button with a free-form children slot, and lift the
  per-Level decision count to the caller. Each Level can then render
  multiple decisions, multiple reveals, and multiple advance buttons.
  The shared shape goes away; the sandbox-style free play returns to
  the learn surface. The ProgressDots stay; the rhythm contract goes
  away.
owner: product
---

## decision

Each Level on the learn surface presents exactly one decision moment.
The `LevelShell` primitive enforces the shape: a single stakes line,
the manipulable visual as children, one prompt, one Continue button,
one optional reveal panel. The next Level is gated by a single user
advance.

## alternatives

- Free-form sandbox playground per Level — loses the cause-to-effect
  signal that the learn surface is built to deliver; the sandbox
  surface already covers that role separately.
- Multi-choice batches — three outcomes in one view collapse three
  causes into one screen and weaken attribution.
- Branching decision tree — what the negotiate surface does for
  two-party negotiation; adding branching to learn doubles the Level
  count and duplicates the lesson logic.

## rationale

The learn surface is a linear ladder of eleven Levels. Each Level
isolates one concept, one decision, one consequence. The `LevelShell`
primitive ships the rhythm so the Levels are predictable. The sandbox
surface carries the open-ended play role; the learn surface earns its
keep by being a guided path. One decision per round means one signal
per round, which is the right grain for a learning sequence.

## evidence

- `specs/0001-polished-simulator/requirements.md` — R-PLAY-002 names
  one decision moment per round as the contract.
- `apps/web/src/primitives/LevelShell.tsx` — the single-prompt,
  single-continue, single-reveal layout.
- `apps/web/src/surfaces/learn/Level01.tsx`,
  `apps/web/src/surfaces/learn/Level06.tsx` — Level callsites that
  honor the shape.

## rollback

Replace the `LevelShell` single-prompt single-continue layout with a
free-form children slot and lift decision count to the Level caller.
Each Level can then render multiple decisions and reveals. The
ProgressDots stay; the rhythm contract goes away.
