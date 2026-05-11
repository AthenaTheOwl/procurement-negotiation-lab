# acceptance: run reports, replay, and shareable evidence

## Pass A — Shape + schema

| Check | Verification |
|---|---|
| `RunReport` type defined | TypeScript compiles `runReport.ts` |
| `assembleReport()` returns valid RunReport | unit test |
| `runReportSchema.ts` defines zod schema | file exists |
| `parseRunReport` succeeds on valid JSON | unit test |
| `parseRunReport` fails with field path on invalid | unit test |
| Round-trip stringify → parse is identity | unit test |
| `schemaVersion: '0.6.0'` present | unit test asserts field |

## Pass B — JSON export

| Check | Verification |
|---|---|
| Export button visible after first run | AppTest |
| Click writes to clipboard | AppTest with mocked `navigator.clipboard` |
| JSON in clipboard validates against schema | mock + assertion |
| Toast confirmation appears | AppTest queries DOM |
| Button hidden before any run | AppTest |

## Pass C — Markdown export

| Check | Verification |
|---|---|
| `toMarkdown(report)` produces valid markdown | unit test parses output |
| Output < 80 lines for typical run | unit test counts lines |
| Template fires correctly per run shape | unit test for each of 4 templates |
| Output is idempotent | same input → same output |
| Includes "↓ reproduce this run" section with JSON | unit test |
| Includes link to the lab | unit test |

## Pass D — Replay + run ledger

| Check | Verification |
|---|---|
| `reportStorage` save/list/load/delete | unit test |
| 20-run cap evicts oldest | unit test |
| Auto-save on algorithm run | AppTest: run algorithm, check localStorage |
| Past runs list visible in RunReportPanel | DOM presence |
| Click past run reloads state | AppTest |
| Delete removes from list and storage | AppTest |
| Replay textarea accepts JSON | DOM presence |
| Replay with valid JSON updates state | AppTest |
| Replay with invalid JSON surfaces error | AppTest |
| Round-trip export → clear → replay yields identical state | end-to-end test |

## Pass E — Summary view

| Check | Verification |
|---|---|
| `/report?id=...` page renders | Astro builds; route returns 200 |
| `/report?json=<encoded>` works | unit test |
| Layout fits 1200×800 without scroll | Playwright screenshot test |
| Scenario card, agents, gap headline, mechanism bar chart, footer present | DOM presence |
| Read-only (no interactive controls) | unit test asserts no `<button>` or `<input>` |

## Discipline gates

Standard set per pass.

## Definition of done

- All checks above pass.
- `traceability.md` shows R-REPORT-001..005 + R-SPEC-006 done.
- Lab Arena has the RunReportPanel.
- `/report?id=...` route works on the deployed Vercel app.
- Browser QA screenshots saved in `ops/qa-evidence/0006-pass-{A..E}.png`.
- A user can:
  1. Run a session → export JSON → paste into a new browser session →
     reach identical state.
  2. Run a session → export markdown → paste in Slack → readable summary.
  3. Run a session → screenshot the summary view at 1200×800 → clean
     portfolio artifact.
