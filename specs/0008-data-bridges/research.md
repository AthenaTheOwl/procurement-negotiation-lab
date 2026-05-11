# research: data bridges

## Open data standards

**Open Contracting Data Standard.** https://standard.open-contracting.org/

Shapes:
- Naming conventions: party, contract, award, period.
- Field semantics for procurement records.
- The CSV import column convention borrows where the OCDS shape fits.

## Public-data boundary

**`snap-stanford/supply-chains`.** https://github.com/snap-stanford/supply-chains

Shapes:
- The boundary pattern: synthetic datasets are released; real-world
  datasets are documented but not redistributed.
- The lab's bridges follow the same boundary: fetch only public GitHub
  raw URLs; never private data.

## Graph visualization

**cytoscape.js.** https://js.cytoscape.org/

Shapes:
- The library used in the existing chip-supply-chain-map repo. Reused
  here for visual + dependency consistency.

**react-flow.** https://reactflow.dev/ (alternative considered, not used)

## Cross-portfolio bridges

**chip-supply-chain-map.** This portfolio's chokepoint mapper at
https://github.com/AthenaTheOwl/chip-supply-chain-map

Shapes:
- The bridge consumes its public `nodes.csv` + `edges.csv`.
- Chokepoint score informs reliability priors in seeded scenarios.

**supplier-risk-rag-agent.** This portfolio's evaluated RAG agent at
https://github.com/AthenaTheOwl/supplier-risk-rag-agent

Shapes:
- The bridge consumes its public `chunks.jsonl` corpus.
- Risk-category tags map to scenario `risk_score`.
- Citations attach to scenarios for traceable evidence in run reports.

## Data provenance

**FAIR Principles.** https://www.go-fair.org/fair-principles/

Shapes:
- The principle that data should be Findable, Accessible, Interoperable,
  Reusable. The provenance tagging gives the lab's data clear F/A/I/R
  attributes.

**DataCite metadata schema.** https://schema.datacite.org/

Shapes:
- The framing that every dataset carries metadata about its source.
  The lab's per-scenario source badges are a lightweight version of
  this.

## Spec dependencies

- Spec 0005 — multi-party scenarios make source-graph meaningful;
  bridges seed multi-party scenarios.
- Spec 0006 — run reports include provenance.
- Spec 0007 — scenarioSchema enforces bridge outputs conform.

## Out of scope (future work)

- **Live retrieval** against the supplier-risk-rag-agent demo. Would
  require visitor-supplied API keys; out of scope.
- **Real-time chip-map updates.** Static fetch only.
- **Authentication for private data sources.** Public-only by design.
- **LLM-augmented bridge** (e.g., asking the user a question and having
  an agent fetch + seed). Future spec, not this one.
