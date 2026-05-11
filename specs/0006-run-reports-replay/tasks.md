# tasks: run reports, replay, and shareable evidence

Build order: A → B → C → D → E. (A is the foundation; everything else
hangs off the `RunReport` type.)

## Pass A — Run report shape + schema (~2 hrs)

- [ ] **A1**: Create `web/src/model/runReport.ts` with `RunReport` type
  + `assembleReport()` function. *(R-REPORT-001)*
- [ ] **A2**: Create `web/src/model/runReportSchema.ts` (zod) defining
  the canonical shape with `schemaVersion: '0.6.0'`. *(R-REPORT-001, R-REPORT-005)*
- [ ] **A3**: `parseRunReport(json: string): RunReport` with friendly
  field-path errors. *(R-REPORT-003)*
- [ ] **A4**: Unit tests in `runReport.test.ts`: assembleReport produces
  a schema-valid report; round-trip JSON.stringify → parseRunReport yields
  identical object. *(R-REPORT-001, R-REPORT-003)*

## Pass B — JSON export (~1 hr)

- [ ] **B1**: Create `web/src/components/RunReportPanel.tsx`. *(R-REPORT-001)*
- [ ] **B2**: "Export run report" button → assembleReport → clipboard.
  Toast confirmation. *(R-REPORT-001)*
- [ ] **B3**: Mount RunReportPanel in Lab Arena. *(R-REPORT-001)*
- [ ] **B4**: UI test: AppTest asserts button visible after a run; clicking
  triggers a clipboard write (mock `navigator.clipboard`). *(R-REPORT-001)*

## Pass C — Markdown export (~2 hrs)

- [ ] **C1**: Create `web/src/model/reportMarkdown.ts` with
  `toMarkdown(report): string`. *(R-REPORT-002)*
- [ ] **C2**: Implement the small template set for "what this teaches".
  *(R-REPORT-002)*
- [ ] **C3**: "Export as markdown" button → toMarkdown → clipboard.
  *(R-REPORT-002)*
- [ ] **C4**: Unit tests in `reportMarkdown.test.ts`: output is valid
  markdown; idempotent (same input → same output); template selection
  fires correctly for each run shape. *(R-REPORT-002)*

## Pass D — Replay + run ledger (~3 hrs)

- [ ] **D1**: Create `web/src/model/reportStorage.ts` with save/list/load/
  delete helpers. *(R-REPORT-004)*
- [ ] **D2**: 20-run cap; sort desc; namespaced localStorage keys.
  *(R-REPORT-004)*
- [ ] **D3**: RunReportPanel: "Replay run" textarea + "Load" button. On
  load, dispatch state update + re-run algorithms. *(R-REPORT-003)*
- [ ] **D4**: Past runs list in RunReportPanel: 20 most recent with
  click-to-load + delete. *(R-REPORT-004)*
- [ ] **D5**: Auto-save on each algorithm run. *(R-REPORT-004)*
- [ ] **D6**: Tests in `reportStorage.test.ts`: save → list → load yields
  identical; delete removes; clearAll empties. *(R-REPORT-004)*
- [ ] **D7**: Round-trip test: export → clear lab → replay → identical
  state and metrics. *(R-REPORT-003)*

## Pass E — Summary view (~2 hrs)

- [ ] **E1**: Create `web/src/pages/report.astro`. *(R-REPORT-005)*
- [ ] **E2**: Read `?id=...` from URL → load from localStorage. *(R-REPORT-005)*
- [ ] **E3**: Read `?json=<encoded>` from URL (for sharing). *(R-REPORT-005)*
- [ ] **E4**: Render fixed 1200×800 layout: scenario card, agents,
  coordination gap headline, mechanism bar chart, citation footer.
  *(R-REPORT-005)*
- [ ] **E5**: Screenshot test: take a screenshot at 1200×800; assert
  layout fits without scrolling. *(R-REPORT-005)*

## Spec discipline (S*)

- [ ] **S1**: Register in `specs/README.md`. *(R-SPEC-006)*
- [ ] **S2**: Update `traceability.md` as tasks ship. *(R-SPEC-006)*
- [ ] **S3**: Append `ops/run-ledger.md` per pass. *(R-SPEC-006)*

## Build order

```
A (shape + schema)        foundation
B (JSON export)            depends on A
C (markdown export)        depends on A
D (replay + ledger)        depends on A, B
E (summary view)           depends on A
```

Estimated: ~10 hours total.

## Discipline gates

Standard set. All must pass per pass.

## Out of scope

- Server-side storage. localStorage only.
- Multi-user sharing platforms (Notion, Drive, Sheets).
- Versioned migration of older reports.
- LLM-generated narratives in markdown.
- PDF export.
