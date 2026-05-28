# tasks: factory dev control plane

## Pass A - MCP surface

- [x] **A1**: Add `scripts/factory/mcp_server.py`. *(R-FACTORY-001)*
- [x] **A2**: Expose status, show, expand-spec, and dry-run route tools.
  *(R-FACTORY-001)*
- [x] **A3**: Add MCP server tests. *(R-FACTORY-001)*

## Pass B - spec task expansion

- [x] **B1**: Add `scripts/factory/spec_tasks.py`. *(R-FACTORY-002)*
- [x] **B2**: Wire `--expand-spec` into the CLI. *(R-FACTORY-002)*
- [x] **B3**: Add expansion tests. *(R-FACTORY-002)*

## Pass C - dual review and metadata

- [x] **C1**: Add `review.reviewers` task YAML support. *(R-FACTORY-003)*
- [x] **C2**: Run bounded multi-review in the pipeline. *(R-FACTORY-003)*
- [x] **C3**: Add JSON/JSONL CLI metadata parsing. *(R-FACTORY-004)*
- [x] **C4**: Add tests for dual review and metadata parsing. *(R-FACTORY-003, R-FACTORY-004)*

## Pass D - routing

- [x] **D1**: Add `scripts/factory/router.py`. *(R-FACTORY-005)*
- [x] **D2**: Wire `--run-many` into the CLI. *(R-FACTORY-005)*
- [x] **D3**: Add optional `factory` dependencies for LangGraph and MCP SDK.
  *(R-FACTORY-005)*
- [x] **D4**: Add fallback routing tests. *(R-FACTORY-005)*

## Pass E - factory console

- [x] **E1**: Add a web Factory console route reachable from home.
  *(R-FACTORY-006)*
- [x] **E2**: Add static replay fixture data for task state, artifacts,
  checkpoint interrupts, and SDK run-report summary. *(R-FACTORY-006)*
- [x] **E3**: Add normalization tests for factory console data.
  *(R-FACTORY-006)*
- [x] **E4**: Add UI rendering tests for the console. *(R-FACTORY-006)*

## Pass F - run-evidence emission

- [x] **F1**: Add `src/procurement_lab/run_evidence.py` emitter with
  canonicalization, hashing, and Event/Run writers.
  *(R-FACTORY-RUN-EVIDENCE-001, R-FACTORY-RUN-EVIDENCE-002,
  R-FACTORY-RUN-EVIDENCE-003)*
- [x] **F2**: Wire `_RunEvidence` into `scripts/factory/pipeline.py` so
  every state-machine boundary emits a conformant Event record and
  every terminal state writes a Run record.
  *(R-FACTORY-RUN-EVIDENCE-001, R-FACTORY-RUN-EVIDENCE-002,
  R-FACTORY-RUN-EVIDENCE-004, R-FACTORY-RUN-EVIDENCE-005)*
- [x] **F3**: Add `scripts/validate_run_evidence.py` validator gate and
  wire it into `.github/workflows/tests.yml` and
  `scripts/spec_check.py`. *(R-FACTORY-RUN-EVIDENCE-006)*
- [x] **F4**: Cache `event.schema.json` under `ops/schemas-cache/`
  alongside the amended `run.schema.json`.
  *(R-FACTORY-RUN-EVIDENCE-001, R-FACTORY-RUN-EVIDENCE-002)*
- [x] **F5**: Add unit tests for the emitter helpers (hashing
  stability, schema rejection, gate aggregation) plus an integration
  test that exercises the pipeline and asserts on the produced
  ledger and Run record. *(R-FACTORY-RUN-EVIDENCE-001..005)*

## Pass G - run-evidence cross-checks (DEC-FACTORY-008)

- [x] **G1**: Fix the emitter so `tool.call.started` /
  `tool.call.completed` carry `tool_name` (the worker name) and
  `pipeline.done` carries `status` plus a `gate_results_summary`
  cloned from the run aggregate.
  *(R-FACTORY-RUN-EVIDENCE-001, R-FACTORY-RUN-EVIDENCE-010)*
- [x] **G2**: Extend `scripts/validate_run_evidence.py` with the
  required-for-done field check plus the four cross-checks
  (pipeline.start hash matches, fields_populated set equality,
  gate_results_summary scan).
  *(R-FACTORY-RUN-EVIDENCE-007, R-FACTORY-RUN-EVIDENCE-008,
  R-FACTORY-RUN-EVIDENCE-009, R-FACTORY-RUN-EVIDENCE-010)*
- [x] **G3**: Regenerate the sample Run record + ledger so the
  validator exits 0 against the committed evidence.
  *(R-FACTORY-RUN-EVIDENCE-007..010)*
- [x] **G4**: Add negative tests in
  `tests/factory/test_validate_run_evidence.py` for each of the
  required-for-done fields plus each of the four cross-checks, and
  a positive test against a well-formed baseline.
  *(R-FACTORY-RUN-EVIDENCE-007..010)*

## Spec discipline

- [x] **S1**: Register the spec in `specs/README.md`. *(R-SPEC-009)*
- [x] **S2**: Add this spec to `scripts/spec_check.py`. *(R-SPEC-009)*
- [x] **S3**: Update traceability and run ledger. *(R-SPEC-009)*
