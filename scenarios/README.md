# scenarios/

Canonical scenarios for the procurement-negotiation-lab, ready to load via
`procurement_mechanism_sdk.scenario_loader.load_scenario(...)`.

Each `*.yaml` file conforms to the `Scenario` Pydantic schema (see
`src/procurement_lab/engine/schemas.py`). Schema-validation tests in
`tests/test_scenarios.py` ensure every file in this directory parses
cleanly and produces a runnable `Scenario`.

## Current scenarios

| File | n_periods | Risk | Description |
|---|---|---|---|
| `01-substrate-baseline.yaml` | 1 | 0.0 | Vanilla buyer + supplier; no risk; reference baseline |
| `02-customer-concentration-risk.yaml` | 1 | 0.7 | Same shape, elevated risk_score, cited evidence ids |
| `03-three-bidder-supply.yaml` | 1 | 0.2 | One buyer, three suppliers competing for the same contract |
| `04-multi-period-commitment.yaml` | 4 | 0.3 | Four-quarter horizon — exercises n_periods > 1 paths |
| `05-packaging-bottleneck.yaml` | 1 | 0.5 | Capacity-constrained supplier; buyer carries firm-commit penalty |

## Adding a scenario

1. Author a new YAML file in this directory. Use one of the existing files
   as a template; `Scenario` model docs live in `src/procurement_lab/engine/schemas.py`.
2. Pick a unique `id`. The schema-validation test in `tests/test_scenarios.py`
   rejects duplicate ids across files.
3. Run `python -m pytest tests/test_scenarios.py -v` to confirm the file
   loads cleanly. The test eagerly enumerates this directory — no test
   wiring needed.

## Conventions

- All quantities, costs, capacities, and lead times are **synthetic** —
  no real procurement data.
- Supplier names: Cinder, Horizon, Vela, Meridian, Northstar — a stable
  cast across scenarios so cross-scenario comparisons read naturally.
- Real public companies (NVDA, TSM, ASML, etc.) appear ONLY in
  `evidence_ids` (as references to public 10-K excerpts), never as a
  negotiating "buyer" or "supplier".
- Utility formulas are restricted to the safe-AST grammar enforced by
  `procurement_lab.engine.formula` — see that module's tests for the
  current allowed surface.
