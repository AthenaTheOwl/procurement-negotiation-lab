# architecture

The app has two surfaces and five engines.

The **Learning** surface is fixed. It walks one procurement problem through
private utilities, global utility, commitment terms, coordination, transfers,
and information value.

The **Arena** surface is editable. Users change formulas, products, periods,
participant count, risk, and information-sharing mode.

The engines:

- scenario engine: validates YAML/JSON into typed scenario specs
- formula engine: evaluates user math through an AST whitelist
- coordination engine: runs ADMM-style coordination and comparison baselines
- information engine: changes what each agent knows before local solve
- transfer engine: splits surplus after the operational plan

The app evaluates optimized plans against the actual scenario, not just the
agents' perceived scenario. That is where information value becomes visible.
