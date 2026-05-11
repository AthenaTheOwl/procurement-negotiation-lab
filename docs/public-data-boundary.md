# public data boundary

This repo must stay clean.

Do not add:

- real purchase orders
- internal supplier IDs
- real vendor negotiation terms
- internal Amazon terms, roadmaps, screenshots, or anecdotes
- private FloPro docs
- production recommendations

Allowed:

- public links to `https://github.com/amzn/FloPro`
- deterministic synthetic data
- public-style evidence cards clearly marked synthetic
- generic procurement concepts

README wording must keep the same boundary: independent for-fun learning lab,
not an official Amazon example.

## Bridge rules (spec 0008)

Two bridges fetch data into the lab. Both follow the same boundary.

### Allowed bridge fetches

- `raw.githubusercontent.com/AthenaTheOwl/chip-supply-chain-map/main/src/data/nodes.csv`
- `raw.githubusercontent.com/AthenaTheOwl/chip-supply-chain-map/main/src/data/edges.csv`
- `raw.githubusercontent.com/AthenaTheOwl/supplier-risk-rag-agent/main/data/sample_corpus/chunks.jsonl`

These are all **public, version-controlled** files in sibling repos under the
same GitHub user. Each is part of an MIT- or Apache-licensed open-source
repo. Fetches are read-only, in-browser, cached in `sessionStorage`.

### Disallowed bridge fetches

- Any host other than `raw.githubusercontent.com`.
- Any path under a private repo (the lab cannot authenticate; the URL would
  404 anyway, but we document the rule for clarity).
- Any live API that requires a key (EDGAR is rate-limited and the lab does
  not hit it directly — the supplier-risk-rag-agent repo does its own
  ingestion).
- Any URL submitted by the visitor at runtime (no arbitrary fetch). Only
  the URLs above are reachable from the lab.

### CSV import (R-BRIDGE-001)

The CSV import path (`web/src/model/bridges/csvImport.ts`) accepts a
**pasted-in or in-session** procurement CSV in the Open-Contracting-style
column convention. Behavior:

- Validation is in-browser. No upload to a server.
- Rows are normalized to a `ScenarioSeed` (buyers, suppliers, products,
  periods, derived participants).
- No CSV row is ever persisted beyond the session.
- The example file at [`data/example-imports/open-contracting-sample.csv`](../data/example-imports/open-contracting-sample.csv)
  ships in the repo as a starting point; visitors paste their own data
  for everything else.

### Provenance tagging (R-BRIDGE-005)

Every scenario carries a `provenance` field with one of:

- `synthetic` — the default; lab presets and hand-authored scenarios.
- `chip-map` — seeded from the chip-supply-chain-map bridge.
- `supplier-risk-rag` — risk evidence attached from the supplier-risk
  corpus bridge.
- `user-imported` — pasted JSON via the scenario import panel.
- `csv-imported` — pasted CSV via the CSV import panel.

The Lab Arena renders a `ProvenanceBadge` on the scenario card. Run
reports persist provenance + citations so a shared report can be traced
back to its source. No provenance entry contains a URL outside the
allowlist above.

### What stays out of bridges

- LLM-augmented bridges (e.g. "ask an agent to fetch + seed"). Future
  spec; not this one.
- Live retrieval against `supplier-risk-rag-agent`'s running Streamlit
  demo. Would require visitor-supplied API keys; out of scope.
- Real-time chip-map updates. Static fetch only; sessionStorage cache
  invalidates on tab close.
