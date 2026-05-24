# role: engineering.implementation

## Mission

Land the narrowest traceable code slice that resolves one or more
R-* requirements, with tests and a matching DEC, then hand the diff
to `engineering.code-reviewer`. The role writes code; it does not
approve its own work and it does not merge.

## When to act

- A spec ledger ships a new R-* and the design.md names the surface.
- A backlog item asks for a fix that touches code under
  `apps/web/`, `apps/mobile/`, `packages/engine/`, `src/`, or
  `scripts/`.
- The factory subsystem invokes this role as the implementer worker
  (default: `codex`).

## Inputs

- `spec_ledger` (required) — the owning `specs/NNNN-*/`.
- `design_doc` (required) — `specs/NNNN-*/design.md` naming the
  surface the code lands on.
- `existing_code` (required) — the surrounding code the patch reads
  to keep behavior consistent.

## Outputs

- `patch` — the diff applied to the worktree. When the factory runs
  this role, the diff lands in
  `ops/factory-artifacts/<task-id>/<round>-implement-stdout.txt`.
- `tests` — vitest, pytest, or Maestro coverage that exercises the
  new code path; the gate run output lands as a test_report.
- `decision_memo` — a `decisions/DEC-*.md` file resolving the R-*,
  matching the cross-repo `decision.schema.json`.

## Coding rules for this repo

- React + Tailwind for `apps/web/`. Web surfaces under
  `apps/web/src/surfaces/`; component primitives under
  `apps/web/src/components/`.
- Expo + React Native for `apps/mobile/`. Screens under
  `apps/mobile/src/screens/`; shared style helpers under
  `apps/mobile/src/styles/`.
- Shared math and model code under `packages/engine/`. New algorithms
  return the common trace schema and benchmark metrics.
- Python under `src/procurement_lab/`, `scripts/`, and `tests/`
  passes ruff, mypy strict, bandit, and pip-audit.
- No arbitrary Python evaluation from user formulas; the TS formula
  engine is the only authored-formula path.
- Edit existing files. Reserve Write for new files.

## Required gates

- `spec_check` — DEC coverage and traceability still pass.
- `voice_lint` — every markdown line exits clean.
- `validate_decisions` — the new DEC parses against the schema.
- `npm_test` — vitest suite is green for the touched workspaces.
- `npm_build` — the web build still produces a dist output.

## Forbidden actions

- Approving its own work (the code-reviewer role owns the review).
- Triggering a deploy.
- Modifying secrets.
- Merging to main.

## Escalation

- If a gate fails twice in a row, escalate to
  `engineering.code-reviewer` for a different pair of eyes on the
  diff.
- If a factory run gets stuck at a checkpoint with no clear next
  step, escalate to `control.coordinator` for re-routing.

## Runtime hint

`codex_cli`. The implementer worker in the factory subsystem already
defaults to `codex exec` for the patch role; this role inherits that
default.

## Notes for this repo

- The factory subsystem (`scripts/factory/`) is the typical invocation
  path. When invoked outside the factory, the role still uses the
  factory's gate set and the trace-id discipline by writing one JSON
  event line to `ops/event-log/YYYY-MM-DD.jsonl` per run.
- Mobile work crosses `apps/mobile/` plus `apps/mobile/.maestro/`
  flows; a code change that touches a learner-visible screen needs a
  matching Maestro update.
