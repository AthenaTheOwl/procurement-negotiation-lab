# Spec 0012 - status snapshot

Snapshot, not a substitute for `requirements.md` + `traceability.md`. Update
this table whenever a requirement flips state. PARTIAL stays PARTIAL until
every acceptance bullet ships.

## R-MOBREL-* coverage

| ID | State | Decision | What landed | What's still open |
|---|---|---|---|---|
| R-MOBREL-001 | COVERED | [DEC-MOBREL-001](../../decisions/DEC-MOBREL-001-eas-three-profile-strategy.md) | `apps/mobile/eas.json` defines development, preview, and production profiles with named channels and Android/iOS build types. | Pair profile names with a written JS-only vs native-runtime trigger matrix. |
| R-MOBREL-002 | PARTIAL | [DEC-MOBREL-003](../../decisions/DEC-MOBREL-003-tier-0-3-proof-ladder.md) | Tier 0/1 gates exist, Tier 2 Maestro flow set exists, and `ops/releases/` records tier status. | Add a CI step that asserts the recorded proof tier matches the change set. |
| R-MOBREL-003 | COVERED | [DEC-MOBREL-002](../../decisions/DEC-MOBREL-002-maestro-over-detox-or-appium.md) | Maestro flows cover Home plus Levels 1, 3, 6, 8, 9, 10, and 11 with intro-card checks and control interactions. | Hosted `mobile-e2e.yml` has not reached Maestro yet; current failure is Gradle native build setup. |
| R-MOBREL-004 | COVERED | [DEC-MOBREL-004](../../decisions/DEC-MOBREL-004-release-ledger-as-durable-evidence.md) | `ops/releases/README.md`, `TEMPLATE.md`, and entry `001-2026-05-22-spec-0012-tier2-bootstrap.md` record release evidence. | Keep future build/update promotions in this ledger. |
| R-MOBREL-005 | PARTIAL | [DEC-MOBREL-005](../../decisions/DEC-MOBREL-005-mobile-e2e-on-hosted-android-emulator.md) | `frontend.yml` runs the fast PR gate. `mobile-e2e.yml` runs on PR path/workflow dispatch with concurrency cancellation and failure artifacts; run failures are logged in `ops/releases/`. | Fix hosted Gradle resolution, add scheduled nightly Tier 2 cadence, and add iOS simulator/device lane. |

## R-SDLC-* coverage

| ID | State | Notes |
|---|---|---|
| R-SDLC-001 | COVERED | Requirement IDs map to STATUS, traceability, code, and release evidence before the behavior is called closed. |
| R-SDLC-002 | PARTIAL | Review gates are documented in `design.md`; CI covers runtime safety via TypeScript/Jest/Maestro. Gates 2 and 4 still rely on PR review. |
| R-SDLC-003 | OPEN | Cross-repo parity table still needs a pass against `../cargo-health` and `../prompt-library`. |

## R-AIBRIEF-* coverage

| ID | State | Notes |
|---|---|---|
| R-AIBRIEF-001 | COVERED | Separate repo is live at `https://github.com/AthenaTheOwl/ai-field-brief` with spec ledger, source contracts, eval contracts, Phase 1 foundation, and a deployed public brief reader. |

## Next pass - proposed slice

1. Fix hosted Gradle resolution for `expo-module-gradle-plugin` so
   `mobile-e2e.yml` reaches APK build and Maestro.
2. Add scheduled nightly `mobile-e2e.yml` cadence.
3. Add iOS simulator/device Tier 2 lane once runner budget is approved.
4. Add parity table for R-SDLC-003.

## Verification artifacts

- R-MOBREL-001 -> `apps/mobile/eas.json`, `apps/mobile/package.json` scripts.
- R-MOBREL-003 -> `apps/mobile/.maestro/level-1-walkthrough.yaml`,
  `level-3-walkthrough.yaml`, `level-6-walkthrough.yaml`,
  `level-8-walkthrough.yaml`, `level-9-walkthrough.yaml`,
  `level-10-walkthrough.yaml`, `level-11-walkthrough.yaml`.
- R-MOBREL-004 -> `ops/releases/`.
- R-MOBREL-005 -> `.github/workflows/frontend.yml`,
  `.github/workflows/mobile-e2e.yml`, and concurrency blocks.
- R-AIBRIEF-001 -> `https://github.com/AthenaTheOwl/ai-field-brief`.
