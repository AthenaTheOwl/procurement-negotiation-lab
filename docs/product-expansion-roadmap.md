# product expansion roadmap

This repo is now useful as a public learning lab. The next expansions should
make it more durable, more inspectable, and more extensible without turning it
into a fake production procurement system.

## What shipped in spec 0004

- Alpha clipping: bound the VCG-style transfer and show when that weakens
  no-worse-off guarantees.
- Reliability multipliers: discount stated capacity using behavioral priors.
- Epsilon frontier: inspect near-optimal plans instead of pretending one plan
  is always the whole answer.
- Decoy demand: run known-answer probes against authored strategies.

## Research-informed next specs

### Spec 0005: multi-party portal and scenario authoring

Add a vendor-portal-shaped flow with separate views for buyer, supplier, and
coordinator. Support 3+ suppliers, multiple product families, and a scenario
registry. Good references:

- NegMAS: multi-issue utilities and negotiation protocols.
- AgenticPay: environment registration, multi-product, multi-seller, and
  multi-buyer scenario organization.
- Magentic Marketplace: full economic lifecycle from search and matching to
  negotiation and transaction.

Acceptance shape:

- Canonical agent strategy library with buyer, supplier, packager, and
  coordinator roles.
- Scenario JSON schema with versioning and import/export.
- Separate per-party view that hides private information from the other party.
- Multi-party welfare and transfer ledger.

### Spec 0006: run reports, replay, and shareable evidence

Add a run-report artifact that exports a full trace: scenario parameters,
mechanism settings, authored formulas, algorithm comparison, frontier plans,
audit-mode results, and browser QA evidence.

Acceptance shape:

- One-click JSON and Markdown export.
- Replayable encoded URL or local file import.
- Run ledger stored in browser local storage.
- Screenshot-safe summary page for portfolio sharing.

### Spec 0007: production hardening from MedRoute patterns

Borrow the habits, not the domain, from `../cargo-health/medroute-main`:

- Test rings: unit/property, integration, contract/observability, browser.
- Schema-first scenario validation using zod or an equivalent TS schema layer.
- Test data factories instead of inline one-off fixtures.
- PR/spec check that maps every requirement to tests and UI proof.
- Event-style audit log for mechanism runs.

Acceptance shape:

- `web/src/model/scenarioSchema.ts` validates every imported scenario.
- `web/src/model/runReport.ts` emits a typed decision-event log.
- Playwright smoke test covers deployed Vercel, not just Vitest DOM tests.
- Spec checker includes all active specs and refuses missing traceability.

### Spec 0008: data bridge

Use public datasets only as optional imports. Start with synthetic examples
and then add a "source graph" mode that can ingest normalized supplier-buyer
edges. Good references:

- `snap-stanford/supply-chains` for synthetic and public-data boundary shape.
- Open Contracting field conventions for procurement records.
- The existing chip supply-chain map if a portfolio bridge is desired.

Acceptance shape:

- Import normalized supplier-buyer-product-period CSV.
- Convert imported graph into a lab scenario with visible assumptions.
- Keep deterministic fallback traces so the hosted demo never depends on live
  external data.

## Product principle

Every new control must create a visible causal delta. If a slider, toggle, or
agent edit does not immediately change a chart, ledger, or explanation, it
does not belong in the main lab surface.
