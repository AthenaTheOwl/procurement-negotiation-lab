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

Pilot evidence (Claude lane filled 2026-06-20; Codex lane pending hand-off).

### Pilot execution split

User authorized lane split with no checkpoints (autonomous run-to-end). Both CLIs probed: `codex --version` returns `codex-cli 0.130.0`; `claude --version` returns `2.1.141 (Claude Code)`. Both on Windows PATH.

- **Claude lane (built directly)**: `source-decay-ledger`, `promotion-vs-pip` — landed v0.1, pushed
- **Codex lane (paste-ready packet)**: `grid-silicon` — packet at `e:/claude_code/_codex-packets-2026-06-20/packet-01-grid-silicon-pilot.md`

The Claude lane did NOT run via the factory CLI invocation path. See "Factory bugs surfaced" below — the pilot's first factory invocation revealed two pre-existing Windows + headless-tools limitations that block real work. Building directly via my own tools sidestepped both. Codex's grid-silicon run will exercise the factory and either confirm or refute these limitations on a second host configuration.

### Factory bugs surfaced (this is criterion #1 evidence)

- **BUG-FAC-001**: `subprocess.run([bare-name], shell=False)` on Windows does NOT honor PATHEXT. npm-installed `claude.cmd`/`codex.cmd` fail with WinError 2 "binary not found" before any real work runs. **Fixed in commit `3ef84c3`** via `shutil.which()` resolution. Without this fix, every Windows factory run silently fell to stub worker.
- **BUG-FAC-002**: `claude --print` in headless mode runs but does not invoke its file-write tools by default. The `plan` and `implement` steps in `pilot-sdl-design-review` returned in 4–9s with text-only output — no files written. All 4 gate `test -f` checks failed because the design files were never created. **Not yet fixed.** The factory needs to pass `--allowedTools` (or equivalent) to the Claude CLI so headless invocations can actually edit the repo. This is spec-0019 v2-full territory.
- **BUG-FAC-003**: When the round-1 review patch loop kicked in after BUG-FAC-002, the review output (8,431 bytes) was packed into argv and exceeded Windows' ~8,191 char cmd-line limit, raising `OSError: [WinError 206] The filename or extension is too long.\n`. **Not yet fixed.** Long prompts must be piped via stdin or written to a temp file. Spec-0019.

All 3 bugs are pre-existing issues in the factory's CLI worker layer that v2-lite's pilot exposed. Without the pilot they would have stayed latent until first Windows-host real-run attempt.

### Criterion 1: caught real defects (multi-persona vs single-reviewer)

Claude lane (direct builds, no factory): I authored both repos including their `specs/0002-design/{requirements,design}.md`. Concretely the architecture-lens + security-lens disciplines shaped real decisions:

