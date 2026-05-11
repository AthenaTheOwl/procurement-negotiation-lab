# tasks: data bridges

Build order: A → B → C → D → E. (A and B independent; C and D depend on A's
schema work for bridge outputs.)

## Pass A — CSV import (~3 hrs)

- [ ] **A1**: Create `web/src/model/bridges/csvImport.ts` with
  `parseImport(csv): { seed, errors }`. *(R-BRIDGE-001)*
- [ ] **A2**: Define the column convention (supplier_id, buyer_id,
  product_id, period, quantity, unit_price, capacity, optional fields).
  *(R-BRIDGE-001)*
- [ ] **A3**: Lab Arena: "Import CSV" control (paste or upload). Validate
  rows; surface per-row errors with line numbers. *(R-BRIDGE-001)*
- [ ] **A4**: Author `data/example-imports/open-contracting-sample.csv`.
  *(R-BRIDGE-001)*
- [ ] **A5**: Unit tests in `csvImport.test.ts`: valid CSV → seed;
  invalid CSV → field-path errors. *(R-BRIDGE-001)*

## Pass B — Source graph (~3 hrs)

- [ ] **B1**: Add cytoscape.js dependency. *(R-BRIDGE-002)*
- [ ] **B2**: Create `web/src/surfaces/arena/SourceGraph.tsx`. *(R-BRIDGE-002)*
- [ ] **B3**: Source-graph mode toggle in Lab Arena. *(R-BRIDGE-002)*
- [ ] **B4**: Graph renders for N=2..8 participants. *(R-BRIDGE-002)*
- [ ] **B5**: Click node → switch view picker to that participant.
  *(R-BRIDGE-002)*
- [ ] **B6**: AppTest: render multi-party scenario; assert graph DOM
  presence; click test. *(R-BRIDGE-002)*

## Pass C — Chip-supply-chain-map bridge (~3 hrs)

- [ ] **C1**: Create `web/src/model/bridges/chipMap.ts` with
  `fetchChipMapData` + `seedFromChipMap`. *(R-BRIDGE-003)*
- [ ] **C2**: Lab Arena: "Seed from chip-supply-chain-map" toggle + node
  picker. *(R-BRIDGE-003)*
- [ ] **C3**: Map chip-map edge data → participant defaults (capacity,
  reliability priors from chokepoint score). *(R-BRIDGE-003)*
- [ ] **C4**: Cache fetched data in `sessionStorage` (one fetch per
  session). *(R-BRIDGE-003)*
- [ ] **C5**: Fetch failure → clear error + manual-entry fallback.
  *(R-BRIDGE-003)*
- [ ] **C6**: Tests in `chipMap.test.ts`: mock fetch; assert seeded
  scenario has expected participants. *(R-BRIDGE-003)*

## Pass D — Supplier-risk-rag-agent bridge (~3 hrs)

- [ ] **D1**: Create `web/src/model/bridges/supplierRisk.ts` with
  `fetchRiskCorpus` + `attachEvidence`. *(R-BRIDGE-004)*
- [ ] **D2**: Lab Arena: "Attach risk evidence" toggle + chunk picker.
  *(R-BRIDGE-004)*
- [ ] **D3**: Risk-score derivation from chunk metadata (document the
  heuristic mapping). *(R-BRIDGE-004)*
- [ ] **D4**: Attached evidence displays in the evidence panel; citations
  flow into run reports. *(R-BRIDGE-004)*
- [ ] **D5**: Tests in `supplierRisk.test.ts`: mock fetch; assert
  evidence attachment + risk_score derivation. *(R-BRIDGE-004)*

## Pass E — Provenance tracking (~2 hrs)

- [ ] **E1**: Create `web/src/model/bridges/sourceProvenance.ts`.
  *(R-BRIDGE-005)*
- [ ] **E2**: Each bridge tags its output with provenance metadata.
  *(R-BRIDGE-005)*
- [ ] **E3**: Lab Arena: source badge on every scenario card.
  *(R-BRIDGE-005)*
- [ ] **E4**: Run reports (spec 0006) include provenance per field.
  *(R-BRIDGE-005)*
- [ ] **E5**: Update `docs/public-data-boundary.md` with bridge rules.
  *(R-BRIDGE-005)*
- [ ] **E6**: Tests: provenance survives scenario → run → report
  round-trip. *(R-BRIDGE-005)*

## Spec discipline (S*)

- [ ] **S1**: Register in `specs/README.md`. *(R-SPEC-008)*
- [ ] **S2**: Update `traceability.md` as tasks ship. *(R-SPEC-008)*
- [ ] **S3**: Append `ops/run-ledger.md` per pass. *(R-SPEC-008)*

## Build order

```
A (CSV import)          independent
B (source graph)         independent
C (chip-map bridge)      depends on A (schema)
D (supplier-risk bridge) depends on A
E (provenance)           depends on A, C, D
```

Estimated: ~14 hours total.

## Discipline gates

Standard set. Includes spec_check (from spec 0007).

## Out of scope

- Live retrieval against supplier-risk-rag-agent's running demo.
- Real-time chip-map updates.
- Custom CSV schemas beyond the documented shape.
- Server-side caching.
- Authentication.
