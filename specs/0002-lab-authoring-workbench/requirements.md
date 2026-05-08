# requirements: lab authoring workbench

## Scope

Turn LAB from a result dashboard into the core mechanism-design workbench.
Visitors should understand the "so what": private agents can make locally
rational plans that leave joint value on the table, and different coordination
mechanisms recover different amounts of that value at different privacy and
incentive costs.

## Requirements

### R-LAB-005: visible so-what

WHEN a visitor opens LAB, THE SYSTEM SHALL show the coordination gap before any
controls.

Acceptance:

- LAB names the value left on the table by local/JIT planning.
- LAB names the best non-oracle mechanism for the current setup.
- LAB states the value of additional information.

### R-LAB-006: scenario authoring

WHEN a visitor wants to create a problem, THE SYSTEM SHALL provide canonical
presets and editable structural knobs.

Acceptance:

- At least three scenario presets exist.
- Each preset has a one-line setup and a "so what".
- Users can edit demand volatility, capacity tightness, lead time, fulfillment
  center count, participants, products, and periods.

### R-LAB-007: canonical agents and strategy archetypes

WHEN a visitor builds agents, THE SYSTEM SHALL provide canonical buyer/supplier
strategy archetypes before custom tuning.

Acceptance:

- Canonical agents include JIT buyer, launch-protection buyer, truthful CPP
  responder, capacity-guard supplier, relationship supplier, and hard bargainer.
- Each agent exposes objective, private information, and strategy.
- Users can tune urgency, supplier flexibility, truthfulness, privacy
  preference, and risk aversion.

### R-LAB-008: mechanism comparison

WHEN a visitor compares mechanisms, THE SYSTEM SHALL compare local planning,
oracle planning, CPP/ADMM, CPP+VCG/CBT, menu-of-contracts, and simpler
baselines.

Acceptance:

- Results include global utility, oracle gap, residual, privacy exposure,
  incentive story, feasibility/quality, iterations, and runtime.
- The app does not crown ADMM by default.
- VCG/CBT and menu-of-contracts are represented as mechanism-design options,
  not only optimization algorithms.

### R-LAB-009: information/privacy tradeoff

WHEN a visitor changes information mode, THE SYSTEM SHALL show both welfare
change and privacy exposure.

Acceptance:

- Information modes include private, risk-only, capacity-band, cost-band,
  forecast-band, and full-oracle.
- The app shows welfare and privacy on the same problem instance.
- The app avoids implying that full disclosure is always the practical answer.

### R-SPEC-002: source-grounded authoring loop

WHEN new lab concepts are added, THE SYSTEM SHALL record the source/design
rationale and map requirements to implementation/tests.

Acceptance:

- `research.md` records external references and what was borrowed.
- `traceability.md` maps R-LAB-005 through R-LAB-009 to files/tests.
- `scripts/spec_check.py` validates this spec.

## Non-goals

- No live supply-chain dataset ingestion in this slice.
- No arbitrary browser-side formula parser in this slice.
- No claim that the synthetic mechanisms are production-grade implementations.
- No official branding or internal data.
