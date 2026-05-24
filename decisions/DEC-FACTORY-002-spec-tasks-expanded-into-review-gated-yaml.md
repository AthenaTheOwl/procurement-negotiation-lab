---
id: DEC-FACTORY-002-spec-tasks-expanded-into-review-gated-yaml
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-002
date: 2026-05-24
status: approved
reversible: true
decision: |
  Expand unchecked entries in a spec's `tasks.md` into one factory
  task YAML per pass under `ops/factory-tasks/`. The expansion is done
  by `scripts/factory/spec_tasks.py`, surfaced through the CLI as
  `--expand-spec` and through MCP as `factory_expand_spec`. Each
  generated task defaults to `plan_review` plus `diff_review`
  checkpoints, dual review (claude_code + codex), and a fixed gate
  set (pytest, vitest, tsc, spec_check). Pass grouping is preserved so
  one pass equals one routed task.
alternatives:
  - label: one factory task per unchecked task line
    rejected_because: |
      A typical pass holds 4-10 tasks that share the same plan and
      diff. Routing one factory pipeline per line means one plan,
      one review round, and one PR per line, which inflates the
      review burden and breaks the "pass = ship together" rhythm
      the spec ledger already enforces.
  - label: code-driven expansion with no review checkpoints
    rejected_because: |
      Generated tasks would run plan-implement-commit without a human
      pause, which violates the CDCP rule that meaningful work
      surfaces for review before it lands. The whole point of the
      spec-task expansion path is to seed factory tasks that match
      the same review discipline a hand-authored task carries.
  - label: emit JSON instead of YAML
    rejected_because: |
      Every existing checked-in task under `ops/factory-tasks/` is
      YAML, the loader in `scripts/factory/task.py` reads YAML, and
      a human reviewer reads the generated file before approving the
      run. Switching to JSON for generated tasks would split the file
      format on origin (hand vs generated) and force two loader code
      paths for the same shape.
rationale: |
  Pass-level grouping matches the spec ledger's rhythm, where a pass
  is the unit of "ship together." Defaulting to dual review plus
  plan/diff checkpoints means a generated task carries the same
  review discipline a hand-authored task carries. Reusing the same
  YAML schema on both origins keeps `scripts/factory/task.py` as the
  single loader.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: doc
    ref: scripts/factory/spec_tasks.py
  - kind: doc
    ref: scripts/factory/task.py
  - kind: doc
    ref: specs/0009-factory-dev-control-plane/tasks.md
rollback: |
  Delete `scripts/factory/spec_tasks.py` and remove the `--expand-spec`
  CLI flag plus the `factory_expand_spec` MCP tool. Existing generated
  YAML under `ops/factory-tasks/` keeps loading through the standard
  task loader; only the generator path goes away. Hand-authored tasks
  remain the only entry point into the pipeline.
owner: platform
---

## decision

Expand unchecked entries in a spec's `tasks.md` into one factory task
YAML per pass under `ops/factory-tasks/`. The expansion is done by
`scripts/factory/spec_tasks.py`, surfaced through the CLI as
`--expand-spec` and through MCP as `factory_expand_spec`. Each
generated task defaults to `plan_review` plus `diff_review`
checkpoints, dual review (claude_code + codex), and a fixed gate set
(pytest, vitest, tsc, spec_check). Pass grouping is preserved so one
pass equals one routed task.

## alternatives

- One factory task per unchecked task line — breaks the
  "pass = ship together" rhythm the spec ledger enforces.
- Code-driven expansion with no review checkpoints — violates the CDCP
  rule that meaningful work surfaces for review before it lands.
- Emit JSON instead of YAML — splits the file format on origin and
  forces two loader code paths.

## rationale

Pass-level grouping matches the spec ledger's existing rhythm, where
a pass is the unit of "ship together." Defaulting to dual review plus
plan/diff checkpoints means a generated task carries the same review
discipline a hand-authored task carries. Reusing the same YAML schema
on both origins keeps `scripts/factory/task.py` as the single loader.

## evidence

- `specs/0009-factory-dev-control-plane/requirements.md` — R-FACTORY-002
  acceptance bullets.
- `scripts/factory/spec_tasks.py` — `expand_spec_to_tasks`,
  `_parse_unchecked_passes`, and the default checkpoint/gate set.
- `scripts/factory/task.py` — the YAML loader the generated files
  share with hand-authored tasks.

## rollback

Delete `scripts/factory/spec_tasks.py`, remove the `--expand-spec` CLI
flag, and remove the `factory_expand_spec` MCP tool. Existing
generated YAML keeps loading through the standard task loader; only
the generator path goes away. Hand-authored tasks remain the only
entry point into the pipeline.
