# design: operational mechanism refinements

## Architecture summary

All four refinements extend existing engine modules and add new UI controls.
No new top-level surfaces. No new mechanism types. No new dependencies.

```
EDITED (web/src/model/):
  simulation.ts          add alpha + reliability + frontier params;
                         add decoy library + audit run;
                         keep existing 8-mechanism API stable.
  types.ts               add Frontier, Decoy, AuditResult types;
                         extend LabScenario with alpha, reliability map.

NEW (web/src/model/):
  decoys.ts              decoy scenario library + expected-response patterns
                         + match/mismatch comparator.

EDITED (web/src/surfaces/):
  ArcSurface.tsx         small adds to step 2, 3, 6, 7 (see requirements)
  arc/Step3TruthDominant.tsx  + α slider
  arc/Step6AuthorAgent.tsx    + "test against decoys" button
  arc/Step7JointOptimumCases.tsx  + ε-frontier widget

EDITED (Lab Arena surfaces; current file structure TBD post-3003):
  LabSurface or arena/*.tsx
                         + α slider on mechanism panel
                         + reliability slider per agent card
                         + ε slider + frontier listing
                         + Audit Mode toggle + decoy panel

EDITED (web/src/components/):
  RunReport.tsx (if/when it exists)
                         include α, reliability map, ε, audit results
                         in the report JSON + markdown export.
```

## α clipping (R-OPS-001)

Existing `simulation.ts` has the cpp-vcg mechanism computing a notional
transfer in its `mechanismScore` row. Refactor that to:

```ts
function vcgTransfer(scenario, agentId, alpha = 1.0): number {
  const externality = computeExternalityWithoutAgent(scenario, agentId);
  return alpha * Math.max(externality, 0);
}
```

The `LabScenario` type gains `alpha?: number` (default 1.0). The Lab Arena
mechanism config panel exposes this as a slider; the Arc Step 3 widget
exposes a smaller version for the tutorial.

CBT ledger downstream uses the clipped transfer when computing
no-worse-off. The existing `transferLedger(scenario)` becomes
`transferLedger(scenario, { alpha })`.

## Reliability multipliers (R-OPS-002)

`ParticipantSpec` (or whatever the React app calls it) gains
`reliability?: number` (default 1.0). The optimization functions in
`simulation.ts` use *effective capacity* = `stated_capacity * reliability`
when solving.

Where the existing code multiplies by capacity, swap in:

```ts
function effectiveCapacity(agent: Participant): number {
  return agent.capacity * (agent.reliability ?? 1.0);
}
```

The agent cards in Lab Arena show both stated and effective values when
reliability < 1. The mechanism's plan output displays both.

## ε-frontier (R-OPS-003)

New function in `simulation.ts`:

```ts
function frontier(
  scenario: LabScenario,
  algorithm: MechanismId,
  epsilon: number,
  K: number = 5,
): AlgorithmRun[];
```

Enumerates plans in descending global-utility order; keeps those within
`epsilon * optimal_utility` of the top result; caps at K. For the discrete
quantity grids the lab uses, this is a finite enumeration — no continuous
optimization is needed.

UI:
- ε slider on Lab Arena (and a smaller version in Arc Step 7)
- A small list/dropdown of the K frontier plans
- Click a plan → the displayed transfer ledger and per-agent utility
  recompute from that plan

## Decoy demand (R-OPS-004)

New file `web/src/model/decoys.ts`:

```ts
type Decoy = {
  id: string;
  title: string;
  scenario: LabScenario;
  expectedResponse: (
    agent: Participant,
    scenario: LabScenario,
  ) => DecoyExpectation;
  catchesMisreportKind: string;  // human-readable
};

type DecoyExpectation = {
  patternName: string;
  description: string;
  isMatch: (actual: AlgorithmRun) => boolean;
};
```

Library starts with 5 decoys:

1. **cheap-routing-known**: cheapest fulfillment center is known; honest
   responders route to it. Catches FC-bias misreporting.
2. **fragile-supplier-known**: one supplier has known low reliability;
   honest planner should discount its capacity. Catches reliability-
   prior bypass attempts.
3. **collusion-pattern**: two suppliers each quoting slightly above the
   third's offer, repeatedly. Catches collusive pricing.
4. **missing-capacity-pattern**: stated capacity systematically exceeds
   what the historical reliability multiplier would predict. Catches
   capacity overpromise.
5. **reliability-mismatch**: agent's stated reliability conflicts with
   its quoted lead-time variance. Catches inconsistent self-reports.

Audit Mode toggle on Lab Arena runs all 5 decoys against current agent
configuration and renders a match/mismatch table.

## Cross-spec considerations

This spec deliberately does NOT change:

- The 8-mechanism API in `simulation.ts` (`algorithmResults`, `labTakeaway`,
  `informationSweep`, `transferLedger`) — extensions are additive
- The Arc's 8-step structure
- The existing 3 + 3 = 6 scenarios in `scenarios.ts`
- The formula DSL in `formula.ts`

The refinements compose cleanly with the existing engine because they were
omitted from spec 0003 intentionally, with this spec earmarked as the
follow-up.

## Visible-causal-delta principle

Per the design principle inherited from spec 0002 ("visible causal deltas
over hidden solver sophistication"), each refinement must show its effect
*immediately* and *legibly* in the UI. A slider that doesn't visibly change
something is worse than no slider. So:

- α slider → transfer ledger values change in real time
- Reliability slider → effective capacity displays change; mechanism plan
  outputs change
- ε slider → frontier plan count changes; user can click between plans
- Audit Mode → match/mismatch table populates with explanation

If any of these refinements ends up requiring a "click apply" button instead
of live updates, that's a design failure and needs revisit.

## Test surface (preview)

Detailed acceptance checks live in `acceptance.md`. Headline:

- `web/src/model/simulation.test.ts` — unit tests for `vcgTransfer(α)`,
  `effectiveCapacity`, `frontier`
- `web/src/model/decoys.test.ts` — unit tests for each decoy's
  expectedResponse + the audit harness
- `web/src/surfaces/LabSurface.test.tsx` (or appropriate file) — AppTest
  assertions for slider behavior and live update
- Coverage target: ≥ 80% on new modules
