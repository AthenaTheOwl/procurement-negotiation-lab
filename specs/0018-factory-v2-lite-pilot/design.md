# Spec 0018 — Design

## Why v2-lite, not full v2

The deep-research run (transcript: workflow `wjv58mvj4`) surfaced strong primary evidence that multi-agent SDLC pipelines often fail to beat well-prompted single-agent baselines:

- **MAST** (NeurIPS 2025, arxiv 2503.13657): 14 failure modes catalogued across 1600+ traces; gains are "often minimal."
- **AgentFail** (Sept 2025, arxiv 2509.23735): 32% of failures propagate non-locally; the symptom is in a different node than the root cause.
- **LangChain June 2025 benchmark**: supervisor topologies pay a "telephone game" token tax.
- **Cognition Devin annual review (Nov 2025)**: even with 18 months of work, the most-marketed product cannot autonomously complete ambiguous projects.

Codex's response to the original v2 plan was sharp: do **not** scale to 42 repos before proving the multi-phase machinery on 3. v2-lite is the smallest change that lets us run the multi-phase shape end-to-end on 3 pilots without inventing speculative new worker types.

## Architecture

### What changed

| File | Change | Lines |
|---|---|---|
| `scripts/factory/task.py` | `phase`, `persona`, `test_matrix` fields; `MatrixEntry` dataclass; `all_gates()` helper; `VALID_PHASES`, `VALID_TIERS` | +85 |
| `scripts/factory/state.py` | 2 new migrations (`tasks.phase`, `tasks.persona`); `TaskRow` fields | +8 |
| `scripts/factory/pipeline.py` | Emit `phase`/`persona` on `pipeline.start` + every `_record_worker_event`; switch 4 gate-read sites to `task.all_gates()` | +14 |
| `scripts/factory/attribution.py` | New file. `attribute_failure(store, task_id, trace_id)` → `AttributionReport` | +180 |
| `tests/factory/test_v2_lite.py` | 14 new tests | +220 |

Total net-new: ~150 lines + 220 lines of tests.

### What did NOT change

- No new worker classes. Multi-persona = re-running the existing review loop with a different prompt.
- No new pipeline states. `phase` is metadata, not a state-machine node.
- No new wired checkpoints. `design_panel` is added to `VALID_CHECKPOINTS` for v2-full but is NOT a real pause point in v2-lite (pipeline would treat it as a no-op marker). The pilot's design-review phase uses the existing `diff_review` pause point — operator approves the design artifact before the impl phase begins. Naming it `design_panel` in the YAMLs would silently skip the pause.
- No deploy worker. The pilot's `test-matrix` phase ends at PR creation via the existing `pr.open` flag.

### The 5 phases

```
vision   →  intent + scope + user. 1-page artifact.
design   →  architecture + per-block requirements + design panel approval.
impl     →  code + tests. Existing plan/implement/review loop.
test     →  multi-tier test matrix (unit/integration/interface blocking;
            chaos/edge advisory).
deploy   →  PR + optional deployment trigger (out of scope for v2-lite;
            phase value reserved for v2-full).
```

For the pilot, repos run **3 phases**: `design` (with multi-persona review), `impl`, and `test`. Vision was already authored by the scaffold workflow's spec/0001-foundation/requirements.md. Deploy is the existing `gh repo push` already wired in.

### Attribution: how it walks the ledger

```
events_for(task, trace_id)
  ↓
find first event whose kind ∈ SYMPTOM_KINDS
  ↓ (none found)         ↓ (found at idx)
  return empty report     walk backward from idx-1
                            ↓
                          find first event whose phase != symptom.phase
                            ↓ (found)              ↓ (none)
                          that event = root      symptom is own root
                            ↓
                          report propagation_distance = symptom_idx - root_idx
                          report phase_chain = distinct phases in order
```

The heuristic is intentionally simple. It does not claim certainty; it narrows where a human should look first when a downstream phase fails.

### YAML schema (additive)

```yaml
# Pre-v2 task (unchanged):
id: ...
title: ...
target_repo: ...
goal: ...
gates: [...]
review: {...}

# v2-lite additions (all optional):
phase: design               # one of vision|design|impl|test|deploy
persona: architect          # any non-empty string
test_matrix:
  - tier: unit              # one of unit|integration|interface|chaos|edge|functional
    cmd: pytest tests/unit -q
    blocking: true          # default true
    name: short-name         # optional; if omitted, gate name = "tier:<tier>"
    cwd: apps/web           # optional; passed through to GateSpec
```

### Backward compatibility

- All v2-lite fields default to backward-compatible values.
- `TaskRow.phase` and `TaskRow.persona` default to `None` so pre-v2 rows read fine.
- The 4 gate-read sites use `task.all_gates()`, which returns `task.gates` unchanged when `test_matrix` is empty.
- Existing 121 factory tests pass without modification.

## Pilot scope

3 repos × 3 task YAMLs each = **9 factory runs**.

| Repo | Why pilot | Phase 1: design-review | Phase 2: impl | Phase 3: test-matrix |
|---|---|---|---|---|
| `source-decay-ledger` | Smallest scope. Most direct utility to ai-field-brief. | reviewers: [architecture-lens, security-lens] | Codex implements per spec/0002-design/ | unit+integration blocking; chaos advisory |
| `grid-silicon` | Highest data-ceiling. Hardest scope. Tests data-product handling. | same | Codex implements ERCOT ingest v0 | unit+integration+interface blocking |
| `promotion-vs-pip` | Game cards + rules. Different shape. Tests generalization. | same | Claude implements card YAMLs + render script | unit blocking; edge advisory |

Each phase pauses at the appropriate checkpoint. The operator approves before the next phase runs.

## Risks

| Risk | Mitigation |
|---|---|
| Pilot proves multi-persona review adds no value | DEC-FACTORY-V2-LITE-001 documents the negative result and we revert to single-reviewer. v2-lite stays in the tree but the new fields default-off. |
| Token spend exceeds $50 | Each pilot run logs cost; pipeline aborts if a single repo's spend extrapolates over $20. |
| Replay determinism breaks because gates list changed | Both hash-emission sites use `task.all_gates()` — same method on both sides preserves the cross-check invariant. Existing replay-determinism test stays green. |
| Pilot repos can't be built because scaffolds are empty | Each pilot repo's design-review phase reads scaffold's `specs/0001-foundation/` and emits `specs/0002-design/` — design phase is where the real work starts. |

## Out of scope for v2-lite

- New worker classes (VisionWorker, ArchitectWorker, DeployWorker)
- Multi-persona reviewer typed-role aggregation (e.g., "PM must approve AND security must approve"). v2-lite reuses existing conservative aggregation (any reviewer NEEDS_PATCH → patch loop).
- SWE-Debate-style 3-round adversarial debate.
- Cross-actor (Claude ↔ Codex) handoff schema.
- The other 39 repos.
