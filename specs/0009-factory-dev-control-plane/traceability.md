# traceability: factory dev control plane

| Requirement | Tasks | Acceptance checks | Decision | Status |
|---|---|---|---|---|
| **R-FACTORY-001** MCP-compatible factory surface (owner_role: engineering.implementation) | A1, A2, A3 | initialize, tools/list, status, spec expansion, no shell tool | [DEC-FACTORY-001](../../decisions/DEC-FACTORY-001-narrow-mcp-stdio-no-shell-tool.md) | done |
| **R-FACTORY-002** spec-to-task expansion (owner_role: engineering.implementation) | B1, B2, B3 | `--expand-spec`, generated YAML loads, gates/review/checkpoints present | [DEC-FACTORY-002](../../decisions/DEC-FACTORY-002-spec-tasks-expanded-into-review-gated-yaml.md) | done |
| **R-FACTORY-003** bounded dual review (owner_role: engineering.code-reviewer) | C1, C2, C4 | `review.reviewers`, one review event per reviewer, conservative aggregation | [DEC-FACTORY-003](../../decisions/DEC-FACTORY-003-bounded-dual-review-conservative-aggregation.md) | done |
| **R-FACTORY-004** real CLI metadata parsing (owner_role: engineering.implementation) | C3, C4 | JSON and JSONL metadata parser tests | [DEC-FACTORY-004](../../decisions/DEC-FACTORY-004-real-cli-ids-win-tagged-synthetic-fallback.md) | done |
| **R-FACTORY-005** parallel task routing (owner_role: control.coordinator) | D1, D2, D3, D4 | `--run-many`, fallback routing, optional factory extra | [DEC-FACTORY-005](../../decisions/DEC-FACTORY-005-optional-langgraph-router-threadpool-fallback.md) | done |
| **R-FACTORY-006** static factory console (owner_role: control.coordinator) | E1, E2, E3, E4 | `#/factory`, static replay fixture, SDK `RunReport`, normalization + UI tests | [DEC-FACTORY-006](../../decisions/DEC-FACTORY-006-static-replay-console-evidence.md) | done |
| **R-FACTORY-RUN-EVIDENCE-001** Event ledger per run (owner_role: control.coordinator) | F1, F2, F4 | `src/procurement_lab/run_evidence.py::emit_event`, `scripts/factory/pipeline.py::_RunEvidence.emit`, ledger conforms to `event.schema.json` | [DEC-FACTORY-007](../../decisions/DEC-FACTORY-007-factory-emits-conformant-run-evidence.md) | done |
| **R-FACTORY-RUN-EVIDENCE-002** Run record per completed run (owner_role: control.coordinator) | F1, F2, F4 | `src/procurement_lab/run_evidence.py::emit_run`, `scripts/factory/pipeline.py::_persist_run_evidence`, record conforms to `run.schema.json` | [DEC-FACTORY-007](../../decisions/DEC-FACTORY-007-factory-emits-conformant-run-evidence.md) | done |
| **R-FACTORY-RUN-EVIDENCE-003** always-populated hashes (owner_role: control.coordinator) | F1, F5 | `canonicalize_prompt`, `canonicalize_tool_surface`, `compute_sha256` stability tests | [DEC-FACTORY-007](../../decisions/DEC-FACTORY-007-factory-emits-conformant-run-evidence.md) | done |
| **R-FACTORY-RUN-EVIDENCE-004** worktree-pinned sandbox ref (owner_role: control.coordinator) | F2, F5 | `derive_sandbox_image_ref`, `sandbox_image_ref` set when worktree exists | [DEC-FACTORY-007](../../decisions/DEC-FACTORY-007-factory-emits-conformant-run-evidence.md) | done |
| **R-FACTORY-RUN-EVIDENCE-005** aggregated gate results (owner_role: control.coordinator) | F2, F5 | `aggregate_gate_results`, `gate_results_summary` reflects ledger gate events | [DEC-FACTORY-007](../../decisions/DEC-FACTORY-007-factory-emits-conformant-run-evidence.md) | done |
| **R-FACTORY-RUN-EVIDENCE-006** validator gate on every push (owner_role: control.coordinator) | F3 | `scripts/validate_run_evidence.py`, wired into `.github/workflows/tests.yml` and `spec_check.py` | [DEC-FACTORY-007](../../decisions/DEC-FACTORY-007-factory-emits-conformant-run-evidence.md) | done |
| **R-FACTORY-RUN-EVIDENCE-007** required-for-done Run fields (owner_role: control.coordinator) | G2, G3, G4 | `cross_check_done_runs` REQUIRED_DONE_FIELDS branch, negative tests | [DEC-FACTORY-008](../../decisions/DEC-FACTORY-008-factory-run-evidence-cross-checks.md) | done |
| **R-FACTORY-RUN-EVIDENCE-008** terminal evidence event for done Runs (owner_role: control.coordinator) | G2, G3, G4 | `cross_check_done_runs` terminal-event branch, `test_validator_rejects_done_run_missing_terminal_event` | [DEC-FACTORY-008](../../decisions/DEC-FACTORY-008-factory-run-evidence-cross-checks.md) | done |
| **R-FACTORY-RUN-EVIDENCE-009** pipeline.start hash + populated-fields cross-checks (owner_role: control.coordinator) | G1, G2, G3, G4 | `cross_check_done_runs` hash + fields_populated branches, `test_validator_rejects_prompt_hash_mismatch`, `test_validator_rejects_tool_schemas_hash_mismatch`, `test_validator_rejects_fields_populated_mismatch` | [DEC-FACTORY-008](../../decisions/DEC-FACTORY-008-factory-run-evidence-cross-checks.md) | done |
| **R-FACTORY-RUN-EVIDENCE-010** gate-results-summary scan cross-check (owner_role: control.coordinator) | G1, G2, G3, G4 | `_aggregate_gate_results_from_events`, `test_validator_rejects_gate_summary_mismatch` | [DEC-FACTORY-008](../../decisions/DEC-FACTORY-008-factory-run-evidence-cross-checks.md) | done |
| **R-FACTORY-RUN-EVIDENCE-011** factory ships an equivalence replay command (owner_role: control.coordinator) | H1, H4, H5 | `scripts/replay_run.py::main`, `test_replay_equivalent_for_committed_sample`, `test_replay_exits_1_on_missing_run_record`, `test_replay_exits_1_on_missing_ledger` | [DEC-FACTORY-009](../../decisions/DEC-FACTORY-009-factory-replay-command.md) | done |
| **R-FACTORY-RUN-EVIDENCE-012** replay strict HEAD verification (owner_role: control.coordinator) | H1, H5 | `scripts/replay_run.py::_verify_head`, `test_replay_exits_1_on_head_mismatch` | [DEC-FACTORY-009](../../decisions/DEC-FACTORY-009-factory-replay-command.md) | done |
| **R-FACTORY-RUN-EVIDENCE-013** replay emits typed run.evidence.replayed event (owner_role: control.coordinator) | H2, H4, H5 | `scripts/replay_run.py::_write_replay_event`, committed `ops/event-ledger/replay-run-16a7bf515611-2026-05-28T12-23-12Z.jsonl`, `test_replay_equivalent_for_committed_sample` | [DEC-FACTORY-009](../../decisions/DEC-FACTORY-009-factory-replay-command.md) | done |
| **R-FACTORY-RUN-EVIDENCE-014** replay writes detailed comparison report (owner_role: control.coordinator) | H3, H4, H5 | `scripts/replay_run.py::_write_replay_report`, committed `ops/replay-records/run-16a7bf515611/05c783cb-b12d-427c-beb2-2a77c34cd339.json`, `test_replay_detects_divergence_when_task_mutated` | [DEC-FACTORY-009](../../decisions/DEC-FACTORY-009-factory-replay-command.md) | done |
| **R-SPEC-009** spec discipline (owner_role: product.spec-writer) | S1, S2, S3 | registered spec, spec_check, run ledger | (allowlisted) | done |

## Status snapshot

```
Pass A - MCP surface           done
Pass B - spec expansion        done
Pass C - dual review/metadata  done
Pass D - routing               done
Pass E - factory console       done
Pass F - run-evidence emission done
Pass G - run-evidence cross-checks done
Pass H - factory replay command done
Spec discipline                done
```
