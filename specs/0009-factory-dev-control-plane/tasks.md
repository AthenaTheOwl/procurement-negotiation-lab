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

## Pass H - factory replay command (DEC-FACTORY-009)

- [x] **H1**: Add `scripts/replay_run.py` with the documented CLI:
  loads the recorded Run + ledger, verifies HEAD matches the recorded
  sandbox SHA, re-runs the factory entry under `--dry-run` into a tmp
  scratch dir, and compares three replay-equivalence fields.
  *(R-FACTORY-RUN-EVIDENCE-011, R-FACTORY-RUN-EVIDENCE-012)*
- [x] **H2**: Emit a `run.evidence.replayed` event into a per-replay
  ledger at `ops/event-ledger/replay-<run-id>-<ISO-timestamp>.jsonl`
  with `replay_method == "equivalence"`.
  *(R-FACTORY-RUN-EVIDENCE-013)*
- [x] **H3**: Write a detailed comparison report at
  `ops/replay-records/<run-id>/<replay-event-id>.json` covering the
  three replay-equivalence fields. *(R-FACTORY-RUN-EVIDENCE-014)*
- [x] **H4**: Run the script against the committed sample
  `run-16a7bf515611` and commit the resulting replay ledger + report
  so the first replay artifact is part of the audit trail.
  *(R-FACTORY-RUN-EVIDENCE-011..014)*
- [x] **H5**: Add `tests/factory/test_replay_run.py` with one positive
  case plus four negatives (HEAD mismatch, missing Run record, missing
  ledger, synthetic divergence). *(R-FACTORY-RUN-EVIDENCE-011..014)*

## Pass I - portable repo:// URI migration (DEC-FACTORY-010)

- [x] **I1**: Add the URI helpers to `src/procurement_lab/run_evidence.py`
  (`build_repo_uri`, `build_artifact_uri`, `resolve_uri`,
  `extract_repo_uri_sha`, `is_repo_uri`, `SANDBOX_PENDING_PLACEHOLDER`)
  and switch `derive_sandbox_image_ref` to return a repo:// URI.
  *(R-FACTORY-RUN-EVIDENCE-015)*
- [x] **I2**: Wire the URI emission into `scripts/factory/pipeline.py`:
  `workspace_id` becomes the repo name, `inputs[].ref` becomes a
  repo:// URI, and `sandbox_image_ref` becomes the PENDING placeholder
  written before the regeneration commit lands.
  *(R-FACTORY-RUN-EVIDENCE-015, R-FACTORY-RUN-EVIDENCE-018)*
- [x] **I3**: Add `resolve_uri` to `scripts/validate_run_evidence.py`
  and `scripts/replay_run.py`; update `replay_run._extract_recorded_sha`
  to parse the URI's `<sha>` group with a legacy fallback and a
  PENDING-placeholder error path.
  *(R-FACTORY-RUN-EVIDENCE-016, R-FACTORY-RUN-EVIDENCE-017)*
- [x] **I4**: Add `scripts/finalize_sandbox_ref.py` to rewrite the
  PENDING placeholder to the sample-containing SHA; idempotent.
  *(R-FACTORY-RUN-EVIDENCE-018)*
- [x] **I5**: Regenerate the committed sample under the new emitter
  (sample id changes to `run-960d6b107160`) and finalize its
  sandbox_image_ref to the regeneration commit's SHA.
  *(R-FACTORY-RUN-EVIDENCE-015, R-FACTORY-RUN-EVIDENCE-018)*
- [x] **I6**: Add tests for the URI helpers (`resolve_uri`,
  `build_repo_uri`, `extract_repo_uri_sha`, `is_repo_uri`) in
  `tests/factory/test_run_evidence.py` and
  `tests/factory/test_validate_run_evidence.py`; update
  `tests/factory/test_pipeline.py` to assert the new emission
  contract; update `tests/factory/test_replay_run.py` to discover
  the committed sample by glob and handle both URI forms.
  *(R-FACTORY-RUN-EVIDENCE-015..018)*

