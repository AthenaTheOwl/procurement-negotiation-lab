# Spec 0019 — Tasks

Two-lane execution. Each lane is independent end-to-end EXCEPT for one PR-review handshake on the contract schema (so Claude's templates and Codex's kernel speak the same shape).

## Lane split

| Lane | Owner | Scope |
|---|---|---|
| **A — Kernel** | Codex | New runtime code: contract validators, defect log, handoff packet, next-feature writer, template loader, hard-fail gate wiring, new tests, BUG-FAC-002/003/006/007 regression coverage |
| **B — Templates + design** | Claude | Active-MVP contract design doc, 2 canonical templates, persona prompt audit, pilot prep, replay-fixture regen + sandbox hook fix |
| **Convergence** | both | One PR-review pass on the task.py schema additions (`expected_artifacts`, `module_map`, `persona_reviews`, `active`) before lane A merges; this prevents schema drift between Claude's templates and Codex's loader |

## Lane A (Codex) — kernel

PR 1 — schema + contract gates
- [ ] Extend `scripts/factory/task.py` with:
  - dataclasses: `ExpectedArtifact`, `ModuleMapEntry`, `PersonaReview`, `TriagePolicy`
  - new `Task` fields: `active`, `expected_artifacts`, `module_map`, `persona_reviews`, `system_layers`, `product_vision`, `target_user`, `first_user_action`, `triage_policy`, `template`
  - all default-empty / False for backward-compat with batch-2 YAMLs
- [ ] Extend `load_task()`: validate `persona_reviews` names ∈ {architecture, security} for v0.1; validate `module_map` entries reference a declared `system_layers` name; require `product_vision` + `target_user` + `first_user_action` when `active: true`
- [ ] New `scripts/factory/contract.py`:
  - `validate_active_repo_files(repo_root) -> list[ContractViolation]` — PRODUCT_BRIEF.md / SYSTEM_MAP.md / STATUS.md presence (3 required sections)
  - `validate_expected_artifacts(repo_root, artifacts) -> list[ContractViolation]` — file/dir/glob presence + non-empty
  - `validate_module_map(repo_root, modules) -> list[ContractViolation]` — source files exist + each module's layer is declared
- [ ] New `scripts/factory/triage.py`:
  - `classify_terminal_state(pipeline_result, contract_violations, gate_outcomes, defect_log, triage_policy) -> Literal["PASS","INVESTIGATE","HOLD"]`
  - Default policy = R-FAM-V1-070 rules
- [ ] Wire contract gates into `pipeline.py` AFTER user-defined gates BUT BEFORE the review step. Failures → synthesized findings + defect_log entries + route to patch loop.
- [ ] Wire triage classifier at every terminal state; write triage value into run-record + handoff packet.
- [ ] Tests: 12-16 in `tests/factory/test_active_mvp_contract.py` — each contract gate fires when its artifact is missing; triage classifier produces PASS/INVESTIGATE/HOLD correctly per fixture; pre-v0.1 task YAMLs load unchanged.

PR 2 — defect log + handoff + next features
- [ ] New `scripts/factory/defects.py` with `DefectLog` + `append_defect()`. Append-only JSONL at `ops/factory-defects/<task-id>.jsonl`.
- [ ] Hook `append_defect()` into pipeline at: gate.failed, review.needs_patch, review.rejected, contract violations, implementer no-op detection (already shipped in `277d27f`).
- [ ] New `scripts/factory/handoffs.py` with `write_handoff_packet(task, pipeline_result, store, artifacts_dir)`. Compose the operator-facing markdown from event ledger + defect log + STATUS.md state.
- [ ] Hook `write_handoff_packet` into pipeline at terminal states: done, blocked, failed, rejected, awaiting_approval.
- [ ] New `scripts/factory/next_features.py` with `update_status_md(target_repo, deferred_items, open_defects)`. Idempotent — re-running is a no-op if STATUS.md already has the entries.
- [ ] Tests: 6-10 in `tests/factory/test_handoff_packet.py` covering success / blocked / fail paths + idempotency.

PR 3 — template loader + new-task CLI
- [ ] Extend `scripts/factory/run.py` with `--new-task --template <name> --repo <slug> --task-id <id>` flow. Reads template, substitutes placeholders (`{SLUG}`, `{REPO}`, `{BRAND}`, `{TASK_ID}`, `{NOW}`), writes `ops/factory-tasks/<task-id>.yaml`.
- [ ] Reject unknown templates with helpful "available: data-report, product-control-plane" error.
- [ ] Tests: 4-6 in `tests/factory/test_templates.py` — placeholder substitution, missing template, dry-run cleanly loads generated YAML.

