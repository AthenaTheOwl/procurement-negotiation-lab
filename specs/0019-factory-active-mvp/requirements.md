# Spec 0019 — Factory active-MVP contract

After the v2-lite pilot + batch-2 work (spec 0018, DEC-FACTORY-V2-LITE-001), the factory ships repos but every per-repo gate template is bespoke. Each new repo teaches us the same lesson: which gates are too literal, which prompts need anti-pattern lists, where the implementer drifts.

This spec turns the factory from "runs agents" into "produces consistent MVPs." Standard lifecycle, standard artifact contract, hard-fail gates on missing evidence, per-type templates so each new repo inherits the lessons.

Brand prefix: `FAM` (factory active-MVP).

## Scope cuts vs Codex's proposal

Codex's plan (2026-06-20 chat handoff) is the design north star. Three deliberate cuts for v0.1 of this spec:

1. **Start with 2 review personas, not 6.** v2-lite proved that even 2 lenses (architecture + security) need careful engineering. Add product, UX, data-quality, testing personas as DEMAND surfaces in subsequent specs.
2. **Templates land WITH the contract, not after.** Building contract code without a working template is speculation. The MVP is: one canonical template per repo type, contract derived from what the template requires.
3. **Pilot 2 repos before scaling.** Same discipline as spec 0018 — kill-or-continue on `binding-constraint` + `brief-calibration` before any batch-3 wave.

## Requirements

### Active-MVP contract (the shape every repo must satisfy)

- **R-FAM-V1-001**: Every active repo has `PRODUCT_BRIEF.md` at root. 30-200 words covering: who it serves, what decision it helps, what output matters most. Hard gate.
- **R-FAM-V1-002**: Every active repo has `SYSTEM_MAP.md` at root. Lists modules + interfaces between them (function signatures, schema names, file formats). No prose-only descriptions.
- **R-FAM-V1-003**: Every active repo has `specs/0002-design/{requirements,design,tasks,acceptance}.md`. Same as v2-lite. Hard gate.
- **R-FAM-V1-004**: Every active repo has `STATUS.md` at root with sections: `## Current state`, `## Known limits`, `## Next feature queue`. The queue is the input to the next factory run.
- **R-FAM-V1-005**: Every active repo has ONE real artifact under `reports/`, `examples/`, `data/`, or `print.*` (game/visual repos). Not a placeholder; a real produced output.
- **R-FAM-V1-006**: Every active repo has a single validation command published in README's "How to run" section that exits 0 on a fresh clone after install. Examples: `python -m <pkg> validate`, `npm test`, `node scripts/<entry>.js`.

### Factory kernel primitives (the runtime that enforces the contract)

- **R-FAM-V1-010**: Task YAML grows an `expected_artifacts` list. Hard-fail gate: every entry must exist as a file at the listed path after impl + commit step.
- **R-FAM-V1-011**: Task YAML grows a `module_map` block. Each entry: `{name, public_interfaces: [str]}`. The factory does NOT enforce interface content in v0.1 (just presence); v0.2 may add typecheck/regex coverage.
- **R-FAM-V1-012**: Task YAML grows a `persona_reviews` list — for v0.1, exactly 2 supported entries: `architecture` (lifts `scripts/factory/prompts/review-architecture.md`) and `security` (lifts `review-security.md`). v0.2 adds `product`, `ux`, `data-quality`, `testing` as adoption demands.
- **R-FAM-V1-013**: Factory emits `defect_log` entries on every NEEDS_PATCH cycle and gate failure. Schema: `{kind, gate_or_finding, round, phase, persona, summary, resolved_in_round | null}`. Lands in `ops/factory-defects/<task-id>.jsonl`.
- **R-FAM-V1-014**: After a successful pipeline (`status: done`), the factory writes `next_feature_queue` to the TARGET repo's `STATUS.md` based on the design phase's deferred items + any unresolved defect-log entries.
- **R-FAM-V1-015**: After every pipeline (success OR fail), the factory writes a `handoff_packet` at `ops/handoffs/<task-id>.md`. Sections: `## What shipped`, `## What's next`, `## Pick up via`, `## Blocked on`. Operator can hand this to the next session/actor.

### Templates (per-repo-type defaults)

- **R-FAM-V1-020**: Template directory at `scripts/factory/templates/<type>/` with default `task.yaml`, default `expected_artifacts`, default `module_map`, default smoke gate command. v0.1 ships 2 templates: `data-report` and `product-control-plane`.
- **R-FAM-V1-021**: `python -m scripts.factory.run --new-task --template data-report --repo <slug>` scaffolds a task YAML from a template. The operator edits, then `--task` runs it.
- **R-FAM-V1-022**: Each template's smoke gate is a presence-check pattern (not a build), reflecting the batch-2 lesson. Glob-tolerant (`ls src/<pkg>/*.py | grep -q .`) not literal-path matches.
- **R-FAM-V1-023**: Future templates (deferred to spec 0020): `rag-app`, `interactive-web-app`, `cli-tool`, `eval-harness`, `governance-control-plane`, `optimization-simulation`.

### Hard-fail safety gates

- **R-FAM-V1-030**: The factory FAILS the pipeline (does not advance to commit) if any `expected_artifact` is missing after the impl step. This closes the BUG-FAC-007 root cause: no-op impl rounds being accepted.
- **R-FAM-V1-031**: The factory FAILS if any `module_map` entry's named source file is missing.
- **R-FAM-V1-032**: The factory FAILS the pipeline if `PRODUCT_BRIEF.md`, `SYSTEM_MAP.md`, or `STATUS.md` is missing from a repo flagged `active: true` in the task YAML.

### Test infrastructure