## Pass J - CI enforcement of run-evidence chain (DEC-FACTORY-011)

- [x] **J1**: Add `.github/workflows/run-evidence-gates.yml` with
  `on: pull_request` and `on: push: branches: [main]` triggers,
  `runs-on: ubuntu-latest`, and Python 3.11 setup.
  *(R-FACTORY-RUN-EVIDENCE-019)*
- [x] **J2**: Wire the product-side gates locked by DEC-CDCP-015:
  sibling checkout of `AthenaTheOwl/trace-to-eval-harness`,
  `pip install -e ".[dev]"` against the sibling, packet generation
  from the canonical event ledger via
  `python -m trace_to_eval evidence from-cdcp-events ... --portfolio-root`,
  and packet validation via
  `python -m trace_to_eval evidence validate /tmp/packet.json`.
  *(R-FACTORY-RUN-EVIDENCE-020)*
- [x] **J3**: Wire replay smoke: save the HEAD-finalized Run record
  to a tmp path, extract the sandbox SHA via
  `jq -r .sandbox_image_ref ... | sed -E ...`, check the recorded
  SHA out (with `fetch-depth: 0` on the initial checkout), restore
  the finalized Run record into the worktree, and run
  `python scripts/replay_run.py --run-id run-960d6b107160`.
  *(R-FACTORY-RUN-EVIDENCE-021)*
- [x] **J4**: Confirm no contract gate carries
  `continue-on-error: true`, no `if: ${{ failure() }}` shape, no
  `paths:`/`paths-ignore:` trigger filter, and no `--no-verify`
  bypass anywhere in the workflow.
  *(R-FACTORY-RUN-EVIDENCE-022)*
- [x] **J5**: Register the new workflow in
  `scripts/spec_check.py::REQUIRED_WORKFLOW_PROOFS` so a missing or
  renamed workflow file fails spec-check.
  *(R-FACTORY-RUN-EVIDENCE-019..022)*

## Pass K - replay-determinism test fixture (DEC-FACTORY-012)

- [x] **K1**: Add `tests/factory/test_replay_determinism.py` that
  replays the canonical sample `run-960d6b107160` `RERUNS` times
  (default 3, override via `RERUNS` env var) at the recorded
  sandbox SHA, canonicalizes the three replay-equivalence fields
  per replay report, SHA-256 hashes the canonical bytes, and
  asserts every hash matches. Teardown restores the original HEAD
  and removes any replay artifacts the test created.
  *(R-FACTORY-RUN-EVIDENCE-023)*
- [x] **K2**: Add a dedicated `replay-determinism` job to
  `.github/workflows/run-evidence-gates.yml` that checks out with
  `fetch-depth: 0`, syncs the project under `uv`, runs the fixture
  with `RERUNS=3`, and uploads `artifacts/failbundles/` as a
  workflow artifact when the step fails. The job carries no
  `continue-on-error: true`.
  *(R-FACTORY-RUN-EVIDENCE-024)*
- [x] **K3**: Write a failure bundle at
  `artifacts/failbundles/determinism_failure.json` (plus
  `trace_0.json` and `trace_1.json`) when the canonical hashes
  diverge, fail the pytest assertion with the bundle path in the
  message, and gitignore `artifacts/failbundles/` so the bundle
  never ships as committed evidence.
  *(R-FACTORY-RUN-EVIDENCE-025)*
- [x] **K4**: Register the determinism job proof tokens
  (`replay-determinism`, `tests/factory/test_replay_determinism.py`,
  `RERUNS`) in
  `scripts/spec_check.py::REQUIRED_WORKFLOW_PROOFS` for
  `.github/workflows/run-evidence-gates.yml` so a missing or
  renamed job fails spec-check.
  *(R-FACTORY-RUN-EVIDENCE-023..025)*

