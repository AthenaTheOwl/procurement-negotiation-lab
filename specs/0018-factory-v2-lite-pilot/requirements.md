# Spec 0018 — Factory v2-lite pilot requirements

A kill-or-continue pilot of multi-phase SDLC orchestration on 3 of the 42 new portfolio repos. v2-lite adds the smallest set of factory changes that can carry a vision/design/impl/test/deploy flow without inventing new worker classes; the pilot tells us whether the multi-phase shape earns its keep before scaling to the other 39.

The full plan is in DEC-FACTORY-V2-LITE-001. This file lists the gate-checked requirements.

### R-FACVL-001: phase field on tasks
Task YAML accepts an optional `phase` string drawn from the closed set `{vision, design, impl, test, deploy}`. Default is `impl` (backward-compatible with pre-v2 tasks).

### R-FACVL-002: persona field on tasks
Task YAML accepts an optional `persona` string. Default is `"default"`. No closed-set validation — the persona names a prompt template the runner uses to specialize the worker.

### R-FACVL-003: test_matrix field
Task YAML accepts an optional `test_matrix` list. Each entry is `{tier, cmd, blocking?, name?, cwd?}` with `tier` drawn from `{unit, integration, interface, chaos, edge, functional}`. Each entry converts to a `GateSpec` at load time with a canonical name `tier:<tier>[:short-name]`.

### R-FACVL-004: phase and persona on events
Every worker-emitting pipeline event (plan, implement, review, gates) carries `phase` and `persona` in the event payload. The `pipeline.start` event additionally records the test-matrix size so downstream readers can recognize multi-tier runs.

### R-FACVL-005: pipeline reads matrix gates
The pipeline executes gates from `task.all_gates()` (= `task.gates + [e.to_gate() for e in task.test_matrix]`) in both dry-run and real execution. Replay-equivalence hashes on `pipeline.start` and the final Run record use the same method so the cross-check from DEC-FACTORY-008 stays valid.

### R-FACVL-006: attribution module
A new `scripts/factory/attribution.py` walks the event ledger for a `(task_id, trace_id)` pair, identifies the first symptom event (kinds in `SYMPTOM_KINDS`), and walks backward to the first event in a *different* phase. Reports `(symptom, root_cause, propagation_distance, phase_chain)`.

### R-FACVL-007: state schema migration
`scripts/factory/state.py` adds `tasks.phase` and `tasks.persona` columns via the additive ALTER TABLE pattern. Re-opening an existing DB is a no-op for already-present columns.

### R-FACVL-008: 14 new tests + 121 existing factory tests green
`tests/factory/test_v2_lite.py` covers task loading, matrix-to-gate conversion, state migration, and attribution. The full `tests/factory/` suite must stay green (135 total).

### R-FACVL-009: 2 reviewer prompts
`scripts/factory/prompts/review-architecture.md` and `scripts/factory/prompts/review-security.md` live in-tree as canonical reviewer prompts for the design-review phase. Each is ≤120 lines, names what to check and what to refuse, and is voice-lint-clean.

### R-FACVL-010: 3 pilot repos × 3 task YAMLs
`ops/factory-tasks/pilot-{sdl,grid,pvp}-{design-review,impl,test-matrix}.yaml` exist and load without error. They reference the persona prompts and use phase + test_matrix. Design-review and impl phases use `diff_review` checkpoint (the wired pause point); test-matrix phase uses `pre_pr`. `design_panel` exists in VALID_CHECKPOINTS as a v2-full placeholder but is NOT used in pilot YAMLs (would silently no-op).

### R-FACVL-011: pilot success criteria recorded in a DEC
After the pilot runs, `decisions/DEC-FACTORY-V2-LITE-001.md` records evidence per the 4 kill-or-continue criteria:
1. Multi-persona review caught ≥1 issue per repo that a single-agent review missed
2. Each pilot repo has runnable code + passing unit tests
3. Total token spend ≤ $50, per-repo wall-clock ≤ 4 hrs
4. Each pilot produced one concrete artifact a human would use

Decision is **scale to 39** or **stop and revise** based on the evidence.

### R-FACVL-012: no new worker classes
v2-lite explicitly does NOT add VisionWorker, ArchitectWorker, DesignPanelWorker, DeployWorker, or DeploymentWorker. Multi-persona review is implemented by running the existing review loop twice with different prompts. The pilot tells us whether new worker classes earn their keep; until then, the existing 3 (Claude/Codex/Stub) cover all phases via the `persona` field.
