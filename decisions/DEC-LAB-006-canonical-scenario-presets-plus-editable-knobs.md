---
id: DEC-LAB-006-canonical-scenario-presets-plus-editable-knobs
spec: specs/0002-lab-authoring-workbench/
requirement: R-LAB-006
date: 2026-05-24
status: approved
reversible: true
decision: |
  Ship a fixed set of canonical scenario presets in
  `packages/engine/src/data/scenarios.ts` (substrate crunch, regional
  shipping asymmetry, multi-vendor shortage, and a happy-path cluster)
  plus a structural-knob editor on the lab surface that lets the
  visitor change demand volatility, capacity tightness, lead time,
  fulfillment-center count, participants, products, and periods. Each
  preset carries `id`, `name`, `oneLine`, `soWhat`, and a `defaults`
  block that seeds the knob editor. A preset selection resets the
  knobs to its defaults; the visitor can then edit any of them
  without leaving the preset name.
alternatives:
  - label: presets only, no knob editor
    rejected_because: |
      Presets alone make the lab a closed catalog. The point of an
      authoring workbench is to let a visitor ask "what if capacity
      were tighter" without writing a new scenario file. The knob
      editor is the difference between a demo and a workbench.
  - label: knob editor only, no presets
    rejected_because: |
      A first-time visitor faced with seven sliders and no starting
      point cannot tell which combinations matter. The presets carry
      a one-line setup and a `soWhat` string so the visitor sees an
      interesting starting point and the question it answers before
      they edit anything.
  - label: arbitrary JSON scenario import
    rejected_because: |
      A free-form import surface drags in a parser, a schema-validation
      layer, and an attack surface (untrusted JSON in the browser).
      The closed preset set plus the typed knob editor covers the
      authoring use cases the spec names without taking that cost.
rationale: |
  Presets give a starting point with a labeled question; the knob
  editor lets the visitor mutate the scenario without writing code.
  The structural knobs are the parameters the simulation engine
  already reads, so the editor is a thin UI over the existing scenario
  schema in `packages/engine/src/model/types.ts`. The fixed preset
  list keeps the lab small enough to scan and keeps the engine's
  scenario shape stable across runs.
evidence:
  - kind: spec
    ref: specs/0002-lab-authoring-workbench/requirements.md
  - kind: doc
    ref: packages/engine/src/data/scenarios.ts
  - kind: doc
    ref: packages/engine/src/model/types.ts
  - kind: doc
    ref: packages/engine/src/data/scenarios.test.ts
rollback: |
  Drop the knob editor and ship presets only. The scenario schema and
  the engine layer keep working; the lab surface degrades to a
  preset picker. Re-introducing the editor later is a UI change, not
  an engine change.
owner: product
---

## decision

Ship a fixed set of canonical scenario presets in
`packages/engine/src/data/scenarios.ts` (substrate crunch, regional
shipping asymmetry, multi-vendor shortage, and a happy-path cluster)
plus a structural-knob editor on the lab surface for demand
volatility, capacity tightness, lead time, fulfillment-center count,
participants, products, and periods. Each preset carries `id`, `name`,
`oneLine`, `soWhat`, and a `defaults` block. Selecting a preset seeds
the knob editor; the visitor can then edit any knob without leaving
the preset.

## alternatives

- Presets only, no knob editor — closes the lab into a catalog.
- Knob editor only, no presets — leaves the first-time visitor with
  seven sliders and no starting point.
- Arbitrary JSON scenario import — drags in a parser, a validator,
  and an attack surface, for an authoring use case the spec does not
  ask for.

## rationale

Presets give a labeled starting point; the knob editor lets the
visitor mutate the scenario without writing code. The knobs are the
parameters the simulation engine already reads, so the editor is a
thin UI over the existing scenario schema. The fixed preset list
keeps the lab small enough to scan and keeps the scenario shape
stable across runs.

## evidence

- `specs/0002-lab-authoring-workbench/requirements.md` — R-LAB-006
  acceptance bullets (three+ presets, one-line setup, so-what,
  editable structural knobs).
- `packages/engine/src/data/scenarios.ts` — preset definitions with
  `id`, `name`, `oneLine`, `soWhat`, `defaults`.
- `packages/engine/src/model/types.ts` — the typed scenario shape the
  knob editor mutates.
- `packages/engine/src/data/scenarios.test.ts` — preset-shape tests.

## rollback

Drop the knob editor and ship presets only. The scenario schema and
the engine keep working; the lab surface degrades to a preset
picker. Re-introducing the editor later is a UI change.
