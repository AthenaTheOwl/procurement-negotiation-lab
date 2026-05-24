---
id: DEC-LAB-007-canonical-agent-archetypes-with-behavior-knobs
spec: specs/0002-lab-authoring-workbench/
requirement: R-LAB-007
date: 2026-05-24
status: approved
reversible: true
decision: |
  Ship a fixed list of canonical buyer and supplier strategy archetypes
  in `packages/engine/src/data/agents.ts`: JIT planner (JIT buyer),
  launch-protection buyer, truthful CPP responder, capacity-guard
  supplier, relationship supplier, and hard bargainer. Each archetype
  exposes its `objective`, its `privateInfo`, and its `strategy` as
  text the lab surface reads aloud. Five behavior knobs - urgency,
  supplier flexibility, truthfulness, privacy preference, and risk
  aversion - sit beside the archetype picker and let the visitor tune
  any archetype without writing a new one. Tuning a knob keeps the
  archetype label.
alternatives:
  - label: free-form agent authoring (write your own utility)
    rejected_because: |
      Free-form authoring needs a formula parser, a sandbox for the
      formulas to execute in, and an explanation layer that tells the
      visitor what their formula means. The Sandbox surface
      (`apps/web/src/surfaces/sandbox/`) covers that case. The lab is
      the comparison surface; canonical archetypes plus knobs give
      the visitor enough variation without dragging the parser into
      the comparison flow.
  - label: a single "generic buyer / generic supplier" archetype
    rejected_because: |
      One archetype per side cannot represent the actual axes the
      spec cares about (truthful vs. self-interested, relationship vs.
      transactional, capacity-guarded vs. open). A single archetype
      collapses those axes into a knob preset and hides the
      pedagogical point.
  - label: arbitrary agent count with no canonical set
    rejected_because: |
      The lab's "compare mechanisms" comparison only makes sense if
      the agent population is comparable across runs. The fixed
      archetype set keeps the comparison grounded; the knob editor
      handles the variation inside an archetype.
rationale: |
  The six archetypes name the buyer-side and supplier-side strategies
  the procurement literature treats as canonical. Each one exposes
  the three textual properties the lab surface reads aloud, so the
  visitor sees what each agent is trying to do before the comparison
  runs. The five knobs are the behavior parameters the simulation
  engine reads from agent state; the lab UI does not invent
  parameters the engine cannot use.
evidence:
  - kind: spec
    ref: specs/0002-lab-authoring-workbench/requirements.md
  - kind: doc
    ref: packages/engine/src/data/agents.ts
  - kind: doc
    ref: packages/engine/src/data/strategies.ts
  - kind: doc
    ref: packages/engine/src/model/simulation.ts
rollback: |
  Replace the archetype set with a single buyer-and-supplier pair and
  keep the five knobs. The simulation engine reads the same behavior
  parameters; only the archetype labels and the typed objectives go
  away. Re-introducing the archetype set later is a data-file change.
owner: product
---

## decision

Ship a fixed list of canonical buyer and supplier strategy archetypes
in `packages/engine/src/data/agents.ts`: JIT planner (JIT buyer),
launch-protection buyer, truthful CPP responder, capacity-guard
supplier, relationship supplier, and hard bargainer. Each archetype
exposes its `objective`, its `privateInfo`, and its `strategy`. Five
behavior knobs - urgency, supplier flexibility, truthfulness, privacy
preference, and risk aversion - sit beside the picker and let the
visitor tune any archetype without writing a new one.

## alternatives

- Free-form agent authoring — handled by the Sandbox surface; the
  lab is the comparison surface.
- A single generic buyer / generic supplier archetype — collapses
  the strategy axes the spec cares about into a knob preset.
- Arbitrary agent count with no canonical set — breaks
  cross-run comparability.

## rationale

The six archetypes name the buyer-side and supplier-side strategies
the procurement literature treats as canonical. Each exposes the
three textual properties the lab reads aloud before a comparison
run. The five knobs are the behavior parameters the simulation engine
reads; the UI does not invent parameters the engine cannot
use.

## evidence

- `specs/0002-lab-authoring-workbench/requirements.md` — R-LAB-007
  acceptance bullets (six archetypes, three exposed properties, five
  knobs).
- `packages/engine/src/data/agents.ts` — archetype definitions with
  `objective`, `privateInfo`, `strategy`, and the five-knob block.
- `packages/engine/src/data/strategies.ts` — strategy text the lab
  reads aloud.
- `packages/engine/src/model/simulation.ts` — the engine consumers
  for the five knobs.

## rollback

Replace the archetype set with a single buyer-and-supplier pair and
keep the five knobs. The engine keeps reading the same behavior
parameters; only the archetype labels and typed objectives go away.
