# design: multi-party portal and scenario authoring

## Architecture summary

The data model becomes multi-party. The UI gains a view picker. Storage
gains a versioned schema. Algorithms stay structurally the same — they
already operate on participant lists per spec 0004's reliability work, just
on lists of length 2.

```
EDITED (web/src/model/):
  types.ts                   Participant list semantics; add Role enum;
                             schemaVersion field on LabScenario
  simulation.ts              loop over participants; no buyer/supplier
                             hardcoding; multi-party transferLedger split rules
  decoys.ts                  decoys parameterize on role, not seat index

NEW (web/src/model/):
  scenarioSchema.ts          zod schema for the versioned JSON contract
  views.ts                   redaction helpers per role
  strategies.ts              canonical agent strategy library (≥ 8)
  shapleyTransfer.ts         iterative Shapley split (≤ 5 participants)

EDITED (web/src/surfaces/):
  LabSurface.tsx or arena/*  view picker; per-party panels; multi-row
                             transfer ledger; participant-add flow with
                             strategy library

NEW (web/src/surfaces/views/):
  BuyerView.tsx              buyer's allowed fields only
  SupplierView.tsx           one supplier's allowed fields only
  CoordinatorView.tsx        orchestration trace, redacted utilities

EDITED (web/src/data/):
  scenarios.ts               existing 6 scenarios get schemaVersion + role
                             tags; add 3 new multi-party scenarios

NEW (docs/):
  scenario-schema.md         canonical JSON schema documented
  strategy-library.md        descriptions of each canonical archetype
```

## Multi-party data model (R-PORTAL-001)

The existing `LabScenario` type already has `participants: Participant[]`.
Spec 0005 enforces that algorithm code iterates over the list rather than
destructuring `[buyer, supplier]`. Audit `simulation.ts` for any
`participants[0]` / `participants[1]` access; refactor to role-based lookup.

```ts
// before
const buyer = scenario.participants[0];
const supplier = scenario.participants[1];

// after
const buyers = scenario.participants.filter(p => p.role === 'buyer');
const suppliers = scenario.participants.filter(p => p.role === 'supplier');
```

The 8 mechanisms continue to work — most are role-agnostic. ADMM, alternating
best response, price-only dual, consensus averaging extend naturally to N
parties (each iteration loops over all parties). The oracle generalizes by
maximizing sum-of-utilities.

## Per-party views (R-PORTAL-002)

A view is a render-time projection of the scenario, keeping only the fields
that role would have access to. The new `views.ts` exports:

```ts
type View = 'buyer' | `supplier-${number}` | 'coordinator';
function projectScenario(scenario: LabScenario, view: View): ProjectedScenario;
```

`ProjectedScenario` is the same shape as `LabScenario` but with
`participants[i].privateFields` replaced by sentinel values where the view
doesn't have access. The Lab Arena passes the projected scenario to all UI
components.

## Privacy enforcement (R-PORTAL-003)

The redaction happens in `views.ts`, not in the UI. UI components receive
already-redacted data and render placeholders for sentinel values. This makes
"buyer can see supplier's cost" a single-source-of-truth bug rather than a
"I forgot to hide that column" bug.

Type-level guard:

```ts
type ProjectedParticipant = Participant | RedactedParticipant;
type RedactedParticipant = {
  id: string;
  name: string;
  role: Role;
  // utility_formula, parameters, etc. replaced with `null` sentinel
  redactedFields: string[];  // for UI placeholder rendering
};
```

UI components branch on `'redactedFields' in participant`.

## Canonical strategy library (R-PORTAL-004)

`web/src/data/strategies.ts` exports:

```ts
type Strategy = {
  id: string;
  name: string;
  role: Role;
  description: string;
  defaultUtilityFormula: string;
  defaultParameters: Record<string, number>;
  teachesSpecSection?: string;  // e.g. 'R-OPS-001'
};
```

Minimum 8 strategies:
1. **just-in-time-buyer** — minimizes inventory at penalty of stockout risk
2. **launch-protection-buyer** — pays premium for capacity reservation
3. **truthful-cpp-buyer** — reports utility honestly under VCG
4. **capacity-guard-supplier** — refuses orders above safe utilization
5. **relationship-builder-supplier** — accepts marginal-cost orders to
   build trust
6. **hard-bargainer-supplier** — overstates costs unless audit detected
7. **packager-throughput-optimizer** — coordinates upstream and downstream
8. **coordinator-welfare-maximizer** — runs the mechanism honestly

## Scenario schema with versioning (R-PORTAL-005)

zod schema lives in `scenarioSchema.ts`. Versioning convention:
`schemaVersion: "0.5.0"` (matches the spec number). A small migration map
upgrades old scenarios on import:

```ts
const migrations: Record<string, (s: any) => LabScenario> = {
  '0.3.0': (s) => upgrade_0_3_to_0_5(s),  // pre-0005 two-party scenarios
};
```

Import path: paste JSON → parse → migrate if needed → zod validate → load.
Validation errors are field-path-specific.

## Multi-party transfers (R-PORTAL-006)

Three split rules:

- **Proportional**: weight by outside-option deficit (existing rule, generalized)
- **Equal**: surplus / N
- **Shapley**: iterative for N ≤ 5; uses `shapleyTransfer.ts`

Shapley implementation: enumerate all permutations of N participants, for
each compute the marginal contribution of adding party i, average across
permutations. For N=5 that's 120 permutations × N marginal computations =
600 algorithm runs per ledger. Acceptable; the lab is single-user and
caches results.

Multi-party no-worse-off: per-participant check; the ledger renders one row
per participant with after-transfer utility and the flag.

## Cross-spec considerations

This spec deliberately does NOT change:

- The 8 mechanisms' algorithm-shape (extends them to N parties; doesn't add new mechanisms)
- The Arc surface (Arc remains a two-party teaching tool)
- The formula DSL
- The α / reliability / ε / decoy machinery from spec 0004

The spec composes cleanly because spec 0004 already pushed toward
participant-list-based code.

## Test surface (preview)

Detailed in `acceptance.md`. Headline:

- `web/src/model/simulation.test.ts` — multi-party algorithm tests (3, 5 parties)
- `web/src/model/scenarioSchema.test.ts` — schema validation + migration
- `web/src/model/views.test.ts` — redaction correctness per role
- `web/src/model/shapleyTransfer.test.ts` — Shapley split properties
- `web/src/surfaces/LabSurface.test.tsx` — view picker behavior
- Coverage target: ≥ 80% on new modules
