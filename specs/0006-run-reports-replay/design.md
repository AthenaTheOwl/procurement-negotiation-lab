# design: run reports, replay, and shareable evidence

## Architecture summary

A run report is a typed snapshot of a Lab session. The same JSON powers
export, replay, browser-ledger storage, and the summary view.

```
NEW (web/src/model/):
  runReport.ts               type definitions + assembleReport()
  runReportSchema.ts         zod schema with schemaVersion
  reportStorage.ts           localStorage CRUD helpers
  reportMarkdown.ts          JSON → markdown formatter

EDITED (web/src/model/):
  simulation.ts              expose a way to read all run results in one
                             call (already mostly there; surface as
                             `currentRunState()` helper)

NEW (web/src/components/):
  RunReportPanel.tsx         export buttons + replay input + past runs list

EDITED (web/src/surfaces/):
  LabSurface.tsx or arena/*  mount RunReportPanel
  ArcSurface.tsx             (optional) mount a smaller export-only widget

NEW (web/src/pages/):
  report.astro               summary view at /report?id=... (single page)

EDITED (web/src/data/):
  N/A — no scenario or strategy changes
```

## Run report shape (R-REPORT-001)

```ts
type RunReport = {
  schemaVersion: '0.6.0';
  id: string;                  // uuid v4
  timestamp: string;           // ISO 8601
  label: string;               // human-readable, e.g. "substrate crunch + hard bargainer + ε=0.05"

  scenario: LabScenario;       // full, including custom formulas
  parameters: {
    alpha: number;
    epsilon: number;
    auditMode: boolean;
  };
  reliabilityByAgent: Record<string, number>;

  algorithmResults: AlgorithmRun[];
  frontierPlans?: Frontier;
  decoyAudit?: DecoyAuditResult[];

  computed: {
    coordinationGap: number;
    bestNonOracle: string;     // mechanism id
    bestNonOracleGap: number;
    transferLedger: TransferLedger;
  };

  notes?: string;              // free-form user note, optional
};
```

`runReportSchema.ts` defines this in zod and exposes
`parseRunReport(json: string): RunReport`.

## JSON export (R-REPORT-001)

`assembleReport()` in `runReport.ts` reads the Lab's current state and
returns a `RunReport`. The Export button:

1. Calls `assembleReport()`
2. Serializes to JSON (pretty-printed, ~2-3 KB typical)
3. Writes to clipboard via `navigator.clipboard.writeText`
4. Surfaces a toast "Run report copied to clipboard"

## Markdown export (R-REPORT-002)

`reportMarkdown.ts::toMarkdown(report)` produces:

```markdown
# Run report — {scenario.title}

**{timestamp}** — {label}

## Setup
- Buyer: {participant.name} ({participant.role})
- Supplier(s): ...
- α = {alpha}, ε = {epsilon}, audit mode {on/off}

## Mechanisms
| Mechanism | Global utility | vs oracle | Privacy exposure |
|---|---|---|---|
| ... | ... | ... | ... |

## Headline
**Coordination gap: ${coordinationGap}** — recovered by {bestNonOracle} ({bestNonOracleGap})

## What this teaches
{templated paragraph based on which mechanism won, which scenarios fired,
etc.}

---
[Open the lab](https://procurement-negotiation-lab.vercel.app/) ·
[Reproduce this run](#reproduce)

<details>
<summary>↓ reproduce this run</summary>
{JSON dump}
</details>
```

The "what this teaches" paragraph picks from a small set of templates based
on run shape:
- ADMM converged + recovered most surplus → standard cooperation lesson
- ADMM oscillated; alt-BR converged → algorithm choice matters lesson
- Joint optimum infeasible → CBT can't make everyone whole lesson
- Audit mode caught decoy → mechanism is one piece; auditing is another lesson

## Replay (R-REPORT-003)

The "Replay" input is a textarea. On submit:

1. `parseRunReport(json)` validates via zod.
2. On error: render the zod error at the specific field path.
3. On success: dispatch a "load this run" action that overwrites Lab state
   with `report.scenario`, `report.parameters`, `report.reliabilityByAgent`.
4. Re-run algorithms (deterministic).
5. Compare computed metrics to `report.computed`; if mismatch (e.g. due to
   a code change since the report was generated), surface a warning.

## Run ledger (R-REPORT-004)

`reportStorage.ts` exposes:

```ts
saveRun(report: RunReport): void;
listRuns(): RunReportSummary[];   // last 20, sorted desc
loadRun(id: string): RunReport;
deleteRun(id: string): void;
clearAll(): void;
```

Backed by `localStorage` keys `procurement-lab.runs.<uuid>`. A summary
index at `procurement-lab.runs.__index` keeps the list sorted without
deserializing all reports.

20-run cap is enforced on save (oldest evicted). Storage budget for 20
typical reports is ~50-100 KB; well under `localStorage` limits.

## Summary view (R-REPORT-005)

New Astro page `web/src/pages/report.astro` that reads `?id=...` (or
`?json=...`) from URL, hydrates a React component, and renders a fixed
1200×800 layout:

- Header: scenario title + timestamp
- Setup card: agents at a glance
- Coordination gap: large headline number
- Mechanism comparison: small horizontal bar chart
- Citation footer: links to lab + Bergemann

The page is read-only. No interactive controls. Screenshot-friendly fonts
and contrast.

URL shape: `/report?id=<uuid>` loads from localStorage; `/report?json=<encoded>`
loads from a URL-encoded JSON payload (capped at ~6 KB to fit URL limits).

## Cross-spec considerations

This spec composes cleanly with:
- Spec 0003 (Arc): the export button can also live in the Arc's final
  step, enabling Arc → report → share flows.
- Spec 0004 (operational refinements): the parameter set is captured
  verbatim.
- Spec 0005 (multi-party): when 0005 ships, the report shape extends
  naturally to N participants. The `schemaVersion` bumps to 0.6.0 with
  this spec; spec 0005's bump to 0.5.0 happens independently.

## Test surface

- `runReport.test.ts` — assembleReport produces a valid RunReport
- `runReportSchema.test.ts` — zod parse round-trip
- `reportStorage.test.ts` — save/list/load/delete round-trip
- `reportMarkdown.test.ts` — markdown output is valid + idempotent
- `LabSurface.test.tsx` — Export → clipboard write happens; Replay →
  state updates
- Coverage target: ≥ 80% on new modules
