# traceability: data bridges

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-BRIDGE-001** CSV import (owner_role: engineering.implementation; owner_role_pending_graduation: domain.bridge-author) | A1, A2, A3, A4, A5 | Pass A: `csvImport.ts`; column convention; valid → seed; invalid → field errors; example CSV ships | done (csvImport.ts + CSVImportPanel + tests + data/example-imports/open-contracting-sample.csv) |
| **R-BRIDGE-002** source-graph visualization (owner_role: engineering.implementation; owner_role_pending_graduation: design.flow-illustrator) | B1, B2, B3, B4, B5, B6 | Pass B: cytoscape; toggle; renders N=2..8; click switches view | done (SourceGraph.tsx + LabSurface toggle) |
| **R-BRIDGE-003** chip-map bridge (owner_role: engineering.implementation; owner_role_pending_graduation: domain.bridge-author) | C1, C2, C3, C4, C5, C6 | Pass C: `chipMap.ts`; toggle; fetch public URL; seed valid; failure handled; sessionStorage cache | done (chipMap.ts + BridgePanel + tests) |
| **R-BRIDGE-004** supplier-risk bridge (owner_role: engineering.implementation; owner_role_pending_graduation: domain.bridge-author) | D1, D2, D3, D4, D5 | Pass D: `supplierRisk.ts`; toggle; fetch public URL; risk-score derivation; citations flow | done (supplierRisk.ts + BridgePanel + tests) |
| **R-BRIDGE-005** provenance tracking (owner_role: engineering.implementation; owner_role_pending_graduation: security.threat-modeler) | E1, E2, E3, E4, E5, E6 | Pass E: `sourceProvenance.ts`; badges visible; reports include provenance; boundary doc updated | done (sourceProvenance.ts + ProvenanceBadge + RunReport carries provenance; docs/public-data-boundary.md extended with bridge rules) |
| **R-SPEC-008** discipline (owner_role: product.spec-writer) | S1, S2, S3 | Spec entry; this file; run-ledger | in progress |

## Update protocol

Same as prior specs.

## Status snapshot

```
Pass A — CSV import           done (Open Contracting column shape)
Pass B — source graph         done (cytoscape lazy-loaded)
Pass C — chip-map bridge      done (fetch + sessionStorage cache + seedFromChipMap)
Pass D — supplier-risk bridge done (fetch + risk-score derivation + citations)
Pass E — provenance           done (per-scenario tag + badges + report carries provenance)
Spec discipline               in progress (this file)
```

## Cross-spec dependencies

- **Depends on spec 0005**: multi-party scenarios; per-party views the
  source graph hooks into.
- **Depends on spec 0007**: scenarioSchema enforces bridge outputs.
- **Composes with spec 0006**: run reports include provenance.