## Pass L - addendum-6 emission slice + replay timestamp fix (DEC-FACTORY-013)

- [x] **L1**: Extend `WorkerResult.metadata` in
  `scripts/factory/workers.py` so every worker invocation (real or
  stub) carries the six addendum-6 contract keys (`thread_id`,
  `run_id`, `model`, `duration_ms`, `tokens_input`,
  `tokens_output`). The dataclass signature stays
  `metadata: dict[str, Any]`; the contract is which keys MUST be
  populated. Synthesize missing IDs as `<label>-cli-<uuid12>` and
  `<label>-run-<uuid12>` in `_run_cli` and the missing-CLI branches
  of `ClaudeCodeWorker.run` / `CodexWorker.run`. Add typed
  accessors for `model`, `duration_ms`, `tokens_input`,
  `tokens_output` that return `None` for missing keys.
  *(R-FACTORY-RUN-EVIDENCE-026)*
- [x] **L2**: Update `ClaudeCodeWorker.run` and `CodexWorker.run`
  to try `--output-format json` first and fall back to plain
  `--print` / `exec` when the installed CLI rejects the flag
  (detected via `_looks_like_unsupported_flag` matching common
  stderr phrasings against the literal `--output-format`). Extend
  `_extract_json_ids` to parse Anthropic and OpenAI usage-block
  flavours under top-level `usage` plus nested `response.usage` /
  `message.usage` paths. `StubWorker` pins `tokens_input` and
  `tokens_output` to 0 so dry-run metadata carries concrete ints.
  *(R-FACTORY-RUN-EVIDENCE-027)*
- [x] **L3**: Switch
  `scripts/replay_run.py::_now_iso_filename` to microsecond
  resolution
  (`f"{now:%Y-%m-%dT%H-%M-%S}.{now.microsecond:06d}Z"`) built from
  a single `datetime.now(UTC)` call so two back-to-back replays
  inside the same wall-clock second never collide on the ledger
  filename. Existing glob patterns in
  `tests/factory/test_replay_run.py` and
  `tests/factory/test_replay_determinism.py` use
  `replay-{run_id}-*.jsonl` so the format change is transparent.
  *(R-FACTORY-RUN-EVIDENCE-028)*
- [x] **L4**: Cover the contract with new tests:
  `test_stub_worker_metadata_carries_addendum6_keys`,
  `test_stub_worker_seeded_ids_are_deterministic`,
  `test_worker_result_accessors_handle_missing_metadata`,
  `test_claude_worker_missing_cli_still_populates_thread_id`,
  `test_codex_worker_missing_cli_still_populates_thread_id`,
  `test_extract_json_ids_captures_anthropic_usage_block`,
  `test_extract_json_ids_captures_openai_usage_block`,
  `test_extract_json_ids_captures_nested_response_usage`,
  `test_looks_like_unsupported_flag_recognizes_common_phrasings`,
  `test_now_iso_filename_is_microsecond_resolution`.
  *(R-FACTORY-RUN-EVIDENCE-026..028)*

## Pass M - chaos test suite (DEC-FACTORY-014)

- [x] **M1**: Add `tests/factory/test_chaos_run_evidence.py`. The
  suite defines `test_canonical_sample_validates_clean` as a
  positive guard plus seven mutation tests (M1..M7) that copy the
  canonical sample `run-960d6b107160` into `tmp_path`, apply one
  targeted mutation each, point the validator's
  `EVENT_LEDGER_DIR` and `RUN_RECORDS_DIR` constants at the temp
  dir via `monkeypatch.setattr`, and assert
  `validate_run_evidence.main()` exits non-zero with stderr
  naming the specific check. The committed canonical sample on
  disk is never written.
  *(R-FACTORY-RUN-EVIDENCE-029, R-FACTORY-RUN-EVIDENCE-030)*
