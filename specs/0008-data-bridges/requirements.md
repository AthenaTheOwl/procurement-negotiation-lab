# requirements: data bridges

## Scope

Bridge the lab to public data sources and adjacent portfolio repos.
Three bridges:

1. **CSV import** for normalized supplier-buyer-product-period data
   (using Open Contracting field conventions as a reference shape).
2. **Source-graph mode** that visualizes the network of supplier-buyer-
   product edges; useful for multi-party scenarios authored in 0005.
3. **Chip-supply-chain-map bridge** — optionally seed scenarios from the
   chip-supply-chain-map repo's `nodes.csv` + `edges.csv`. Cross-portfolio
   compounding.
4. **Supplier-risk-rag-agent bridge** — optionally pull cited risk
   evidence from the supplier-risk-rag-agent corpus to seed scenario
   risk_score and citations.

All bridges are *optional* and *opt-in*. Default scenarios remain
synthetic. The public-data boundary in `docs/public-data-boundary.md` is
preserved: bridges accept the user pasting/uploading data; no live network
calls to private/internal sources.

## Requirements

### R-BRIDGE-001: CSV import (Open Contracting shape)

WHEN a visitor pastes or uploads a normalized CSV, THE SYSTEM SHALL parse
it into a scenario or scenario seed.

Acceptance:
- Lab Arena has an "Import CSV" control.
- CSV columns: supplier_id, buyer_id, product_id, period, quantity,
  unit_price, capacity (with documented optional columns).
- Parser validates rows; surfaces per-row errors with line numbers.
- Imported data populates a scenario seed; user can then edit parameters
  before running.
- A README example CSV is shipped in `data/example-imports/`.

### R-BRIDGE-002: source-graph visualization

WHEN a multi-party scenario is active, THE SYSTEM SHALL render a
source-graph view showing supplier-buyer-product edges as a directed
graph.

Acceptance:
- Source-graph mode toggle in Lab Arena.
- Graph renders with nodes (participants) and edges (product flows).
- Edge thickness encodes quantity; color encodes role.
- Clicking a node opens that participant's view (per R-PORTAL-002).
- Renders cleanly for N=2 through N=8 participants.

### R-BRIDGE-003: chip-supply-chain-map bridge (optional)

WHEN a visitor opts in to the chip-map bridge, THE SYSTEM SHALL fetch
the public chip-supply-chain-map `nodes.csv` and `edges.csv`, and offer
to seed a scenario from a subset of those entries.

Acceptance:
- Toggle in Lab Arena: "Seed from chip-supply-chain-map".
- On click, fetch from the public GitHub raw URL.
- User selects 2-5 nodes; system generates a scenario seed with those
  companies as participants.
- Seeded scenarios are tagged with their source (citation in the run
  report).
- If fetch fails, surface a clear error and fall back to manual entry.

### R-BRIDGE-004: supplier-risk-rag-agent bridge (optional)

WHEN a visitor opts in to the supplier-risk evidence bridge, THE SYSTEM
SHALL fetch the public supplier-risk-rag-agent corpus and offer to
attach cited risk evidence to a scenario.

Acceptance:
- Toggle in Lab Arena: "Attach risk evidence from supplier-risk-rag-agent".
- On click, fetch the public corpus JSONL from the GitHub raw URL.
- User selects 1-5 evidence chunks; system attaches them as
  `scenario.evidenceIds` with the corresponding `risk_score` derived
  from the chunk's tagged risk category.
- Attached evidence appears in the Lab Arena evidence panel.
- Citations appear in run reports.

### R-BRIDGE-005: public-data boundary enforcement

WHEN any bridge is used, THE SYSTEM SHALL clearly indicate which scenario
data is synthetic vs sourced from a public repo.

Acceptance:
- Every scenario in the Lab Arena shows a "source" badge: synthetic /
  chip-map / supplier-risk-rag / user-imported.
- The run report records data provenance per scenario field.
- `docs/public-data-boundary.md` is updated with the bridge rules.
- No live network calls to private/internal sources; all fetches go to
  public GitHub raw URLs.

### R-SPEC-008: spec discipline

Standard.

## Out of scope

- Live RAG (running the supplier-risk-rag-agent's full retrieval in the
  lab). Static corpus pull only.
- Real-time chip-map updates. One-time fetch on opt-in.
- Custom CSV schemas beyond Open Contracting + the supplier-buyer-product-
  period shape.
- Server-side caching. All fetches happen client-side.
- Authentication for private data sources. Public-only.
