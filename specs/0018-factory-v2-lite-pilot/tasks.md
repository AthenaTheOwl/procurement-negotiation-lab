# Spec 0018 — Tasks

## Phase A — v2-lite implementation (done by Claude, 2026-06-20)

- [x] Add `phase`, `persona`, `test_matrix` to `task.py`; add `MatrixEntry` + `all_gates()`
- [x] Add `tasks.phase`, `tasks.persona` migrations to `state.py`
- [x] Switch 4 gate-read sites in `pipeline.py` to `task.all_gates()`
- [x] Emit `phase`/`persona` on every worker event in `pipeline.py`
- [x] New `scripts/factory/attribution.py` (~180 lines incl. dataclass + helpers)
- [x] `tests/factory/test_v2_lite.py` with 14 new tests
- [x] Full `tests/factory/` suite green (135 tests pass, 1 skip)

## Phase B — reviewer prompts (in progress)

- [ ] `scripts/factory/prompts/review-architecture.md` (≤120 lines)
- [ ] `scripts/factory/prompts/review-security.md` (≤120 lines)
- [ ] voice_lint clean
- [ ] (decision pending) wire prompt files into reviewer worker resolution, OR pass-as-string in YAML

## Phase C — pilot task YAMLs

For each of `source-decay-ledger`, `grid-silicon`, `promotion-vs-pip`:

- [ ] `ops/factory-tasks/pilot-<slug>/design-review.yaml`
  - `phase: design`, `persona: architect`, reviewers: [claude_code, codex] (one per lens)
  - gates: spec_check, voice_lint
  - checkpoints: [design_panel]
- [ ] `ops/factory-tasks/pilot-<slug>/impl.yaml`
  - `phase: impl`, `persona: developer`
  - implementer: codex (data-heavy) OR claude_code (narrative-heavy)
  - gates: build, lint
  - checkpoints: [diff_review]
- [ ] `ops/factory-tasks/pilot-<slug>/test-matrix.yaml`
  - `phase: test`, `persona: tester`
  - test_matrix: unit + integration blocking; chaos + edge advisory
  - checkpoints: [pre_pr]

## Phase D — pilot runs

- [ ] Run `pilot-source-decay-ledger/{design-review,impl,test-matrix}` end-to-end. Approve at each checkpoint. Record per-phase cost + wall-clock.
- [ ] Same for `pilot-grid-silicon`.
- [ ] Same for `pilot-promotion-vs-pip`.

## Phase E — evidence + decision

- [ ] `decisions/DEC-FACTORY-V2-LITE-001.md` with evidence per the 4 kill-or-continue criteria
- [ ] Go/no-go on scaling to the 39 other repos. If go: open spec 0019 (factory v2 full). If no-go: document what to revise.

## Out of scope for this spec

- Factory v2 full (vision worker, architect worker, deploy worker, design-panel debate)
- The other 39 repos
- Cross-actor Claude↔Codex handoff
