# Spec 0019 — Research + inputs

## Primary inputs

### Codex's factory-first plan (2026-06-20)
Original message captured in conversation; key contributions absorbed into this spec:
- Active-MVP contract as the unit of factory output (R-FAM-V1-001..006)
- Persona reviews as first-class factory primitive (R-FAM-V1-012)
- Defect log + next feature queue + handoff packet as required outputs (R-FAM-V1-013/014/015)
- Templates by repo type (R-FAM-V1-020)
- 2-repo pilot kill-or-continue before scaling (R-FAM-V1-050)

### Codex's refinement (2026-06-20 second message)
Sharpened the contract with concrete primitives I'd missed:
- PASS / INVESTIGATE / HOLD terminal classification (R-FAM-V1-070..072)
- product_vision / target_user / first_user_action as required task fields (R-FAM-V1-080)
- system_layers as the parent grouping for modules (R-FAM-V1-081)
- Single-screen-onboarding UX gate (R-FAM-V1-082)
- Template path at `ops/factory-templates/` not `scripts/factory/templates/` (R-FAM-V1-090)
- "The repos are output, not the process" framing — adopted as the spec's mission line

### ChatGPT test-plan handoff (2026-06-20)
Most patterns already covered by existing factory work:
- Unit tests for tool adapters → `tests/factory/test_workers.py` already covers
- Integration snapshot/replay → `tests/factory/test_replay_run.py` already covers (one failure to fix per R-FAM-V1-041)
- Property: replay consistency → existing replay-determinism test
- CI wiring → already in `.github/workflows/`

One genuinely new pattern adopted:
- **Privacy canary property test** → R-FAM-V1-043. Plant `SEC{uuid}` canaries in fixture inputs; assert no leakage to prompts/events/defects/handoffs/committed files.

### ChatGPT agent-memory handoff (2026-06-20)
Three patterns named:
1. Tool-injected memory — relates to how persona prompts read PRIOR review findings (already shipped as IMPLEMENT_PATCH_PROMPT in commit `1b0fc46`)
2. Session layering / RunContext — relates to v2-lite's task state + trace_id (already shipped in spec 0018)
3. Snapshot & Bridge Hooks — relates directly to the handoff packet (R-FAM-V1-015)

Net-new from the memory message: confirmation that the handoff packet IS the "Session Bridge" pattern named in the article. No additional requirements; the existing R-FAM-V1-015 already encodes the pattern.

## Prior factory work this builds on

- **Spec 0018 + DEC-FACTORY-V2-LITE-001**: v2-lite primitives (phase, persona, test_matrix, attribution) + 7 factory bug fixes (FAC-001..007) + 2 reviewer prompts (architecture, security). Spec 0019 is the v2-full successor.
- **Batch-2 evidence**: 5 Claude-lane repos shipped via factory + Codex's 5 direct-build repos. Two gate-design lessons captured in DEC-FACTORY-V2-LITE-001's batch-2 addendum:
  - Smoke gates must be presence-checks, not builds-needing-install (informs R-FAM-V1-022)
  - Gates must not match exact filenames (informs R-FAM-V1-022)
- **Deep-research workflow `wjv58mvj4`** (referenced in spec 0018): MAST taxonomy (NeurIPS 2025), AgentFail (Sept 2025), LangChain swarm/supervisor benchmark, Cognition Devin Nov 2025 review. Cautions still apply: keep persona count low until evidence demands more.

## Open questions for after pilot

1. Do contract gates close BUG-FAC-007 (no-op impl rounds accepted) as fully as the 277d27f patch did? Hypothesis: yes, more cleanly — expected_artifacts is structural, the no-op detector was reactive.
2. Does the 2-persona architecture+security panel catch what a 6-persona panel would? Pilot evidence will inform whether to expand to 6 in spec 0020 or hold at 2 longer.
3. Is `--new-task --template <type>` the right operator ergonomics, or does the operator prefer copy-modify-yaml? Pilot answers via real use.
4. Does the PASS/INVESTIGATE/HOLD classification reduce operator decision load? Or does it just reframe the same go/no-go judgement?

## What this spec deliberately does NOT do

- Replace the v2-lite primitives — extends them. Existing batch-2 YAMLs continue to load and run.
- Add 4 more personas — defers to spec 0020 after pilot evidence.
- Add 5 more templates — defers to spec 0020+ same reason.
- Build a multi-repo DEC reconciliation engine — that's spec 0022 territory if it earns priority.
- Build a long-running persistent-memory agent — the handoff packet IS the memory layer; per-run isolation stays.
