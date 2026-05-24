---
id: DEC-PLAY-001-six-canonical-roles-fixed-set
spec: specs/0001-polished-simulator/
requirement: R-PLAY-001
date: 2026-05-24
status: approved
reversible: true
decision: |
  Fix the role taxonomy across the learn surface to six canonical roles:
  buyer, supplier, packager, logistics, distributor, and coordinator. The
  set is defined as an `AgentRole` string-union type in
  `apps/web/src/primitives/AgentFigure.tsx` and every Level under
  `apps/web/src/surfaces/learn/` selects from that closed set. New roles
  require a code change, not a config flip.
alternatives:
  - label: configurable role list driven by scenario JSON
    rejected_because: |
      A scenario-driven role list lets authors invent new roles per
      experiment, which sounds flexible but breaks pedagogical clarity.
      The learn surface teaches a fixed mental model of long-lead
      procurement; new roles per scenario means the learner has to
      re-learn who is on stage on every Level. The closed taxonomy ships
      the same six characters across all eleven Levels so the learner
      builds one model and refines it, instead of building a new one
      every screen.
  - label: open-ended free-text role labels
    rejected_because: |
      Free-text roles defer the typography, the color accent, the
      figure SVG, and the role-explainer copy to the author. The
      AgentFigure primitive carries per-role accents and motion clips
      keyed to the closed set; an open string makes those props
      unsatisfiable.
  - label: two-role model (buyer plus supplier only)
    rejected_because: |
      A two-role model fits Level 01 (a buyer talks to a supplier) but
      cannot represent the multi-party Levels that follow (a packager,
      a logistics partner, a distributor, a coordinator). Collapsing
      to two roles forces the later Levels to fake their cast or
      relabel existing characters mid-stream.
rationale: |
  The six roles match the cast the procurement story carries.
  Each Level adds one role at a time, so the closed set lets the
  learner build a mental model that survives the whole sequence. The
  shared `AgentFigure` primitive keys color, mood, and motion off the
  string-union type, so the closed set is the type contract the rest
  of the surface depends on. The trade is pedagogical clarity over
  authoring flexibility, which is the right priority for a learning
  lab whose first job is teaching.
evidence:
  - kind: spec
    ref: specs/0001-polished-simulator/requirements.md
  - kind: doc
    ref: apps/web/src/primitives/AgentFigure.tsx
  - kind: doc
    ref: apps/web/src/surfaces/learn/Level01.tsx
  - kind: doc
    ref: apps/web/src/surfaces/learn/Level03.tsx
rollback: |
  Replace the `AgentRole` string-union type in
  `apps/web/src/primitives/AgentFigure.tsx` with a plain `string` and
  push the role accent and figure mapping into a runtime lookup that
  accepts unknown roles with a default fallback. Update every Level
  callsite to import the role list from a config file instead of
  selecting a typed literal. The figure SVGs and motion clips keep
  working for the original six; the type contract goes away.
owner: product
---

## decision

Fix the role taxonomy across the learn surface to six canonical roles:
buyer, supplier, packager, logistics, distributor, and coordinator.
The `AgentRole` string-union in
`apps/web/src/primitives/AgentFigure.tsx` is the type contract, and
every Level under `apps/web/src/surfaces/learn/` selects from that
closed set. New roles require a code change.

## alternatives

- Configurable role list driven by scenario JSON — breaks the shared
  mental model the learn surface teaches.
- Open-ended free-text role labels — defers typography, color, and
  figure SVG to authors and makes the primitive's role-keyed props
  unsatisfiable.
- Two-role model (buyer plus supplier only) — fits Level 01 but cannot
  represent the multi-party Levels that follow.

## rationale

The six roles match the cast the procurement story carries. Each Level
adds one role at a time, so the closed set lets the learner build a
mental model that holds across the whole sequence. The `AgentFigure`
primitive keys color, mood, and motion off the string-union type, so
the closed set is the contract the surface code depends on. The trade
is clarity over flexibility, which is the right priority for a
learning lab.

## evidence

- `specs/0001-polished-simulator/requirements.md` — R-PLAY-001 names
  the buyer and supplier explicitly and frames role clarity as a
  first-viewport requirement.
- `apps/web/src/primitives/AgentFigure.tsx` — the `AgentRole`
  string-union type and the per-role accent map.
- `apps/web/src/surfaces/learn/Level01.tsx`,
  `apps/web/src/surfaces/learn/Level03.tsx` — Level callsites that
  select roles from the closed set.

## rollback

Replace the `AgentRole` string-union with `string` and push the role
accent and figure mapping into a runtime lookup with a default
fallback. Update every Level callsite to import the role list from a
config file. The figure SVGs keep working for the original six; the
type contract goes away.
