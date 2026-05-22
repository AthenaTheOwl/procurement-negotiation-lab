# acceptance: mobile release discipline + agentic SDLC

## Required gates before this spec is complete

- `python -m uv run pytest`
- `npm.cmd run build`
- `Browser QA`
- `npm.cmd run test --workspace=@lab/mobile -- --runInBand`
- `npm.cmd run typecheck --workspace=@lab/mobile`
- `python scripts/spec_check.py`
- `python scripts/voice_lint.py`

## Acceptance checks

### A-MOBREL-001

`apps/mobile/eas.json` names the build profiles and update channels needed for
development, preview/staging, and production.

### A-MOBREL-002

The mobile release ledger exists and has fields for platform, build profile,
build ID, update ID/group, runtime version, git SHA, smoke result, and rollback
path.

### A-MOBREL-003

Native mobile E2E has at least one executable flow covering app launch, a level
intro card, a control change, and the final-level progression guard.

### A-MOBREL-004

The manual/scheduled native workflow is present but not required on every PR.
It uploads artifacts when it runs.

### A-SDLC-001

The cross-repo parity note exists and states which gates are mandatory,
scheduled, advisory, and account-gated for procurement-lab, cargo-health, and
prompt-library.

### A-AIBRIEF-001

The separate AI Brief repo has a Phase 0 spec pack before product code lands.

## Non-goals

- Do not require EAS login or store credentials in this repo.
- Do not block ordinary copy/UI PRs on app-store submission.
- Do not duplicate cargo-health's full heavy test lattice unless the lab grows
  production-user or regulated-data obligations.

