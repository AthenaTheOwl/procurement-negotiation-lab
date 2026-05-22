# requirements: mobile release discipline + agentic SDLC

## Scope

Spec 0012 defines the next proof layer after the web/mobile learning-surface
work: native mobile build proof, device-level interaction checks, cross-repo
SDLC parity, and an AI-assisted development loop that reduces "looks done"
slop by requiring specs, golden cases, typed registries, review gates, and
deployment evidence.

This spec does not replace spec 0011. It tightens the remaining gap that spec
0011 names as caveats: EAS build proof, mobile native runtime verification, and
fuller browser/mobile flow coverage.

## Requirements

### R-MOBREL-001: EAS build profiles are first-class gates

WHEN mobile code changes, THE SYSTEM SHALL have explicit build profiles for
development, preview/staging, and production.

Acceptance:
- `apps/mobile/eas.json` defines development, preview/staging, and production
  profiles with named channels.
- The release protocol distinguishes JS-only updates from native-runtime
  changes.
- The local and CI documentation says which profile is required for each kind
  of change.

### R-MOBREL-002: mobile proof tiers are explicit

WHEN a change touches mobile screens, THE SYSTEM SHALL classify the proof tier.

Acceptance:
- Tier 0: TypeScript and Jest for logic/component safety.
- Tier 1: Expo development build or Expo Go visual check for layout and text.
- Tier 2: native binary E2E on Android emulator and iOS simulator/device.
- Tier 3: TestFlight/Play beta smoke before production release.
- A PR cannot claim native mobile green unless the tier it actually ran is
  recorded.

### R-MOBREL-003: mobile E2E covers the core learning path

WHEN the native mobile E2E suite runs, THE SYSTEM SHALL exercise user-visible
learning paths rather than only app launch.

Acceptance:
- E2E visits Home and Levels 1, 3, 6, 8, 9, 10, and 11.
- E2E verifies intro/explainer cards exist on those levels.
- E2E changes at least one control and asserts a visible output/debrief changes.
- E2E asserts no blank screen appears when progressing past the last level.

### R-MOBREL-004: release evidence is durable

WHEN a mobile build or update is promoted, THE SYSTEM SHALL record evidence that
survives the chat session.

Acceptance:
- Build ID, platform, profile, git SHA, runtime version, update group, and smoke
  result are recorded in a checked-in release ledger or generated artifact.
- Rollback command or rollback path is captured for every OTA update.
- Failed builds record the failing stage and next remediation.

### R-MOBREL-005: CI separates fast checks from expensive native checks

WHEN CI runs, THE SYSTEM SHALL keep PR feedback fast while still scheduling
native proof.

Acceptance:
- PR CI runs install, lint, build, engine/web tests, mobile Jest, mobile
  typecheck, voice_lint, spec_check, and web smoke.
- Native mobile E2E/build runs on workflow_dispatch and a scheduled cadence, or
  on release branches.
- CI uses concurrency cancellation so stale branch pushes do not waste runners.
- Heavy mobile proof uploads artifacts: build logs, screenshots, and test
  traces.

### R-SDLC-001: every agentic feature starts from a spec delta

WHEN an AI agent implements user-visible behavior, THE SYSTEM SHALL require a
spec delta before code unless the active spec already covers the change.

Acceptance:
- Requirement IDs are added or linked before implementation.
- Each new requirement maps to code, tests, and acceptance evidence.
- `STATUS.md` is treated as a snapshot, not a substitute for requirements and
  traceability.

### R-SDLC-002: generated work must pass four review gates

WHEN code is generated or substantially edited by an AI agent, THE SYSTEM SHALL
apply named review gates before merge.

Acceptance:
- Architectural fit: no parallel framework or duplicate domain model.
- Domain correctness: invariants and spec rules remain true.
- Runtime safety: retries, concurrency, idempotency, and failure modes are
  considered.
- Operability: logs, traces, run reports, rollback, and debugging paths are
  present where relevant.

### R-SDLC-003: cross-repo process parity is tracked

WHEN this repo borrows discipline from `../cargo-health` or `../prompt-library`,
THE SYSTEM SHALL record the borrowed pattern and the local adaptation.

Acceptance:
- Procurement-lab keeps the lightweight six-file spec pattern.
- Cargo-health remains the reference for richer Nx, contract, security, chaos,
  and mutation rings.
- Prompt-library remains the canonical knowledge/prompt workflow source.
- A parity table names which gates are mandatory, scheduled, or advisory in
  each repo.

### R-AIBRIEF-001: AI Brief starts as a separate repo with specs first

WHEN AI Brief work begins, THE SYSTEM SHALL bootstrap a separate repository
with product, architecture, eval, and release specs before application code.

Acceptance:
- The repo contains a spec ledger, architecture map, source-ingestion contract,
  eval contract, and workflow orchestration contract.
- The repo distinguishes product phases from scope filters: every v3 feature is
  either in a phase or explicitly out-of-scope.
- No source connector ships without ingestion tests, citation tests, and retry
  behavior.

