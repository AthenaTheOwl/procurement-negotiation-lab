# requirements: mechanism-design SDK

## Scope

Spec 0014 extracts a lightweight Python SDK over the deterministic
procurement engine. The goal is library reuse without moving deployed app code.

## Requirements

### R-SDK-001: SDK package wraps the deterministic engine

WHEN a developer needs mechanism-design primitives outside the web app, THE
SYSTEM SHALL expose a Python package named `procurement_mechanism_sdk` that
wraps the existing deterministic engine.

Acceptance:
- The package lives under `src/procurement_mechanism_sdk`.
- It imports existing `procurement_lab` schemas, ADMM, oracle, baseline
  mechanisms, and CBT logic instead of copying or moving them.
- The packaged wheel includes both `procurement_lab` and
  `procurement_mechanism_sdk`.

### R-SDK-002: public API covers scenarios, comparison, and participation

WHEN a developer imports the SDK, THE SYSTEM SHALL provide stable operations
for building a scenario, solving or comparing mechanisms, and reporting
no-worse-off participation or oracle-gap metrics.

Acceptance:
- The public API includes `sample_scenario()` and
  `build_procurement_scenario()`.
- The public API includes `solve_allocation()` and `compare_mechanisms()`.
- The public API includes `compute_participation_report()`.

### R-SDK-003: SDK demo and tests run without the app

WHEN a developer wants to verify the SDK in isolation, THE SYSTEM SHALL provide
a CLI-style demo and tests that do not start the web or Streamlit app.

Acceptance:
- `python -m procurement_mechanism_sdk.demo` prints a deterministic JSON demo.
- Pytest covers the SDK API and demo command.
- README or docs show an import example and the extraction boundary.