PR 4 — replay-fixture regen + sandbox-hook hardening
- [ ] Run the canonical replay-sample task on current HEAD; commit the new `ops/run-records/run-<hash>.json` + `ops/event-ledger/run-<hash>.jsonl` as the new fixture.
- [ ] Fix `tests/factory/conftest.py` or equivalent: temp git repos used as fixtures call `git init` with `--template=<empty-dir>` OR immediately `git config core.hooksPath /dev/null` to disable inherited pre-commit hooks. Codex's sandbox confirmed this issue.
- [ ] `test_canonical_sample_replay_is_deterministic` passes on both Claude + Codex shells.

PR 5 — privacy canary property test
- [ ] New `tests/factory/test_privacy_canary.py` per R-FAM-V1-043. Plant canary in env + fixture inputs; assert no leakage to prompts/events/defects/handoffs/committed files.

PR 6 — pilot run: binding-constraint
- [ ] `python -m scripts.factory.run --new-task --template data-report --repo binding-constraint --task-id pilot-fam-binding-constraint`
- [ ] Edit the generated YAML to populate goal + expected_artifacts list
- [ ] Run end-to-end; merge each phase manually IF gate-rigidity hits (document as lessons)
- [ ] Confirm all 6 contract artifacts present in `AthenaTheOwl/binding-constraint`
- [ ] Append evidence to DEC-FACTORY-V2-FULL-001

## Lane B (Claude) — templates + design

PR 1 — contract doc + 2 templates
- [ ] Write `ops/factory-templates/CONTRACT.md` — canonical reference for what an active-MVP repo looks like, with examples and rationale
- [ ] Build `ops/factory-templates/data-report/`:
  - `task.yaml.tmpl` with `{SLUG}`/`{BRAND}`/`{REPO}`/`{NOW}` placeholders, `phase: impl`, `persona: developer`, default 2-persona review
  - `expected_artifacts.yaml`: PRODUCT_BRIEF.md, SYSTEM_MAP.md, STATUS.md, pyproject.toml, src/<pkg>/__init__.py, src/<pkg>/cli.py, tests/, one of reports/*.jsonl|data/*.jsonl
  - `module_map.yaml`: cli (cli.py), fetch (fetch.py), score (score.py), report (report.py)
  - `smoke.sh`: presence-check pattern (`ls src/<pkg>/*.py | grep -q . && test -f pyproject.toml && test -d reports`)
- [ ] Build `ops/factory-templates/product-control-plane/` with shapes appropriate to monthly/quarterly tooling repos
- [ ] Both templates voice-lint clean

PR 2 — persona prompt audit
- [ ] Review `scripts/factory/prompts/review-architecture.md` + `review-security.md` against batch-2 evidence (which findings shipped real value vs which were polish?). Tighten if needed.
- [ ] Document each persona's "in-scope" vs "out-of-scope" in a sibling `review-PERSONA.md.notes` file so Claude/Codex don't drift.

PR 3 — pilot run: brief-calibration
- [ ] Use Codex's `--new-task --template product-control-plane --repo brief-calibration --task-id pilot-fam-brief-calibration` (depends on Codex Lane A PR 3 landing)
- [ ] Edit generated YAML; run end-to-end
- [ ] Confirm all 6 contract artifacts
- [ ] Append evidence to DEC

PR 4 — DEC outcome + decision
- [ ] After both pilots ship, write the verdict to DEC-FACTORY-V2-FULL-001 with 4-criterion evidence per R-FAM-V1-051
- [ ] If 4/4: name the 8-10 repos for batch 3 in the recommendation section
- [ ] If < 4/4: name what needs fixing in spec 0020

## Convergence point

After Lane A PR 1 (schema + contract gates), BEFORE merging to main:
- Codex opens a draft PR; Claude reviews the schema additions against the templates in Lane B PR 1
- Both agree the field names + types match; OR one side patches before merge
- Claude's templates land AFTER the schema PR so they reference the actual types

## Out of scope for v0.1

- More personas (spec 0020)
- More templates (spec 0020+)
- LangGraph parallel persona reviews (spec 0021+)
- Multi-repo DEC reconciliation (spec 0022+)
- Token cost tracking / per-persona budgets (spec 0023+)
