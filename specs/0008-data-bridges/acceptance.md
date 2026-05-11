# acceptance: data bridges

## Pass A — CSV import

| Check | Verification |
|---|---|
| `csvImport.ts` exists with `parseImport` | file presence |
| Column convention documented | grep `bridges.md` |
| Valid CSV → ScenarioSeed | unit test |
| Invalid CSV → per-row errors with line numbers | unit test |
| Lab Arena has "Import CSV" control | DOM presence |
| Example CSV ships in `data/example-imports/` | file presence |

## Pass B — Source graph

| Check | Verification |
|---|---|
| cytoscape.js installed | package.json |
| Source-graph toggle in Lab Arena | DOM presence |
| Graph renders for N=2 through N=8 | AppTest |
| Edge thickness encodes quantity | AppTest |
| Click node switches view picker | AppTest |

## Pass C — Chip-map bridge

| Check | Verification |
|---|---|
| `chipMap.ts` exists | file presence |
| Toggle visible in Lab Arena | DOM presence |
| Fetch from public GitHub raw URL | unit test with mock |
| Node picker shows fetched data | AppTest |
| Seed produces valid scenario | unit test |
| Fetch failure surfaces error + fallback | unit test |
| `sessionStorage` caches the fetch | unit test |

## Pass D — Supplier-risk bridge

| Check | Verification |
|---|---|
| `supplierRisk.ts` exists | file presence |
| Toggle visible in Lab Arena | DOM presence |
| Fetch from public GitHub raw URL | unit test with mock |
| Chunk picker shows fetched corpus | AppTest |
| Risk-score derivation documented + tested | unit test |
| Citations flow into run reports | integration test |

## Pass E — Provenance tracking

| Check | Verification |
|---|---|
| `sourceProvenance.ts` exists | file presence |
| Every scenario has provenance tag | unit test |
| Source badge visible on each scenario card | AppTest |
| Run report includes provenance | unit test |
| `docs/public-data-boundary.md` updated | grep new bridge rules |
| No live retrieval against private endpoints | code review (all fetches go to raw.githubusercontent.com) |

## Discipline gates

Standard set + spec_check.

## Definition of done

- All checks pass.
- `traceability.md` shows R-BRIDGE-001..005 + R-SPEC-008 done.
- Lab Arena has CSV import, source-graph mode, two opt-in bridges, and
  source badges.
- `docs/public-data-boundary.md` reflects bridge rules.
- Browser QA evidence saved as `ops/qa-evidence/0008-pass-{A..E}.png`.
- A user can:
  1. Paste a valid CSV → land on a Lab scenario seed.
  2. Toggle chip-map bridge → seed a scenario from real chokepoint data.
  3. Toggle supplier-risk bridge → attach real risk-factor excerpts.
  4. See provenance badges everywhere.