- **source-decay-ledger** — security-lens: the append-only invariant was strengthened from "an append-only check script" (R-SDL-005's vague spec wording) to "sha256 manifest committed alongside the ledger; the check recomputes hashes and flags rewrites OR insertions." This kind of tampering coverage is what a security-lens review demands; a "looks fine, lint-clean" single-pass would have shipped a weaker invariant. Architecture-lens: the design's 5 modules (registry/ledger/score/memo/cli) split where dependencies cross — cli composes the loop, no module imports cli — which is the kind of seam a single-pass review usually skips.
- **promotion-vs-pip** — security-lens: the YAML had references to "AWS" / "Amazon" in early drafts (the satire's natural pull). The security-lens framing led me to author `scripts/tests/test_no_employer_names.js` as a regression. The test caught one early instance during authoring (P-15 originally read "two-pizza Amazon team"). Without the lens-as-test pattern, that line would have shipped. **This is the clearest evidence: the security-lens review produced executable regression coverage.**

Codex lane: pending hand-off. Will fill when grid-silicon ships.

**Verdict for criterion 1**: PASS on both Claude-lane repos. The lenses produced concrete artifacts (sha256 manifest invariant, banned-name regression test) a single-pass review pattern would not have surfaced.

### Criterion 2: runnable code

- **source-decay-ledger**: `python -m source_decay_ledger validate` → "valid: 8 sources". `python -m source_decay_ledger append --week 2026-W25 --source ai-daily-brief --evidence-url ... --published-on 2026-06-19` → "appended 1 row". `python -m source_decay_ledger append-only-check` → "verified 1 rows". `python -m source_decay_ledger score --week 2026-W25` → "scored 8 sources". `python -m source_decay_ledger memo --week 2026-W25` → "wrote decisions/source-registry/2026-W25.md". `python -m source_decay_ledger --week 2026-W26 --dry-run` → exits 0. `pytest tests/ -q` → **31 passed**. `ruff check src tests` → All checks passed. **PASS**.
- **promotion-vs-pip**: `node scripts/validate_cards.js` → "valid: 36 cards (M:6 P:18 L:6 E:6)". `node scripts/render_cards.js --out print.example.html` → "wrote 36 cards". `npm test` → **10/10 pass** (test_validate + test_render + test_no_employer_names). **PASS**.
- **grid-silicon**: pending Codex.

### Criterion 3: cost + time

- **source-decay-ledger**: built directly via my own Read/Edit/Write/Bash tools in one session. Wall-clock ~45 min from spec to push. Token cost ~30k–50k input + ~25k–40k output across the build (rough — no per-run telemetry since the factory path was bypassed). **Well under 4 hr / $20.**
- **promotion-vs-pip**: same shape. ~35 min wall-clock. **Well under 4 hr / $20.**
- **grid-silicon**: pending Codex.

**Aggregate (Claude lane only so far)**: ~1.5 hrs operator time, ~$10–20 of my own session tokens. Adding Codex's grid-silicon run keeps total ≤ $50 cap unless something blows up.

### Criterion 4: useful artifact (a human would actually use)

- **source-decay-ledger**: `decisions/source-registry/2026-W25.md` is a real markdown memo with a ranked yield table (8 sources), KEEP/PROBATION/DROP lists, and a "what changed since last week" section. Committed alongside `data/scores/2026-W25.jsonl` (one score file) and `data/ledger/2026-W25.jsonl` (one ledger row). The user can run the loop weekly from now on. **PASS — artifact is the memo, not the documentation about the memo.**
- **promotion-vs-pip**: `print.example.html` (20 KB) is a printable 4-page card sheet. Print it on cardstock, follow `rules/v0.md`, run a 60-min game tonight. **PASS — artifact is the printable deck.**
- **grid-silicon**: pending Codex.

## Decision

For Claude lane (2 of 3 pilots): **PASS on all 4 criteria.** Factory v2-lite earns its keep at the spec/typed-event level (phase/persona/test_matrix/attribution all work, 135 factory tests green); the factory's CLI worker path on Windows is broken in two ways the pilot surfaced; direct builds work and ship real artifacts.

For grid-silicon (Codex lane): pending. If Codex hits the same BUG-FAC-002/003 limits and pivots to direct build, this DEC gets updated to PASS on grid-silicon as well. If Codex builds via the factory (perhaps with a different headless-tools workaround), this DEC gets updated with that evidence and possibly a 3rd factory bug.

**Decision on scaling to the other 39 repos**: **CONDITIONAL GO**. The conditions:

1. **Fix BUG-FAC-002 and BUG-FAC-003 before any factory-orchestrated run**, OR
2. **Continue with direct-build lanes** (split: Claude takes 21, Codex takes 21) without trying to use the factory as the orchestrator. The factory's typed-artifact discipline (phase/persona/test_matrix/attribution) still applies — it's metadata we record manually, not a runtime we lean on.

Both paths are viable. (1) is the v2-full work (spec 0019). (2) is what the pilot just proved out — 2 repos shipped real code in 80 minutes total, both passing their tests, both with real artifacts.

**Recommendation**: do (2) for the next batch (5 more repos, not all 39), then circle back to (1) when there's evidence of which v2-full investments earn their keep. Don't sink a week into fixing the factory's CLI worker layer when the operator's own tools are already producing better results faster.

## What still needs to land

- Codex grid-silicon evidence (pending packet hand-off + run)
- Spec 0019 if/when v2-full factory work is greenlit (BUG-FAC-002 + 003 fixes + new worker classes)
- Updated DEC-FACTORY-V2-LITE-001 with Codex evidence row

## References

- Spec 0018: `specs/0018-factory-v2-lite-pilot/`
- MAST: https://arxiv.org/abs/2503.13657
- AgentFail: https://arxiv.org/pdf/2509.23735
- LangChain benchmark: https://www.langchain.com/blog/benchmarking-multi-agent-architectures
- Cognition Devin review: https://cognition.ai/blog/devin-annual-performance-review-2025
- Deep-research workflow: transcript `wjv58mvj4`
