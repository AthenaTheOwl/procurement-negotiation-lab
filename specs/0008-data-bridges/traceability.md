# traceability: data bridges

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-BRIDGE-001** CSV import | A1, A2, A3, A4, A5 | Pass A: `csvImport.ts`; column convention; valid → seed; invalid → field errors; example CSV ships | not started |
| **R-BRIDGE-002** source-graph visualization | B1, B2, B3, B4, B5, B6 | Pass B: cytoscape; toggle; renders N=2..8; click switches view | not started |
| **R-BRIDGE-003** chip-map bridge | C1, C2, C3, C4, C5, C6 | Pass C: `chipMap.ts`; toggle; fetch public URL; seed valid; failure handled; sessionStorage cache | not started |
| **R-BRIDGE-004** supplier-risk bridge | D1, D2, D3, D4, D5 | Pass D: `supplierRisk.ts`; toggle; fetch public URL; risk-score derivation; citations flow | not started |
| **R-BRIDGE-005** provenance tracking | E1, E2, E3, E4, E5, E6 | Pass E: `sourceProvenance.ts`; badges visible; reports include provenance; boundary doc updated | not started |
| **R-SPEC-008** discipline | S1, S2, S3 | Spec entry; this file; run-ledger | in progress |

## Update protocol

Same as prior specs.

## Status snapshot

```
Pass A — CSV import           not started
Pass B — source graph         not started
Pass C — chip-map bridge      not started
Pass D — supplier-risk bridge not started
Pass E — provenance           not started
Spec discipline               in progress (this file)
```

## Cross-spec dependencies

- **Depends on spec 0005**: multi-party scenarios; per-party views the
  source graph hooks into.
- **Depends on spec 0007**: scenarioSchema enforces bridge outputs.
- **Composes with spec 0006**: run reports include provenance.