- **R-FAM-V1-040**: Three new test files under `tests/factory/`:
  - `test_active_mvp_contract.py`: every R-FAM-V1-00x has a test asserting the gate fires when the artifact is missing
  - `test_templates.py`: templates load + produce valid task YAMLs + dry-run cleanly
  - `test_handoff_packet.py`: handoff packet shape matches schema across success/fail paths
- **R-FAM-V1-041**: Replay-equivalence fixture regenerated against current HEAD prompts. `test_canonical_sample_replay_is_deterministic` passes again.
- **R-FAM-V1-042**: Fixture-creation paths in factory tests disable inherited operator-level pre-commit hooks (`git -c init.templateDir=/dev/null init` OR `git config core.hooksPath /dev/null` immediately after init). Closes Codex's sandbox-hook issue.
- **R-FAM-V1-043**: Privacy-canary property test. Plant `SEC{uuid}` strings in fixture inputs (env, doc store, prior-conversation state). After a factory run, assert no canary substring appears in: factory prompts emitted to workers, run-evidence event payloads, defect_log entries, handoff_packet markdown, committed repo files. Fail fast with the offending sink path. (Pattern from ChatGPT test-plan handoff 2026-06-20.)

### Pilot (2 repos, kill-or-continue)

- **R-FAM-V1-050**: One pilot repo each lane:
  - **Codex lane**: `binding-constraint` — data-report template
  - **Claude lane**: `brief-calibration` — product-control-plane template
- **R-FAM-V1-051**: Pilot success criteria (all 4 must hold):
  1. Both pilots produce ALL 6 contract artifacts (PRODUCT_BRIEF, SYSTEM_MAP, specs/0002, STATUS, real artifact, validation command)
  2. Both pass the factory's hard-fail gates on first commit attempt (no manual merges)
  3. Per-repo wall-clock ≤ 30 min (templates should make the per-repo cost lower than batch-2's ~15-20 min per phase)
  4. Each pilot's `STATUS.md` next-feature-queue has ≥ 2 concrete entries for the next factory run

### Decision after pilot

- **R-FAM-V1-060**: If 4/4 hold → DEC writes "scale to batch 3" naming 8-10 repos split 4-5 Codex + 4-5 Claude
- **R-FAM-V1-061**: If 3/4 hold → fix the failing criterion's template/contract and re-pilot
- **R-FAM-V1-062**: If ≤ 2/4 hold → STOP. Re-evaluate the contract before sinking more engineering into the kernel

### Terminal classification (PASS / INVESTIGATE / HOLD)

Codex's 2026-06-20 follow-up: terminal "status: done" hides too much. Replace with three-state classification on every terminal pipeline event.

- **R-FAM-V1-070**: Every pipeline terminal state writes `triage: PASS|INVESTIGATE|HOLD` to the run-record + handoff packet + DEC reference. Rules:
  - **PASS** — all required artifacts present, all must-pass gates green, sensitive-disclosure scan clean, README run path verified, reviewer found no blocker, no no-op diff.
  - **INVESTIGATE** — artifacts present + main path works, but ONE caveat trips: an advisory gate failed, a reviewer flagged a non-blocking concern, OR a freshness check fired.
  - **HOLD** — any of: missing required artifact, failing must-pass gate, disclosure risk flagged, no-op diff, broken first user action.
- **R-FAM-V1-071**: Triage rule is declared in the task YAML under `triage_policy`. Defaults to the rule above; custom policies (e.g., for game/narrative repos where "first user action" doesn't apply) override per-field.
- **R-FAM-V1-072**: A repo with terminal triage HOLD does NOT advance to next factory run for that repo until the operator clears it.

### Product framing fields (every task YAML)

Codex flagged that "random pipelines on a page" was the prior batch's weakness. Every active task YAML must declare its product framing up front.

- **R-FAM-V1-080**: Task YAML grows `product_vision` (1-2 sentences), `target_user` (concrete persona, not "everyone"), `first_user_action` (the literal command/click within 30 seconds of opening the repo). All three are required when `active: true`.
- **R-FAM-V1-081**: Task YAML grows `system_layers` — list of named layers (e.g., `ingest`, `transform`, `present`). `module_map` entries reference layer names; the factory checks each declared module belongs to a declared layer.
- **R-FAM-V1-082**: For repos with a UI surface (`type in {interactive-web-app, web-decision-tool, game-tool}` in template), an added gate verifies `first_user_action` is documented in the rendered README under a "first 30 seconds" or "quick start" heading.

### Template directory (path resolution)

- **R-FAM-V1-090**: Templates live at `ops/factory-templates/<type>/` (NOT `scripts/factory/templates/`). Rationale: templates are operator-edit-friendly config, not Python source; `ops/` is the established home for factory operating-state.
- **R-FAM-V1-091**: v0.1 ships 2 templates per R-FAM-V1-020; remaining 5 templates land in spec 0020 per Codex's list (data-report, RAG/retrieval, web-decision-tool, eval harness, simulation/optimizer, game/card tool, governance/control-plane).

### Persona reviews (v0.1 keeps 2; spec 0020 expands to 6)

Codex's 2026-06-20 message names 6 personas (product, architecture, data, security, UX, test/reliability). v0.1 of this spec ships 2 (architecture + security) because:

- Both prompts are already shipped + battle-tested in `scripts/factory/prompts/` from spec 0018
- v2-lite proved persona prompts need careful per-persona engineering
- The factory's existing reviewer loop trivially supports adding the other 4 once their prompts ship

Spec 0020 adds product / data / UX / test-reliability after observing where the current 2 miss issues during the spec-0019 pilot. This is a deliberate cut for v0.1 ship velocity, NOT a rejection of the 6-persona model.
