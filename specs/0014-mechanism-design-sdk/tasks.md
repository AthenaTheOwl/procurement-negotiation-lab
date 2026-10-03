# tasks: mechanism-design SDK

## Implementation

- [x] **A1**: Add `src/procurement_mechanism_sdk` package over the existing
  deterministic Python engine. *(R-SDK-001)*
- [x] **A2**: Add scenario builder and sample scenario helpers.
  *(R-SDK-002)*
- [x] **A3**: Add allocation, mechanism comparison, and participation report
  helpers. *(R-SDK-002)*
- [x] **A4**: Add module demo command. *(R-SDK-003)*
- [x] **A5**: Include the package and command in `pyproject.toml`.
  *(R-SDK-001, R-SDK-003)*
- [x] **A6**: Add the deterministic mechanism-sensitivity grid and report
  command over the existing SDK. *(R-SDK-004)*
- [x] **A7**: Commit canonical JSONL and Markdown sensitivity artifacts.
  *(R-SDK-004)*

## Documentation and decisions

- [x] **B1**: Document the SDK in README and `docs/mechanism-sdk.md`.
  *(R-SDK-003)*
- [x] **B2**: Record the extraction boundary in DEC-SDK-001. *(R-SDK-001)*
- [x] **B3**: Record the narrow public API and app-less demo decisions.
  *(R-SDK-002, R-SDK-003)*

## Verification

- [x] **V1**: Add pytest coverage for scenario build, ADMM wrapper parity,
  comparison gaps, CBT participation reporting, and the module demo.
  *(R-SDK-001, R-SDK-002, R-SDK-003)*
- [x] **V2**: Run the full requested local gate sweep before commit.
  *(R-SDK-001, R-SDK-002, R-SDK-003)*
- [x] **V3**: Verify report determinism, recompute rollups from JSONL, exercise
  the qualification rule, and prove the unhappy path has no traceback.
  *(R-SDK-004)*
