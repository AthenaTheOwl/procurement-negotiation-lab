# traceability: production hardening from MedRoute patterns

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-HARDEN-001** schema-first validation | A1, A2, A3, A4 | Pass A: type inferred from zod; all paths go through `parse()`; built-in fixtures parse; field-path errors | done (scenarioSchema.ts) |
| **R-HARDEN-002** test data factories | B1, B2, B3, B4 | Pass B: 3 factories; defaults valid; overrides merge; inline fixtures migrated | done (factories.ts) |
| **R-HARDEN-003** decision event log | C1, C2, C3, C4, C5 | Pass C: typed union; events emit; bounded; included in report; canonical sequence asserted | done (decisionEvent.ts) |
| **R-HARDEN-004** Playwright smoke | D1, D2, D3, D4 | Pass D: smoke.spec.ts; targets deployed URL; weekly + dispatch; failure opens issue | deferred (not in this pass; spec_check covers spec discipline) |
| **R-HARDEN-005** spec_check enforcement | E1, E2, E3, E4, E5 | Pass E: enumerates R-*; asserts coverage; surfaces missing IDs; runs on PR; current specs pass after backfill | done (scripts/spec_check.py extended to specs 0005-0008) |
| **R-HARDEN-006** integration tests | F1, F2, F3, F4 | Pass F: 3 tests under `integration/`; cover scenario-to-ledger, formula-authoring, report-roundtrip | partial (runReport.test.ts covers report round-trip; others deferred) |
| **R-SPEC-007** discipline | S1, S2, S3 | Spec entry; this file; run-ledger | in progress |

## Update protocol

Same as prior specs.

## Status snapshot

```
Pass A — schema enforcement     done (scenarioSchema.ts + parseScenario)
Pass B — factories              done (buildParticipant + buildScenario)
Pass C — decision events        done (typed union; bounded log)
Pass D — Playwright smoke       deferred (next pass)
Pass E — spec_check             done (all 0005-0008 IDs enforced)
Pass F — integration tests      partial (report round-trip covered)
Spec discipline                 in progress (this file)
```

## Cross-spec dependencies

- **Depends on spec 0005**: scenarioSchema.ts from 0005.
- **Composes with spec 0006**: decision event log + run report.
- **Composes with all future specs**: spec_check becomes a gate going forward.
