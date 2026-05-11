# design: data bridges

## Architecture summary

Three optional bridges + visualization. All bridges produce normalized
scenario seeds that flow into the existing scenario loader. No bridge
introduces a new top-level mechanism.

```
NEW (web/src/model/):
  bridges/
    csvImport.ts             parse CSV → scenario seed
    chipMap.ts               fetch chip-supply-chain-map data
    supplierRisk.ts          fetch supplier-risk-rag-agent corpus
    sourceProvenance.ts      track per-field data provenance

NEW (web/src/surfaces/):
  arena/SourceGraph.tsx      directed-graph view of multi-party scenario
                             (uses cytoscape.js or react-flow)

EDITED (web/src/surfaces/):
  LabSurface.tsx or arena/*  add bridge controls + source badge

NEW (data/example-imports/):
  open-contracting-sample.csv  example for R-BRIDGE-001

NEW (docs/):
  bridges.md                 documents each bridge + boundary rules
```

## CSV import (R-BRIDGE-001)

Open Contracting Data Standard provides field naming conventions:
party, contract, award, period. The lab uses a simplified shape
focused on negotiation-relevant fields.

CSV column convention:

```
supplier_id, buyer_id, product_id, period, quantity, unit_price, capacity,
lead_time_weeks, risk_score (optional), evidence_id (optional)
```

Parser:

```ts
function parseImport(csv: string): { seed: ScenarioSeed; errors: ImportError[] };
```

`ScenarioSeed` is a partial scenario that the UI completes (with default
formulas, etc.).

## Source graph (R-BRIDGE-002)

A directed graph: nodes = participants (color by role), edges = product
flows (thickness by quantity). Library options: cytoscape.js (already
familiar from chip-supply-chain-map) or react-flow.

Recommended: **cytoscape.js** for consistency with the chip-map.

Click a node → switch the Lab Arena's view picker to that participant
(integrates with spec 0005's per-party views).

## Chip-supply-chain-map bridge (R-BRIDGE-003)

```ts
// web/src/model/bridges/chipMap.ts
const NODES_URL = 'https://raw.githubusercontent.com/AthenaTheOwl/chip-supply-chain-map/main/src/data/nodes.csv';
const EDGES_URL = 'https://raw.githubusercontent.com/AthenaTheOwl/chip-supply-chain-map/main/src/data/edges.csv';

async function fetchChipMapData(): Promise<{ nodes: ChipNode[]; edges: ChipEdge[] }>;
async function seedFromChipMap(selectedNodeIds: string[]): Promise<ScenarioSeed>;
```

UI:
- Opt-in toggle on the Lab Arena.
- Click → fetch → list nodes → multi-select 2-5 → "Seed scenario".
- Resulting scenario has the selected companies as participants with
  reasonable defaults (capacity from the chip-map edge data,
  reliability priors from the chokepoint score).

## Supplier-risk-rag-agent bridge (R-BRIDGE-004)

```ts
const CORPUS_URL = 'https://raw.githubusercontent.com/AthenaTheOwl/supplier-risk-rag-agent/main/data/sample_corpus/chunks.jsonl';

async function fetchRiskCorpus(): Promise<RiskChunk[]>;
async function attachEvidence(scenario: LabScenario, chunkIds: string[]): Promise<LabScenario>;
```

UI:
- Opt-in toggle on the Lab Arena.
- Click → fetch corpus → list chunks (with company + risk type metadata)
  → multi-select 1-5 → "Attach to scenario".
- Attached evidence shows in the evidence panel with the chunk text and
  citation.
- `scenario.evidenceIds` is populated; `risk_score` is derived from the
  chunk's risk-category tag (heuristic mapping; documented).

## Provenance tracking (R-BRIDGE-005)

```ts
type DataProvenance = 'synthetic' | 'chip-map' | 'supplier-risk-rag' | 'user-imported';

type LabScenarioWithProvenance = LabScenario & {
  provenance: {
    overall: DataProvenance;
    perField?: Partial<Record<keyof LabScenario, DataProvenance>>;
  };
};
```

Source badge on every scenario card.

`docs/public-data-boundary.md` (existing) gets updated with bridge rules:
- All bridges fetch from public GitHub raw URLs only.
- No authentication.
- No live retrieval against the supplier-risk-rag-agent's running demo
  (that would require the user's own Anthropic key; out of scope).
- Provenance is recorded per scenario field.

## Cross-spec considerations

- **Depends on spec 0005**: multi-party scenarios make the source graph
  meaningful; bridges seed multi-party scenarios.
- **Depends on spec 0007**: schema-first validation enforces bridge
  outputs conform to scenarioSchema.
- **Composes with spec 0006**: run reports include provenance.

## Test surface

- `csvImport.test.ts` — parse valid + invalid CSVs
- `chipMap.test.ts` — fetch mock + seed scenario
- `supplierRisk.test.ts` — fetch mock + attach evidence
- `sourceProvenance.test.ts` — provenance tracking
- `SourceGraph.test.tsx` — graph renders for N=2..8
- Coverage target: ≥ 80% on new modules
