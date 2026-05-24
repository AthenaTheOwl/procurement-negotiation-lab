# .agents/AGENTS.md

The single contract a coding agent (Claude, Codex, or other) reads
before acting on this repo. Specs name what we build. Decisions name
why. This file names how the agent behaves while building.

The repo-root `AGENTS.md` carries the older per-loop execution
protocol and stays in place. This file adds the CDCP governance
rules layered on top.

## Coding style

- TypeScript strict everywhere. Web (`apps/web/`) and mobile
  (`apps/mobile/`) workspaces share `tsconfig` baselines; mobile uses
  Expo + React Native, web uses Vite + React.
- React with Tailwind for the web surface; React Native with the
  Tailwind-adjacent style helpers under `apps/mobile/src/styles/` for
  the mobile surface.
- Edit existing files. Use the `Edit` tool over `Write` when the file
  already exists; `Write` rewrites the whole file and risks losing
  context. Reserve `Write` for new files.
- The shared engine lives under `packages/engine/`. Math and model
  changes go there and gain pytest + vitest coverage before any
  surface (web or mobile) imports them.
- Public copy passes voice_lint. Banlist rules are hard-FAIL.
- Python code under `src/procurement_lab/`, `scripts/`, and
  `tests/` runs through ruff, mypy strict, bandit, and pip-audit.

## Domain decisions

- Public learning lab boundary: no internal Amazon data, no real PO
  numbers, no internal vendor terms, no roadmap claims. The repo
  credits `https://github.com/amzn/FloPro` only as a public
  implementation reference.
- Hosted execution stays safe: no arbitrary Python evaluation from
  user formulas; the TS formula engine under
  `packages/engine/src/model/formula.ts` is the only authored-formula
  path.
- Every new algorithm returns the common trace schema and benchmark
  metrics so the lab can compare them.
- The factory subsystem under `scripts/factory/` is the workspace
  manager. It runs orchestrator-worker pipelines (planner, implementer,
  reviewer, gates) with checkpoint interrupts, per-task git worktrees,
  trace IDs that correlate to Claude Code or Codex CLI runs, and
  SQLite-backed state in `ops/factory.db` with artifacts under
  `ops/factory-artifacts/`. The `.agents/skills/run-factory-task/`
  skill graduates the recurring pattern; the `factory.run_task` tool
  in `.agents/tools.yaml` is the named invocation surface.
- voice_lint.py is non-negotiable. Every markdown file under the
  documented globs runs the lint and exits clean before commit.
  Banlist is hard-FAIL.
- Mobile release path: EAS build profiles under
  `apps/mobile/eas.json`, Maestro flows under
  `apps/mobile/.maestro/`, and the
  `.github/workflows/mobile-e2e.yml` CI workflow. The
  `.agents/workflows/mobile-release.yaml` names the steps.
- Every shipped R-* requirement carries at least one DEC-* file in
  `decisions/` before the commit reaches main. `spec_check.py` flags
  an orphan R-* and refuses the commit unless the requirement is
  listed in `decisions/.spec-check-allowlist.yaml` as deferred backfill.

## Workflow conventions

- Push to main directly. The repo runs CI gates on push; a failed
  gate blocks the merge under the existing branch protection. This
  is a durable instruction for this repo.
- Six python gates run on every push: `spec_check`, `voice_lint`,
  `validate_decisions`, `validate_roles`, `validate_tools`,
  `validate_policies`. Plus the JS suite (`npm run lint`,
  `npm run test`, `npm run build`, the mobile workspace tests and
  typecheck) and the security scans (bandit, pip-audit).
- Every shipped R-* requirement gets at least one DEC-* file before
  the commit reaches main, or earns an allowlist entry.
- Dream-job outputs are human-gated. A dream candidate (memory update,
  generated test, skill patch, backlog item) carries
  `human_review_required: true` per the cross-repo schema default.
  No CI job auto-applies a dream candidate.
- A force-push, history rewrite, or rollback gets an entry in
  `ops/RESET_LEDGER.md` in the same push that performs the rewrite.
- A release gets an entry in `ops/RELEASE_LEDGER.md` with date, SHA,
  title, scope, and proof refs. The factory `ops/run-ledger.md` keeps
  its existing role as the per-task pipeline ledger.
- Backfill DECs for the 91 pre-CDCP R-* IDs land in later passes,
  one cluster at a time. The allowlist defers them in the meantime.

## Cross-repo links

- The CDCP charter at `../athena-site/ops/control-plane.md` names the
  artifact types and the cross-repo contracts.
- The schemas at `../athena-site/ops/schemas/` are the source of
  truth for decision, role, tool, policy, dream-output, skill,
  artifact, and run shapes. This repo references them by URL and
  keeps cache copies under `ops/schemas-cache/` for offline CI.
- The portfolio manifest at
  `../athena-site/ops/portfolio-manifest.yml` lists every product
  repo and which gates each repo runs.
- The sibling `ai-field-brief` repo holds the worked base-CDCP
  install pattern; commit `5b3b792` is the reference.

## Where to look

| If you want to | Read |
|---|---|
| understand the what | `specs/NNNN-*/requirements.md` |
| understand the why | `decisions/DEC-*.md` |
| understand what we learned last week | `dreams/YYYY-WNN/report.md` |
| run a factory task | `.agents/skills/run-factory-task/SKILL.md` |
| audit a release | `ops/RELEASE_LEDGER.md` |
| audit a history rewrite | `ops/RESET_LEDGER.md` |
| read a per-task factory pipeline run | `ops/run-ledger.md` |
| add a new spec | `specs/README.md` plus the six-file pattern |
| add a new decision | `decisions/README.md` |
| see the role contracts | `.agents/roles/<role-id>/role.yaml` |
| see the central tool registry | `.agents/tools.yaml` |
| see the active policies | `.agents/policies/*.yaml` |
| see the workflow steps | `.agents/workflows/*.yaml` |
| see deferred roles | `.agents/CATALOG.md` |

## Failure modes the agent watches for

- A new R-* requirement without a DEC: `spec_check` fails. Fix by
  adding the DEC file in the same commit, or add the ID to the
  allowlist with a tracking note.
- A DEC file out of schema shape: `validate_decisions` fails. Fix
  the front-matter against `ops/schemas-cache/decision.schema.json`.
- A role, tool, or policy record out of schema shape: the matching
  validator fails. Fix against the cached schema.
- A voice-lint hit: rewrite the line. Per-line allowlist via
  `voice_lint:allow <label>` ships only when the rule does not apply
  and the agent leaves a note.
- A factory task that runs without an emitted event: the
  `factory-run-emits-events` policy flags the gap. Fix by ensuring
  the run path appends a JSON line to `ops/event-log/YYYY-MM-DD.jsonl`.
- A skill graduation without an eval: the SKILL.md may ship with an
  empty `evals` array plus a TODO; promotion past version 0.1.0
  requires `passing_skill_eval` per the promotion_policy field.
