# Spec 0019 - Traceability

| Requirement | DEC | Implementation | Tests | Lane | Status |
|---|---|---|---|---|---|
| R-FAM-V1-001 (PRODUCT_BRIEF.md) | DEC-FACTORY-V2-FULL-001 | `scripts/factory/contract.py::validate_active_repo_files` | `test_active_mvp_contract.py::test_missing_product_brief_fails` | A | done |
| R-FAM-V1-002 (SYSTEM_MAP.md) | DEC-FACTORY-V2-FULL-001 | same module | `test_missing_system_map_fails` | A | done |
| R-FAM-V1-003 (specs/0002-design/) | DEC-FACTORY-V2-FULL-001 | inherited from spec 0018 contract gates | inherited | - | shipped |
| R-FAM-V1-004 (STATUS.md sections) | DEC-FACTORY-V2-FULL-001 | `contract.py::validate_status_md_sections` | `test_status_md_required_sections` | A | done |
| R-FAM-V1-005 (one real artifact) | DEC-FACTORY-V2-FULL-001 | `contract.py::validate_expected_artifacts` | `test_expected_artifact_missing_fails` | A | done |
| R-FAM-V1-006 (validation command in README) | DEC-FACTORY-V2-FULL-001 | `contract.py::validate_readme_run_path` | `test_readme_missing_run_path_fails` | A | done |
| R-FAM-V1-010 (expected_artifacts task field) | DEC-FACTORY-V2-FULL-001 | `task.py::ExpectedArtifact` + `Task.expected_artifacts` | `test_load_task_accepts_expected_artifacts` | A | done |
| R-FAM-V1-011 (module_map task field) | DEC-FACTORY-V2-FULL-001 | `task.py::ModuleMapEntry` + `Task.module_map` | `test_load_task_accepts_module_map` | A | done |
| R-FAM-V1-012 (persona_reviews task field) | DEC-FACTORY-V2-FULL-001 | `task.py::PersonaReview` (architecture\|security) | `test_load_task_persona_reviews_v1_closed_set` | A | done |
| R-FAM-V1-013 (defect log) | DEC-FACTORY-V2-FULL-001 | `defects.py::append_defect` | `test_handoff_packet.py::*defect*` | A | done |
| R-FAM-V1-014 (next_feature_queue writer) | DEC-FACTORY-V2-FULL-001 | `next_features.py::update_status_md` | `test_handoff_packet.py::*status*` | A | done |
| R-FAM-V1-015 (handoff_packet writer) | DEC-FACTORY-V2-FULL-001 | `handoffs.py::write_handoff_packet` | `test_handoff_packet.py::*handoff*` | A | done |
| R-FAM-V1-020 (template dir) | DEC-FACTORY-V2-FULL-001 | `ops/factory-templates/data-report/` | `test_templates.py::test_render_new_task_substitutes_placeholders` | A (data-report); B owns product-control-plane | partial |
| R-FAM-V1-021 (`--new-task --template`) | DEC-FACTORY-V2-FULL-001 | `run.py::cmd_new_task` | `test_templates.py::test_new_task_cli_writes_yaml` | A | done |
| R-FAM-V1-022 (presence-check smoke + glob-tolerance) | DEC-FACTORY-V2-FULL-001 | template `smoke.sh` files | manual review | B | pending |
| R-FAM-V1-023 (defer 5 templates to spec 0020) | DEC-FACTORY-V2-FULL-001 | `out_of_scope` block in design.md | - | - | shipped |
| R-FAM-V1-030 (expected_artifact hard-fail) | DEC-FACTORY-V2-FULL-001 | `pipeline.py` contract-gate stage | `test_active_mvp_contract.py::test_missing_artifact_blocks_pipeline` | A | done |
| R-FAM-V1-031 (module_map source-file hard-fail) | DEC-FACTORY-V2-FULL-001 | same | `test_missing_module_source_blocks_pipeline` | A | done |
| R-FAM-V1-032 (active-repo files hard-fail) | DEC-FACTORY-V2-FULL-001 | same | `test_missing_active_files_blocks_when_active_true` | A | done |
| R-FAM-V1-040 (3 new test files) | DEC-FACTORY-V2-FULL-001 | `tests/factory/{test_active_mvp_contract,test_templates,test_handoff_packet}.py` | self | A | done |
| R-FAM-V1-041 (replay fixture regen) | DEC-FACTORY-V2-FULL-001 | `ops/run-records/run-960d6b107160.json` + ledger | `test_canonical_sample_replay_is_deterministic` passes | A | done |
| R-FAM-V1-042 (sandbox hook hardening) | DEC-FACTORY-V2-FULL-001 | `tests/factory/conftest.py` patches `git init` | regression in `test_workers.py::test_*_in_git_fixture` | A | done |
| R-FAM-V1-043 (privacy canary) | DEC-FACTORY-V2-FULL-001 | `tests/factory/test_privacy_canary.py` | `test_active_task_metadata_canary_does_not_leak_to_persisted_sinks` | A | done |
| R-FAM-V1-050 (pilot 2 repos) | DEC-FACTORY-V2-FULL-001 | `ops/factory-tasks/pilot-fam-binding-constraint.yaml`; brief-calibration pending | manual verification per acceptance | A (binding-constraint) + B (brief-calibration) | partial |
| R-FAM-V1-051 (4 pilot criteria) | DEC-FACTORY-V2-FULL-001 | DEC evidence row after pilot | - | both | partial |
| R-FAM-V1-060/061/062 (decision branches) | DEC-FACTORY-V2-FULL-001 | DEC verdict section | - | both | pending |
| R-FAM-V1-070 (PASS/INVESTIGATE/HOLD) | DEC-FACTORY-V2-FULL-001 | `triage.py::classify_terminal_state` | `test_active_mvp_contract.py::test_triage_classifier_rules` | A | done |
| R-FAM-V1-071 (triage_policy task field) | DEC-FACTORY-V2-FULL-001 | `task.py::TriagePolicy` + `Task.triage_policy` | `test_load_task_accepts_triage_policy` | A | done |
| R-FAM-V1-072 (HOLD blocks next run) | DEC-FACTORY-V2-FULL-001 | `pipeline.py::run_pipeline` reads prior triage before starting | `test_pipeline_refuses_when_prior_triage_is_hold` | A | done |
| R-FAM-V1-080 (product framing fields) | DEC-FACTORY-V2-FULL-001 | `task.py::Task` adds 4 fields + validator | `test_load_task_active_requires_product_fields` | A | done |
| R-FAM-V1-081 (system_layers + module-layer linkage) | DEC-FACTORY-V2-FULL-001 | `task.py` validator | `test_load_task_module_must_reference_layer` | A | done |
| R-FAM-V1-082 (single-screen onboarding gate for UI types) | DEC-FACTORY-V2-FULL-001 | `contract.py::validate_first_action_in_readme` | `test_first_action_gate_for_ui_types` | A | done |
| R-FAM-V1-090 (template path = ops/factory-templates/) | DEC-FACTORY-V2-FULL-001 | mkdir + loader | covered by R-FAM-V1-021 tests | A | done |
| R-FAM-V1-091 (defer 5 templates to spec 0020) | DEC-FACTORY-V2-FULL-001 | `out_of_scope` | - | - | shipped |

## Owner coverage

- R-FAM-V1-001 R-FAM-V1-002 R-FAM-V1-003 R-FAM-V1-004 R-FAM-V1-005 R-FAM-V1-006 owner_role: control.coordinator
- R-FAM-V1-010 R-FAM-V1-011 R-FAM-V1-012 R-FAM-V1-013 R-FAM-V1-014 R-FAM-V1-015 owner_role: control.coordinator
- R-FAM-V1-020 R-FAM-V1-021 R-FAM-V1-022 R-FAM-V1-023 owner_role: control.coordinator
- R-FAM-V1-030 R-FAM-V1-031 R-FAM-V1-032 owner_role: control.coordinator
- R-FAM-V1-040 R-FAM-V1-041 R-FAM-V1-042 R-FAM-V1-043 owner_role: control.coordinator
- R-FAM-V1-050 R-FAM-V1-051 R-FAM-V1-060 R-FAM-V1-061 R-FAM-V1-062 owner_role: control.coordinator
- R-FAM-V1-070 R-FAM-V1-071 R-FAM-V1-072 owner_role: control.coordinator
- R-FAM-V1-080 R-FAM-V1-081 R-FAM-V1-082 R-FAM-V1-090 R-FAM-V1-091 owner_role: control.coordinator
