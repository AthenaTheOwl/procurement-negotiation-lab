# tasks: mobile release discipline + agentic SDLC

## Phase A: procurement-lab mobile release discipline

- [x] Audit `apps/mobile/eas.json` and define `development`, `preview`,
  `staging`, and `production` profiles with channels.
- [x] Add `ops/releases/` with required evidence fields.
- [x] Add `.github/workflows/mobile-e2e.yml` as a manual native proof wrapper.
- [x] Add `.maestro/` flows or equivalent E2E scripts for Home and selected
  levels.
- [ ] Add a smoke command that can run against a built mobile binary when EAS
  credentials are available.
- [ ] Update `AGENTS.md` with the mobile proof ladder only if this spec and docs
  are not enough.

## Phase B: cross-repo parity

- [ ] Add a MedRoute/cargo-health discipline parity note under
  `docs/agent-discipline/`.
- [ ] Add a prompt-library workflow that captures spec-driven, eval-gated,
  agentic product delivery.
- [ ] Update prompt-library indexes and run prompt lint/strict validate.
- [ ] Record which gates are mandatory/advisory per repo.

## Phase C: AI Brief repo bootstrap

- [x] Create `ai-field-brief` as a separate git repo.
- [x] Add a spec ledger and Phase 0 bootstrap spec.
- [x] Add monorepo package manager decision, CI skeleton, and placeholder apps.
- [x] Add source-ingestion contract and citation/eval fixtures before source
  connectors.
- [ ] Add Inngest workflow contract before background-job implementation.
- [x] Add Postgres schema contract before retrieval implementation.

## Phase D: verification

- [ ] `npm.cmd run verify`
- [ ] `python scripts/spec_check.py`
- [ ] `python scripts/voice_lint.py`
- [ ] Prompt-library: `python library/scripts/lint_prompts.py`
- [ ] Prompt-library: `python library/scripts/promptos.py validate --strict`
- [ ] Cargo-health: existing Nx affected/CI-equivalent smoke for changed docs
- [ ] AI Brief: initial repo lint/spec check once scaffold exists