- [x] **M2**: Cover the seven mutation classes one per test:
  M1 `Run.prompt_snapshot_hash` mutated to a different valid
  hash (cross-check #1); M2 `Run.tool_schemas_snapshot_hash`
  mutated (cross-check #2); M3 phantom gate name in
  `Run.gate_results_summary.gates_passed` (cross-check #4);
  M4 terminal `gate.run.evidence_recorded` event removed from
  the ledger (required-event check); M5 `pipeline.start` event
  payload drops `prompt_snapshot_hash` (Round 2's oneOf
  discriminator); M6 `gate.run.evidence_recorded.payload
  .fields_populated` claims an unpopulated field (cross-check
  #3); M7 done Run drops `sandbox_image_ref` (required-for-done
  check).
  *(R-FACTORY-RUN-EVIDENCE-029, R-FACTORY-RUN-EVIDENCE-030)*
- [x] **M3**: Add a `chaos-validation` job to
  `.github/workflows/run-evidence-gates.yml` that checks out the
  repo, syncs the project under `uv`, installs the chaos test
  deps, and runs
  `uv run pytest tests/factory/test_chaos_run_evidence.py -v
  --no-cov`. The job carries no `continue-on-error: true` and
  no `if: ${{ failure() }}` informational shape.
  *(R-FACTORY-RUN-EVIDENCE-031)*
- [x] **M4**: Register the chaos job proof tokens
  (`chaos-validation`,
  `tests/factory/test_chaos_run_evidence.py`) in
  `scripts/spec_check.py::REQUIRED_WORKFLOW_PROOFS` for
  `.github/workflows/run-evidence-gates.yml` so a renamed or
  deleted job fails spec-check.
  *(R-FACTORY-RUN-EVIDENCE-029..031)*

## Pass N - systems-thinking adoption (DEC-FACTORY-015)

- [x] **N1**: Refresh `ops/schemas-cache/decision.schema.json`,
  `ops/schemas-cache/dream-output.schema.json`, and
  `ops/schemas-cache/run.schema.json` from
  `athena-site/ops/schemas/` so the four optional fields from
  DEC-CDCP-020 land in the local cache.
  `python scripts/check_schema_cache_freshness.py` exits 0.
  *(R-FACTORY-RUN-EVIDENCE-032)*
- [x] **N2**: Add the "Systems-thinking discipline (per
  DEC-CDCP-020)" section to `AGENTS.md` naming the four fields
  (`systems_map`, `transferable_principle`, `falsification_test`,
  `adoption_ladder`) plus the 30-day warning-to-failure ratchet.
  *(R-FACTORY-RUN-EVIDENCE-033)*
- [x] **N3**: Extend `scripts/validate_decisions.py` to emit a
  non-fatal warning when an approved DEC is missing any of the
  four fields. The warning prefix `validate_decisions:
  systems-thinking discipline warnings (non-fatal; see
  DEC-CDCP-020)` goes to stderr followed by per-DEC lines that name
  the missing field(s); exit code stays 0 when only warnings are
  present.
  *(R-FACTORY-RUN-EVIDENCE-034)*
- [x] **N4**: Retrofit DEC-FACTORY-012, DEC-FACTORY-013, and
  DEC-FACTORY-014 with substantive content in all four fields.
  `validate_decisions.py` emits no warning for the three
  retrofitted DECs.
  *(R-FACTORY-RUN-EVIDENCE-035)*
- [x] **N5**: Land `DEC-FACTORY-015-systems-thinking-discipline-
  adoption.md` amending `DEC-FACTORY-014`; populate the four
  fields on the DEC itself so the discipline is self-applying.
  *(R-FACTORY-RUN-EVIDENCE-032..035)*

## Spec discipline

- [x] **S1**: Register the spec in `specs/README.md`. *(R-SPEC-009)*
- [x] **S2**: Add this spec to `scripts/spec_check.py`. *(R-SPEC-009)*
- [x] **S3**: Update traceability and run ledger. *(R-SPEC-009)*
