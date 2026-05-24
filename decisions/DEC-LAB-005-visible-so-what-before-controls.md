---
id: DEC-LAB-005-visible-so-what-before-controls
spec: specs/0002-lab-authoring-workbench/
requirement: R-LAB-005
date: 2026-05-24
status: approved
reversible: true
decision: |
  Open the lab with a "so-what" panel that names three numbers before
  showing any input control: the value left on the table by local JIT
  planning, the best non-oracle mechanism for the current setup, and
  the value of additional shared information. The panel is computed
  per scenario in `packages/engine/src/model/simulation.ts` and rendered
  at the top of the lab surface in `apps/web/src/App.tsx`. Scenario
  presets in `packages/engine/src/data/scenarios.ts` each carry their
  own one-line `soWhat` string that feeds the panel header.
alternatives:
  - label: open the lab with the full configuration form
    rejected_because: |
      The pre-spec-0002 lab opened with a dense configuration form.
      A first-time visitor faced fifteen knobs before any indication
      of which knobs mattered. The "so-what first" frame keeps the
      same controls but moves the answer to the top of the page so
      the visitor knows what they are reading the controls for.
  - label: hide the so-what behind a "run" button
    rejected_because: |
      Defaulting to a hidden so-what makes the lab feel like a form
      that produces a result on submit. The lab is meant to be an
      experiment surface; the headline number should be visible
      before the visitor touches anything, so they can see how it
      moves when they do.
  - label: show only the JIT-vs-oracle gap and skip the other two
    rejected_because: |
      The JIT-vs-oracle gap by itself implies the oracle is the goal.
      The point of the lab is to compare mechanisms, not to crown
      the oracle; the panel has to name the best non-oracle mechanism
      and the value of information so the visitor sees both axes the
      lab cares about.
rationale: |
  Three numbers up top compress the lab's argument: local planning
  leaves surplus on the table, some non-oracle mechanism recovers
  most of it, and sharing more information shifts the answer again.
  The visitor can read those three numbers in five seconds and then
  decide whether they want to tinker with the scenario, the agents,
  or the information mode. The "so-what" framing matches the spec
  0002 design thesis ("which mechanism recovers joint value without
  full disclosure").
evidence:
  - kind: spec
    ref: specs/0002-lab-authoring-workbench/requirements.md
  - kind: doc
    ref: packages/engine/src/model/simulation.ts
  - kind: doc
    ref: packages/engine/src/data/scenarios.ts
  - kind: doc
    ref: specs/0002-lab-authoring-workbench/design.md
rollback: |
  Remove the so-what panel from the lab surface and move the result
  block back below the configuration form. The scenario `soWhat`
  strings stay in `scenarios.ts` for reuse in the report surface and
  the tutorial; only the top-of-lab placement goes away.
owner: product
---

## decision

Open the lab with a "so-what" panel that names three numbers before
showing any input control: the value left on the table by local JIT
planning, the best non-oracle mechanism for the current setup, and
the value of additional shared information. The panel is computed per
scenario in `packages/engine/src/model/simulation.ts` and rendered at
the top of the lab surface. Each scenario preset in
`packages/engine/src/data/scenarios.ts` carries its own one-line
`soWhat` string for the panel header.

## alternatives

- Open the lab with the full configuration form — buries the answer
  under fifteen knobs.
- Hide the so-what behind a "run" button — turns the lab into a form
  that produces a result on submit.
- Show only the JIT-vs-oracle gap — implies the oracle is the goal
  and skips the mechanism and information axes.

## rationale

Three numbers up top compress the lab's argument: local planning
leaves surplus on the table, some non-oracle mechanism recovers most
of it, and sharing more information shifts the answer again. The
visitor reads those numbers in five seconds and then decides which
control to touch. The frame matches the spec 0002 design thesis on
mechanism choice without full disclosure.

## evidence

- `specs/0002-lab-authoring-workbench/requirements.md` — R-LAB-005
  acceptance bullets (value left on table, best non-oracle mechanism,
  value of information).
- `packages/engine/src/model/simulation.ts` — `mechanismScore` and the
  per-scenario "so-what" computation.
- `packages/engine/src/data/scenarios.ts` — per-preset `soWhat`
  strings (12 scenarios).
- `specs/0002-lab-authoring-workbench/design.md` — the product
  thesis sentence the panel answers.

## rollback

Remove the so-what panel from the lab surface and move the result
block back below the configuration form. The scenario `soWhat`
strings stay in `scenarios.ts` for reuse in the report surface; only
the top-of-lab placement goes away.
