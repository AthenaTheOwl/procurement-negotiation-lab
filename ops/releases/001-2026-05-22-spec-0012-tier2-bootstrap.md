# Mobile release entry 001 - spec 0012 Tier 2 bootstrap

## Date / version / commit

- Date: 2026-05-22
- Version: mobile release discipline bootstrap
- Base commit: `01e5c12`
- Closing commit: this entry's commit (`git log -- ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md`)
- Branch: `main`

## Scope

This entry records the first checked-in mobile release ledger, the EAS profile
set, and the expanded Maestro flow set for the learning-path Tier 2 proof.

## Tier coverage

| Tier | Status | Evidence |
|---|---|---|
| Tier 0 - unit logic | pass | `npm run verify:js` includes mobile Jest and package tests. |
| Tier 1 - lint + typecheck | pass | `npm run verify:js` includes TypeScript and lint gates. |
| Tier 2 - Android emulator E2E | partial | Seven Maestro flows are checked in and wired to `.github/workflows/mobile-e2e.yml`; hosted run evidence is recorded below after dispatch. |
| Tier 3 - TestFlight / Play beta | open | No Apple Developer / Play Console promotion has run from this repo. |

## R-MOBREL coverage

| Requirement | Status | Evidence |
|---|---|---|
| R-MOBREL-001 | covered | `apps/mobile/eas.json` has development, preview, and production profiles. |
| R-MOBREL-002 | partial | Tier table exists here; automatic PR tier assertion remains open. |
| R-MOBREL-003 | covered | `apps/mobile/.maestro/level-{1,3,6,8,9,10,11}-walkthrough.yaml`. |
| R-MOBREL-004 | covered | This `ops/releases/` ledger entry records durable release evidence. |
| R-MOBREL-005 | partial | `mobile-e2e.yml` is manual/PR-path wired; nightly schedule and iOS lane remain open. |

## Native build status

- EAS development: profile configured, no EAS cloud build executed in this pass.
- EAS preview: profile configured for Android internal APK and iOS simulator, no EAS cloud build executed in this pass.
- EAS production: profile configured for Android AAB and iOS IPA, no store build executed in this pass.
- Blocking setup: EAS account/project credentials, Apple Developer account, and Play Console project are not recorded in this repo.

## CI run evidence

- Workflow: `.github/workflows/mobile-e2e.yml`
- Run URL: `pending`
- Outcome: `pending`
- Failure mode, if any: `pending`

## Rollback path

- OTA update rollback: use EAS channel rollback once update channels are active; no update group was published in this pass.
- Native binary rollback: promote the prior TestFlight / Play beta build; no beta build exists yet for this app.

## Open items

- Trigger and record hosted `mobile-e2e.yml` evidence. Owning spec: `R-MOBREL-005`.
- Add nightly Tier 2 cadence. Owning spec: `R-MOBREL-005`.
- Add iOS simulator/device Tier 2 lane once macOS runner budget is approved. Owning spec: `R-MOBREL-005`.
- Add automatic PR proof-tier assertion. Owning spec: `R-MOBREL-002`.
