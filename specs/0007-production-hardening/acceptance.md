# acceptance: production hardening from MedRoute patterns

## Pass A — Schema-first enforcement

| Check | Verification |
|---|---|
| `LabScenario` type inferred from zod schema | TS compile check |
| All scenario load paths go through `scenarioSchema.parse()` | grep audit |
| Each built-in fixture parses cleanly | startup test |
| Invalid scenarios surface field-path errors | unit test |

## Pass B — Test data factories

| Check | Verification |
|---|---|
| `factories.ts` exports buildScenario, buildParticipant, buildRunReport | grep |
| Factory defaults produce schema-valid output | unit test |
| Overrides merge correctly | unit test |
| Existing inline fixtures migrated | grep returns 0 inline `participants: [{` outside factories.ts |

## Pass C — Decision event log

| Check | Verification |
|---|---|
| `DecisionEvent` union defined | TS compile |
| Events emitted from all listed actions | integration test |
| Log bounded at ~200 events | unit test |
| Run report includes events | unit test |
| Canonical sequence produces expected events | unit test |

## Pass D — Playwright smoke

| Check | Verification |
|---|---|
| Playwright installed; `playwright.config.ts` exists | file presence |
| `web/e2e/smoke.spec.ts` runs against `SMOKE_URL` env var | CI run |
| Walks hero → arc → step 5 without errors | CI green |
| `smoke.yml` runs weekly + on dispatch | workflow listed |
| Failure opens issue or integrates with audit pipeline | manual verify or test |

## Pass E — spec_check enforcement

| Check | Verification |
|---|---|
| `scripts/spec_check.py` enumerates R-* across specs | unit test |
| Asserts each R-* has at least one task + one acceptance | unit test |
| Failure surfaces specific R-* IDs | unit test |
| `.github/workflows/spec-check.yml` runs on PR | workflow listed |
| Current specs pass spec_check after backfill | run spec_check; exit 0 |

## Pass F — Integration tests

| Check | Verification |
|---|---|
| `web/src/integration/` directory exists with 3 tests | file presence |
| `scenario-to-ledger.test.ts` covers full pipeline | test runs green |
| `formula-authoring.test.ts` covers valid + invalid paths | test runs green |
| `report-roundtrip.test.ts` covers export → replay | test runs green |

## Discipline gates

Standard set + spec_check.

## Definition of done

- All checks above pass.
- `traceability.md` shows R-HARDEN-001..006 + R-SPEC-007 done.
- CI runs Playwright smoke weekly on deployed URL.
- CI runs spec_check on every PR.
- Integration tests live in `web/src/integration/`.
- Coverage on `web/src/model/` ≥ 85%.
