# Spec 0019 - factory active-MVP contract

After the v2-lite pilot and batch-2 work, the factory can ship repos, but each
new repo still needs hand-built smoke gates, artifact expectations, and product
framing. This spec turns those repeated choices into a small contract that the
factory enforces.

Brand prefix: `FAM` (factory active-MVP).

## scope cuts

1. Start with 2 review personas: architecture and security.
2. Land contract code and templates as one operator surface.
3. Pilot 2 repos before scaling: `binding-constraint` and `brief-calibration`.

## Requirements

### R-FAM-V1-001: product brief

Every active repo has `PRODUCT_BRIEF.md` at root. It names who the repo serves,
what decision it helps, and what output matters most.

### R-FAM-V1-002: system map

Every active repo has `SYSTEM_MAP.md` at root. It lists modules and public
interfaces using file paths, function signatures, schema names, or file formats.

### R-FAM-V1-003: design spec ledger

Every active repo has `specs/0002-design/{requirements,design,tasks,acceptance}.md`.

### R-FAM-V1-004: status file

Every active repo has `STATUS.md` with `## Current state`, `## Known limits`,
and `## Next feature queue`.

### R-FAM-V1-005: real artifact

Every active repo has one produced artifact under `reports/`, `examples/`,
`data/`, or `print.*`.

### R-FAM-V1-006: validation command

Every active repo publishes one validation command in README's "How to run"
section. It exits 0 on a fresh clone after install.

### R-FAM-V1-010: expected artifacts field

Task YAML accepts `expected_artifacts`. The factory checks each entry after the
implementation step.

### R-FAM-V1-011: module map field

Task YAML accepts `module_map`. Each entry names a module, its source path, its
system layer, and advisory public interfaces.

### R-FAM-V1-012: persona reviews field

Task YAML accepts `persona_reviews`. v0.1 accepts exactly `architecture` and
`security`.

### R-FAM-V1-013: defect log

The factory appends a defect row on every patch cycle, gate failure, rejection,
contract violation, and no-op implementation block.

### R-FAM-V1-014: next feature queue writer

After a successful pipeline, the factory writes concrete next-feature entries
to the target repo's `STATUS.md`.

### R-FAM-V1-015: handoff packet

After every pipeline terminal state, the factory writes
`ops/handoffs/<task-id>.md` with shipped work, next steps, pickup command, and
blockers.

### R-FAM-V1-020: template directory

v0.1 ships `data-report` and `product-control-plane` templates under
`ops/factory-templates/<type>/`.

### R-FAM-V1-021: new-task command

`python -m scripts.factory.run --new-task --template data-report --repo <slug>`
scaffolds an editable task YAML under `ops/factory-tasks/`.

### R-FAM-V1-022: presence-check smoke gates

Each v0.1 template's smoke gate uses tolerant presence checks instead of exact
build-output filename matches.

### R-FAM-V1-023: future templates deferred

RAG, web-decision-tool, CLI, eval, simulation, game/card, and governance
templates are deferred to later specs.

### R-FAM-V1-030: expected artifact hard gate

The factory blocks the pipeline if any declared expected artifact is missing or
empty.

### R-FAM-V1-031: module source hard gate

The factory blocks the pipeline if any declared module source file is missing.

### R-FAM-V1-032: active repo hard gate

The factory blocks the pipeline if an `active: true` task leaves
`PRODUCT_BRIEF.md`, `SYSTEM_MAP.md`, or `STATUS.md` missing.

### R-FAM-V1-040: test files

The spec adds `test_active_mvp_contract.py`, `test_templates.py`, and
`test_handoff_packet.py`.

### R-FAM-V1-041: replay fixture regeneration

The canonical replay fixture is regenerated against current factory prompts.

### R-FAM-V1-042: sandbox hook hardening

Factory test fixtures disable inherited operator-level git hooks after `git init`
or via an empty template directory.

### R-FAM-V1-043: privacy canary property test

A factory test plants `SEC{uuid}` canaries in fixture inputs and asserts they do
not appear in prompts, events, defects, handoffs, or committed files.

### R-FAM-V1-050: two pilot repos

The two v0.1 pilots are `binding-constraint` for the Codex lane and
`brief-calibration` for the Claude lane.

### R-FAM-V1-051: pilot success criteria

Each pilot must produce all six contract artifacts, avoid manual merges, finish
within 30 minutes, and leave at least two concrete next-feature entries.

### R-FAM-V1-060: scale decision

If both pilots satisfy all four criteria, the DEC recommends batch 3.

### R-FAM-V1-061: repair decision

If one pilot criterion fails, the DEC names the contract or template repair and
requires a re-pilot.

### R-FAM-V1-062: stop decision

If two or more pilot criteria fail, the DEC stops scaling until the contract is
reworked.

### R-FAM-V1-070: terminal triage

Every terminal pipeline state records `PASS`, `INVESTIGATE`, or `HOLD`.

### R-FAM-V1-071: triage policy field

Task YAML accepts `triage_policy` overrides for the default triage rules.

### R-FAM-V1-072: hold blocks next run

A repo with terminal triage `HOLD` does not advance to its next factory run
until the operator clears it.

### R-FAM-V1-080: product framing fields

Active task YAML requires `product_vision`, `target_user`, and
`first_user_action`.

### R-FAM-V1-081: system layers

Task YAML accepts `system_layers`. Each `module_map` entry references one of
those layers.

### R-FAM-V1-082: first action UI gate

UI templates add a gate that checks the first user action is documented in the
README quick-start path.

### R-FAM-V1-090: template path

Templates live under `ops/factory-templates/<type>/`.

### R-FAM-V1-091: extra template set deferred

The remaining template families are deferred to spec 0020 and later.
