# System Map

`procurement_lab.sensitivity.build_stress_grid()` defines eight public-input stress cells and converts each volatility input into the engine-consumed deterministic stressed demand (`base forecast + volatility`).

`procurement_lab.sensitivity.run_sensitivity()` builds each scenario through `procurement_mechanism_sdk.build_procurement_scenario`, runs each registry mechanism through `procurement_mechanism_sdk.compare_mechanisms`, records solver, transfer, and allocation-capacity feasibility, and writes JSONL plus Markdown reports.

`procurement_lab.sensitivity.ranked_qualifiers()` groups qualifying mechanisms by allocation-feasible cells, worst and mean oracle gap, then disclosure-limited cells; `recommendation()` returns a mechanism only when one group of size one leads.

`procurement_lab.sensitivity.main()` is the runnable CLI interface and contains the operational-error boundary.
