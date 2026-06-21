# Spec 0018 — Traceability

| Requirement | DEC | Implementation | Tests | Status |
|---|---|---|---|---|
| R-FACVL-001 (phase field) | DEC-FACTORY-V2-LITE-001 | `scripts/factory/task.py` `Task.phase`, `VALID_PHASES`, load_task validation | `test_v2_lite.py::test_load_task_accepts_phase_persona_and_matrix`, `::test_load_task_rejects_unknown_phase`, `::test_load_task_defaults_preserve_pre_v2_behavior` | shipped |
| R-FACVL-002 (persona field) | DEC-FACTORY-V2-LITE-001 | `Task.persona` field, load_task validation | `test_load_task_accepts_phase_persona_and_matrix` | shipped |
| R-FACVL-003 (test_matrix field) | DEC-FACTORY-V2-LITE-001 | `MatrixEntry` dataclass, `to_gate()`, `VALID_TIERS`, load_task parsing | `test_load_task_accepts_phase_persona_and_matrix`, `test_load_task_rejects_unknown_tier`, `test_matrix_entry_to_gate_preserves_blocking_and_cwd`, `test_all_gates_concats_gates_then_matrix` | shipped |
| R-FACVL-004 (phase/persona on events) | DEC-FACTORY-V2-LITE-001 | `pipeline.py::_record_worker_event` includes `phase` + `persona`; `pipeline.start` event records both + `test_matrix_size` | covered indirectly by `tests/factory/test_pipeline.py` (existing); explicit attribution tests confirm payloads carry phase | shipped |
| R-FACVL-005 (matrix gates run via all_gates) | DEC-FACTORY-V2-LITE-001 | 4 sites in `pipeline.py` switched to `task.all_gates()`; replay-equivalence hash invariant preserved | `tests/factory/test_replay_determinism.py` (existing, unchanged, green) | shipped |
| R-FACVL-006 (attribution module) | DEC-FACTORY-V2-LITE-001 | `scripts/factory/attribution.py` with `AttributionReport`, `SYMPTOM_KINDS`, `attribute_failure()` | `test_attribute_failure_on_empty_task_returns_empty_report`, `test_attribute_failure_traces_chain_when_no_failure`, `test_attribute_failure_walks_to_first_cross_phase_predecessor`, `test_attribute_failure_handles_same_phase_failure`, `test_attribute_failure_uses_most_recent_trace_when_omitted` | shipped |
| R-FACVL-007 (state migration) | DEC-FACTORY-V2-LITE-001 | `scripts/factory/state.py` MIGRATIONS adds `tasks.phase`, `tasks.persona`; `TaskRow.phase`, `TaskRow.persona` | `test_state_migration_adds_phase_persona_columns`, `test_state_update_task_accepts_phase_persona` | shipped |
| R-FACVL-008 (135 tests green) | DEC-FACTORY-V2-LITE-001 | `tests/factory/test_v2_lite.py` adds 14 tests; full suite green | `python -m pytest tests/factory/ -q` → 135 passed, 1 skipped | shipped |
| R-FACVL-009 (2 reviewer prompts) | DEC-FACTORY-V2-LITE-001 | `scripts/factory/prompts/review-architecture.md`, `scripts/factory/prompts/review-security.md` | manual review for ≤120 lines + voice_lint clean | in flight |
| R-FACVL-010 (9 pilot YAMLs) | DEC-FACTORY-V2-LITE-001 | `ops/factory-tasks/pilot-{slug}/{design-review,impl,test-matrix}.yaml` × 3 slugs | each must `load_task` cleanly + `--dry-run` succeeds | in flight |
| R-FACVL-011 (pilot DEC with evidence) | DEC-FACTORY-V2-LITE-001 | `decisions/DEC-FACTORY-V2-LITE-001.md` go/no-go with evidence per 4 criteria | manual review against acceptance.md criteria | pending pilot runs |
| R-FACVL-012 (no new worker classes) | DEC-FACTORY-V2-LITE-001 | `scripts/factory/workers.py` unchanged in v2-lite scope; persona is a string carried in events, not a typed worker subclass | `git diff scripts/factory/workers.py` shows no change | shipped |
## Owner coverage

- R-FACVL-001 R-FACVL-002 R-FACVL-003 R-FACVL-004 R-FACVL-005 R-FACVL-006 owner_role: control.coordinator
- R-FACVL-007 R-FACVL-008 R-FACVL-009 R-FACVL-010 R-FACVL-011 R-FACVL-012 owner_role: control.coordinator
