# Spec 0012 — status snapshot

Snapshot, not a substitute for `requirements.md` + `traceability.md`. Update
this table whenever a requirement flips state. Honest reporting beats neat
reporting: PARTIAL stays PARTIAL until every acceptance bullet ships.

## R-MOBREL-* coverage

| ID            | State    | What landed                                                                                                         | What's still open                                                                                  |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| R-MOBREL-001  | COVERED  | `apps/mobile/eas.json` defines development, preview, and production profiles with named channels and Android/iOS build types. | Pair the profile names with a written release playbook (JS-only vs native-runtime trigger matrix). |
| R-MOBREL-002  | PARTIAL  | Tier 0/1 already wired (Jest, tsc, lint). Tier 2 infra exists (this pass). Tier 3 release ledger row format drafted in `acceptance.md`. | Record the tier each PR ran. Add a CI step that asserts the recorded tier matches the change set. |
| R-MOBREL-003  | PARTIAL  | First Maestro flow covers Home → Level 1 → Settle → reveal → Continue. Hosted CI runs it on Android API 34.        | Levels 3, 6, 8, 9, 10, 11 each need their own flow. Stub file `_stubs-future-levels.yaml` lists the testIDs and assertions for each. |
| R-MOBREL-004  | OPEN     | Schema sketched in `acceptance.md`. Maestro debug artifacts upload on failure.                                       | Checked-in release ledger file with build ID, platform, profile, git SHA, runtime version, update group, smoke result, rollback path. |
| R-MOBREL-005  | PARTIAL  | `frontend.yml` runs the fast PR gate. `mobile-e2e.yml` runs only on PRs touching `apps/mobile/**` and on `workflow_dispatch`, with concurrency cancellation and failure artifacts. | Add a scheduled cadence (nightly cron) for full Tier 2 sweep across the matrix. Add iOS simulator job once macOS runner budget is approved. |

## R-SDLC-* coverage

| ID            | State    | Notes                                                                                                                                              |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-SDLC-001    | COVERED  | This pass adds requirement IDs `R-MOBREL-001` and `R-MOBREL-003` to commit + STATUS before code; no requirement-less behavior shipped.             |
| R-SDLC-002    | PARTIAL  | Review gates documented in `design.md`. CI runs gates 1 (fit) and 3 (runtime safety) via tsc/Jest/Maestro. Gates 2 and 4 still ride on PR review.  |
| R-SDLC-003    | OPEN     | Parity table not yet drafted. Next pass: add a cross-repo gate matrix referencing `../cargo-health` and `../prompt-library`.                       |

## R-AIBRIEF-* coverage

| ID            | State    | Notes                                                                                                                |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| R-AIBRIEF-001 | OPEN     | Separate repo bootstrap is out of scope for this pass. Tracked here so the requirement does not fall off the radar. |

## Next pass — proposed slice

1. Six Maestro flows (one per remaining Level) that flip R-MOBREL-003 to
   COVERED.
2. Release ledger file under `specs/0012-mobile-release-and-agentic-sdlc/`
   with a row per build to close R-MOBREL-004.
3. Scheduled nightly run for `mobile-e2e.yml` to close R-MOBREL-005.
4. Parity table for R-SDLC-003.

## Verification artifacts

Each entry above maps to evidence checked into the repo:

- R-MOBREL-001 → `apps/mobile/eas.json`, `apps/mobile/package.json` scripts.
- R-MOBREL-003 → `apps/mobile/.maestro/level-1-walkthrough.yaml`,
  `apps/mobile/.maestro/README.md`, `.github/workflows/mobile-e2e.yml`.
- R-MOBREL-005 → `.github/workflows/frontend.yml`,
  `.github/workflows/mobile-e2e.yml`, `concurrency` block in each.

When a row moves to COVERED, link the commit SHA that closed the last open
bullet so future readers can trace the proof back to the change.
