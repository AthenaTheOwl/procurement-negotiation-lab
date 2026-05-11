# requirements: multi-party portal and scenario authoring

## Scope

Spec 0004 added the operational refinements that make CPP+VCG deployable on
a two-party scenario. Spec 0005 generalizes the lab to support 3+ participants,
distinct per-party views that hide private information, a canonical agent
strategy library, and a versioned scenario schema with import/export.

This is the largest single expansion of the lab so far. It changes the data
model (multi-party from two-party), the UI model (per-party views instead of
a single observer's view), and the storage model (scenarios become first-class
artifacts with schemas).

References (design-only, not runtime dependencies):

- **NegMAS**: multi-issue utilities and negotiation protocols.
- **AgenticPay**: environment registration; multi-product, multi-seller, and
  multi-buyer scenario organization.
- **Magentic Marketplace**: full economic lifecycle from search and matching
  to negotiation and transaction.

## Requirements

### R-PORTAL-001: N-party participant model

WHEN a scenario is authored, THE SYSTEM SHALL support 1 buyer + 2 to 5
suppliers, plus optional packager/logistics/distributor roles.

Acceptance:
- Scenario JSON accepts `participants: Participant[]` with `length` between 3 and 8.
- Existing two-party scenarios (length 2) remain valid for backward compatibility.
- Algorithms iterate over the full participant list, not a hardcoded buyer/supplier pair.
- Multi-party welfare = sum of all participants' utilities.

### R-PORTAL-002: per-party view (buyer / supplier / coordinator)

WHEN a visitor enters a multi-party scenario, THE SYSTEM SHALL provide three
distinct views: buyer view (sees own data + coordinator signals), supplier
view (one per supplier; sees own data + coordinator signals), coordinator
view (sees the orchestration without participant cost structures).

Acceptance:
- View picker on the Lab Arena selects between buyer / supplier-N / coordinator.
- Each view renders only the data that view's role would have in a real flow.
- Visitor can toggle between views without losing scenario state.
- Coordinator view shows the iteration trace; participant views show only their
  own messages and the planner's price signals.

### R-PORTAL-003: privacy enforcement across views

WHEN a visitor switches to a participant view, THE SYSTEM SHALL NOT render
that participant's competitors' cost structures, capacities, or utility
formulas in the UI.

Acceptance:
- Type guard in `simulation.ts` (or a new `views.ts`) explicitly redacts
  competitor fields per view.
- UI tests assert that no DOM element in buyer view contains the supplier's
  `production_cost`, `holding_cost`, etc.
- The redaction is *visible* — the UI shows "supplier private" placeholders
  where information would be in coordinator view.

### R-PORTAL-004: canonical agent strategy library

WHEN a visitor authors a scenario, THE SYSTEM SHALL offer a strategy
library with at least 8 canonical archetypes covering 4 roles.

Acceptance:
- `web/src/data/strategies.ts` exports at least 8 named strategies.
- Roles covered: buyer (≥ 2), supplier (≥ 3), packager (≥ 1), coordinator (≥ 1),
  custom (≥ 1).
- Each strategy has: name, role, default utility formula, default parameters,
  short description, references to spec sections it teaches.
- Lab Arena participant-add flow can instantiate a participant from any
  library strategy in one click.

### R-PORTAL-005: scenario JSON schema with versioning

WHEN a scenario is exported or imported, THE SYSTEM SHALL validate it
against a versioned JSON schema and refuse malformed scenarios with a
clear error.

Acceptance:
- `web/src/model/scenarioSchema.ts` (zod) defines the canonical shape.
- Schema includes `schemaVersion: "0.5.0"` field; future migrations are possible.
- Import path: paste JSON in textarea → validate → load. Errors surface
  specific field paths.
- Export path: serialize current scenario → copy to clipboard as valid JSON.
- Round-trip is lossless: export → re-import yields identical scenario.

### R-PORTAL-006: multi-party welfare and transfer ledger

WHEN a multi-party scenario runs, THE SYSTEM SHALL compute global welfare
as the sum of all participants' utilities and SHALL split CBT transfers
across all participants per the configured split rule.

Acceptance:
- `transferLedger` accepts participant list of any length.
- Split rules supported: proportional (per outside-option deficit), equal,
  shapley (computed iteratively for ≤ 5 participants).
- Multi-party no-worse-off check is per-participant.
- Lab Arena renders one transfer row per participant.

### R-SPEC-005: spec discipline

WHEN this spec is implemented, THE SYSTEM SHALL maintain the same
traceability discipline as specs 0001-0004.

Acceptance:
- Every R-PORTAL-* requirement maps to tasks and acceptance checks.
- `traceability.md` kept current.
- `research.md` cites the references named above.
- `ops/run-ledger.md` gets entries per pass.

## Out of scope

- Spec 0006 (run reports / replay) — separate spec.
- Live RAG bridge to supplier-risk-rag-agent. Spec 0008.
- chip-supply-chain-map graph bridge. Spec 0008.
- LLM-generated agent strategies. The library is hand-authored.
- Real-time multi-user editing of the same scenario. Single-session only.
- Negotiation between human players (the lab is single-player; the other
  parties are simulated by the engine).
