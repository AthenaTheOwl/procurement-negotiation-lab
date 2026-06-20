# DEC-FACTORY-V2-LITE-001 — Multi-phase pilot before scale-up

**Date**: 2026-06-20
**Status**: shipped (v2-lite implementation); evidence-pending (pilot runs)
**Spec**: [0018-factory-v2-lite-pilot](../specs/0018-factory-v2-lite-pilot/)
**Supersedes**: nothing (additive on top of DEC-FACTORY-001..015)

## Context

After 42 portfolio repos were scaffolded on 2026-06-18, two plans collided:

1. Claude's first plan proposed a full factory v2 (7 worker types, Vision/Architect/Design-panel/Impl/Test-matrix/Reviewer/Deploy) applied across all 42 repos in a 21/21 split with Codex.
2. Codex's response: do NOT scale. The 42 repos are scaffolds — empty `specs/0001-foundation/` with no code. Running a 7-phase SDLC machine across them would manufacture more planning artifacts, not working code.

Codex's counter-plan was tighter: pilot 3 repos with a v2-lite that adds only the minimum needed to carry a multi-phase flow, treat the pilot as kill-or-continue, and decide on scale after evidence.

Deep-research workflow `wjv58mvj4` (108 agents, 19 verified claims) confirmed Codex's caution:
- Multi-agent gains are often minimal (MAST, NeurIPS 2025)
- 32% of failures propagate non-locally (AgentFail, Sept 2025)
- Supervisor topologies pay token tax (LangChain June 2025)
- Even Devin can't autonomously complete ambiguous projects after 18 months (Cognition Nov 2025)

## Decision

Adopt Codex's pilot plan with these specifics:

1. **v2-lite is shipped** (this PR):
   - `phase`, `persona`, `test_matrix` on Task; `MatrixEntry` + `all_gates()`
   - `tasks.phase`, `tasks.persona` columns (additive migration)
   - `phase`/`persona` emitted on every worker event
   - `scripts/factory/attribution.py` walks `(task_id, trace_id)` for root-cause
   - 14 new tests, 135 total pass

2. **Pilot 3 repos** (next, after operator approval):
   - `source-decay-ledger` (smallest, ai-field-brief utility)
   - `grid-silicon` (hardest, data product)
   - `promotion-vs-pip` (different shape, game cards)
   Each runs 3 task YAMLs: `design-review`, `impl`, `test-matrix`. Operator approves each checkpoint.

3. **No new worker classes** in v2-lite. Multi-persona review is pragmatically scoped to **single-actor multi-lens**: one reviewer (claude_code) reads BOTH `review-architecture.md` and `review-security.md` and emits a combined verdict. Splitting two reviewers across two actors with distinct context windows is a v2-full experiment that requires worker-dispatch changes v2-lite avoids.

   The pilot's "multi-persona caught defects single-reviewer missed" criterion compares: did the dual-lens review surface a security-shaped finding the architecture-lens-alone run would have missed (or vice versa)? Not "did two reviewers in different processes agree?"

4. **Hard kill criteria** (all four must hold to scale to the other 39):
   1. Multi-persona review caught ≥1 defect per pilot that single-reviewer would have missed
   2. Each pilot repo has runnable code + passing unit tests
   3. Total spend ≤ $50 USD; per-repo wall-clock ≤ 4 hrs
   4. Each pilot produced one concrete artifact a human would use

5. **If pilot fails any criterion**: stop, document the failure mode, decide whether to fix v2-lite, drop the v2 plan, or pick a different pilot set.

## Why not full v2

Evidence we already have (deep-research wjv58mvj4):
- No published peer-reviewed result that 5+ personas beat well-prompted single agent on coding tasks once tokens are normalized
- No canonical "test pyramid for agents" exists — we'd be designing in the dark
- CrewAI hierarchical has known type-coercion bugs; LangGraph supervisor pays token tax; SWE-Debate's superiority over single-agent was refuted in our 3-vote verification

Building 7 worker classes before the pilot proves they earn their keep is the exact failure mode Codex flagged.

## What this DEC commits to track

After pilot runs, this file gets evidence per criterion:

### Criterion 1: caught real defects
- [ ] source-decay-ledger: <issue caught by architecture-lens or security-lens that a single reviewer missed>
- [ ] grid-silicon: <ditto>
- [ ] promotion-vs-pip: <ditto>

### Criterion 2: runnable code
- [ ] source-decay-ledger: `python -m source_decay_ledger --week 2026-W25 --dry-run` succeeds; `pytest tests/ -q` passes
- [ ] grid-silicon: `python -m grid_silicon ingest --iso ercot --month 2026-05 --dry-run` succeeds; tests pass
- [ ] promotion-vs-pip: `node scripts/render_cards.js` produces a printable HTML

### Criterion 3: cost + time
- [ ] Total spend (recorded from per-run telemetry): _________ USD (must be ≤ $50)
- [ ] Per-repo wall-clock: source-decay-ledger ___ / grid-silicon ___ / promotion-vs-pip ___ (each ≤ 4 hrs)

### Criterion 4: useful artifact
- [ ] source-decay-ledger: one decay ledger row produced
- [ ] grid-silicon: one ERCOT phantom-vs-real row produced
- [ ] promotion-vs-pip: one printable card sheet produced

## Decision rule

- **All 4 hold** → next DEC opens spec 0019 (factory v2 scale-up to other 39), with the cross-Claude+Codex split + cross-review pass
- **3 of 4 hold** → revise the failing criterion's tooling, re-run that piece of the pilot, re-evaluate
- **≤ 2 of 4 hold** → stop. Document the failure modes. Consider: revert to single-agent factory + manual review, or drop the 39-repo scale-up entirely.

## References

- Spec 0018: `specs/0018-factory-v2-lite-pilot/`
- MAST: https://arxiv.org/abs/2503.13657
- AgentFail: https://arxiv.org/pdf/2509.23735
- LangChain benchmark: https://www.langchain.com/blog/benchmarking-multi-agent-architectures
- Cognition Devin review: https://cognition.ai/blog/devin-annual-performance-review-2025
- Deep-research workflow: transcript `wjv58mvj4`
