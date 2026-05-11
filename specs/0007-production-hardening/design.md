# design: production hardening from MedRoute patterns

## Architecture summary

Discipline, not new features. Existing modules get harder edges; tests
get more rings; CI gets more checks. No new UI surfaces.

```
NEW (web/src/):
  test/factories.ts           buildScenario, buildParticipant, buildRunReport
  model/decisionEvent.ts      typed event union + reducer for accumulating
  integration/                directory for cross-module integration tests
    scenario-to-ledger.test.ts
    formula-authoring.test.ts
    report-roundtrip.test.ts

NEW (web/e2e/):
  smoke.spec.ts               Playwright smoke against deployed URL
  playwright.config.ts        config + base URL env var

EDITED (web/src/model/):
  scenarioSchema.ts           (created in 0005) → enforce as the only path
  simulation.ts               emit decision events; rest stays the same

EDITED (scripts/):
  spec_check.py               enumerate R-* across all specs; fail on
                              missing tasks/acceptance coverage

EDITED (.github/workflows/):
  tests.yml                   add Playwright smoke against deployed URL
                              (weekly + workflow_dispatch)
  spec-check.yml              new; runs on every PR
```

## Schema-first scenario (R-HARDEN-001)

Spec 0005 introduces `scenarioSchema.ts`. Spec 0007 enforces that *every*
scenario load path goes through it:

- Built-in `scenarios.ts` fixtures: each one is parsed via `scenarioSchema.parse()`
  at module load (lazy — first access).
- Import: paste → parse → load.
- Replay: replay JSON → parse → load.

The TypeScript type `LabScenario` is inferred via `z.infer<typeof scenarioSchema>`.
This guarantees the runtime check and the compile-time type are the same shape.

Build-time test: a test loads each built-in fixture and asserts it parses.

## Test data factories (R-HARDEN-002)

```ts
// web/src/test/factories.ts
export function buildScenario(overrides: Partial<LabScenario> = {}): LabScenario {
  const base: LabScenario = {
    schemaVersion: '0.5.0',
    id: 'test-scenario',
    title: 'Test scenario',
    participants: [
      buildParticipant({ role: 'buyer' }),
      buildParticipant({ role: 'supplier' }),
    ],
    products: [{ id: 'p1', demand_mean: 500, ... }],
    ...
  };
  const merged = { ...base, ...overrides };
  return scenarioSchema.parse(merged);  // every factory output is validated
}
```

Factories migrate inline test data. Existing tests refactor to call
`buildScenario({ risk_score: 0.7 })` instead of constructing inline.

## Decision event log (R-HARDEN-003)

```ts
type DecisionEvent =
  | { kind: 'scenario.loaded'; scenarioId: string; ts: string; runId: string }
  | { kind: 'algorithm.started'; algorithm: MechanismId; ts: string; runId: string }
  | { kind: 'algorithm.completed'; algorithm: MechanismId; result: AlgorithmRun; ts: string; runId: string }
  | { kind: 'transfer.computed'; ledger: TransferLedger; ts: string; runId: string }
  | { kind: 'view.switched'; from: View; to: View; ts: string; runId: string }
  | { kind: 'export.issued'; format: 'json' | 'markdown'; ts: string; runId: string }
  | { kind: 'replay.loaded'; reportId: string; ts: string; runId: string }
  ;
```

A `useReducer` slice accumulates events. The run report (spec 0006)
includes the event log. The log is bounded (~200 most recent) to keep
storage and serialization sane.

Tests assert that a canonical sequence (load → run → transfer → export)
produces the expected event sequence.

## Playwright smoke (R-HARDEN-004)

```ts
// web/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

test('home + arc walk', async ({ page }) => {
  await page.goto(process.env.SMOKE_URL ?? 'https://procurement-negotiation-lab.vercel.app/');
  await expect(page.getByText('mechanism design')).toBeVisible();
  await page.getByRole('link', { name: 'Walk the arc' }).click();
  await expect(page.getByText('coordination gap')).toBeVisible();
  // advance through steps...
});
```

CI workflow `smoke.yml` runs on weekly schedule + `workflow_dispatch`.
On failure, opens an issue (or uses existing maintenance pipeline).

## spec_check (R-HARDEN-005)

```python
# scripts/spec_check.py
import re
from pathlib import Path

def collect_requirements(spec_dir: Path) -> dict[str, dict]:
    """Return {req_id: {tasks: set[task_id], accepts: set[check]}} from a spec."""
    ...

def main():
    spec_dirs = sorted(Path('specs').glob('????-*'))
    all_failures = []
    for spec_dir in spec_dirs:
        reqs = collect_requirements(spec_dir)
        for req_id, coverage in reqs.items():
            if not coverage['tasks']:
                all_failures.append(f'{spec_dir.name}/{req_id}: no tasks reference it')
            if not coverage['accepts']:
                all_failures.append(f'{spec_dir.name}/{req_id}: no acceptance checks reference it')
    if all_failures:
        for f in all_failures:
            print(f)
        sys.exit(1)
    print('spec_check: clean')
```

CI workflow `spec-check.yml` runs on every PR.

## Integration tests (R-HARDEN-006)

Three integration tests covering the major cross-module contracts:

1. **scenario-to-ledger.test.ts**: load a scenario → run all 8 mechanisms →
   compute transfers → assert ledger has N rows for N participants and
   non-zero global utility.
2. **formula-authoring.test.ts**: author a custom formula → re-run
   mechanism → assert new utility computed; author a malformed formula →
   assert error surfaces with field path.
3. **report-roundtrip.test.ts**: configure a Lab → export report → clear
   Lab → replay report → assert all metrics identical.

These tests exercise public APIs only — they're the contract tests.

## Cross-spec considerations

- **Depends on spec 0005**: scenarioSchema.ts comes from 0005.
- **Composes with spec 0006**: decisionEvent log feeds the run report;
  Playwright smoke can also export a report and validate it round-trips.
- **Composes with all future specs**: spec_check enforces discipline going
  forward.

## Test surface

- Existing tests stay; new tests added (factories, decision events,
  integration, Playwright).
- Coverage target: ≥ 85% line coverage on `web/src/model/`.
- spec_check exits zero on every PR.
