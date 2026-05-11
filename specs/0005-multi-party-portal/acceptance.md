# acceptance: multi-party portal and scenario authoring

## Pass A — Multi-party data model

| Check | Verification |
|---|---|
| Scenario supports 2-8 participants | unit test creates N=3, N=5, N=8 scenarios; algorithms run |
| No `participants[0]`/`[1]` hardcoded | grep returns 0 matches in `simulation.ts` |
| Each mechanism runs on N=3 | algorithm comparison panel produces output |
| Each mechanism runs on N=5 | algorithm comparison panel produces output |
| Global welfare = sum of N utilities | unit test asserts `globalUtility === sum(localUtilities)` |
| 3 new multi-party scenarios in `scenarios.ts` | grep + render test |

## Pass B — Views + privacy

| Check | Verification |
|---|---|
| View picker visible on Lab Arena | DOM presence |
| Buyer view hides supplier `production_cost` | AppTest: query DOM for that text → 0 matches |
| Supplier view hides other suppliers' parameters | AppTest |
| Coordinator view hides participant utilities | AppTest |
| View toggle preserves scenario state | AppTest: edit a knob, switch views, switch back, value preserved |
| `projectScenario` returns `RedactedParticipant` for hidden fields | unit test |
| Type guard prevents UI from accessing redacted fields | TypeScript compile error on attempted access |

## Pass C — Strategy library

| Check | Verification |
|---|---|
| ≥ 8 strategies in `strategies.ts` | `strategies.length >= 8` |
| Covers buyer, supplier, packager, coordinator | unit test: roles present |
| Each strategy parses with formula DSL | `compileFormula(s.defaultUtilityFormula)` succeeds |
| Library dropdown visible on participant-add | DOM presence |
| One-click adds a participant from the library | AppTest |
| `docs/strategy-library.md` documents each | file exists; grep each strategy id |

## Pass D — Scenario schema + import/export

| Check | Verification |
|---|---|
| `scenarioSchema.ts` exists with zod schema | file exists; schema is a zod object |
| Schema includes `schemaVersion: "0.5.0"` | unit test |
| Migration from 0.3.0 → 0.5.0 succeeds | unit test loads a 0.3.0 scenario JSON, gets a valid 0.5.0 |
| Export → import is lossless | unit test: round-trip yields identical scenario |
| Invalid JSON surfaces specific field path errors | unit test |
| Lab Arena has import + export controls | DOM presence |
| Imported scenario activates without page reload | AppTest |
| `docs/scenario-schema.md` documents the schema | file exists |

## Pass E — Multi-party transfers + Shapley

| Check | Verification |
|---|---|
| `transferLedger` accepts N=3 and N=5 participant lists | unit test |
| Split rules: proportional, equal, shapley all working | unit test per rule |
| Shapley symmetry property | unit test: identical participants get identical transfers |
| Shapley efficiency property | unit test: sum of transfers = total surplus |
| Shapley null-player property | unit test: zero-contribution participant gets 0 |
| Ledger UI shows N rows for N participants | AppTest |
| Split-rule dropdown switches rule and re-renders | AppTest |
| No-worse-off flag per participant | AppTest: with infeasible scenario, flag fires correctly |

## Discipline gates (per pass)

Standard set. All must pass.

## Definition of done

- All check tables above pass.
- `traceability.md` shows every R-PORTAL-* and R-SPEC-005 done.
- Lab Arena renders multi-party scenarios end-to-end (view picker, redacted
  views, multi-party transfer ledger).
- The deployed Vercel app shows the new controls without errors.
- Browser QA evidence saved as `ops/qa-evidence/0005-pass-{A,B,C,D,E}.png`.
- A multi-party scenario from the library can be exported, copied to a new
  browser session, and imported back to the same final state.
