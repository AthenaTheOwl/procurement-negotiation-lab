# dream report 2026-W21

First weekly retrospective from the `learning.dream-orchestrator`
role. Lookback window: 2026-05-18 through 2026-05-24 inclusive.

## Scope

Sources scanned:

- `git log --since="2026-05-18"` — 30 commits on `main`.
- `ops/RELEASE_LEDGER.md` — 6 entries dated 2026-05-21 and
  2026-05-22 covering Levels, sandbox guardrails, EAS profiles,
  Maestro coverage, the Gradle blocker, and the spec 0012 ledger.
- `ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md` — the
  one shipped release entry with hosted CI run URLs and Tier 2
  failure attribution.
- `ops/run-ledger.md` — historical factory runs (latest row is the
  2026-05-14 spec 0009 pass).
- `ops/factory-tasks/` and `ops/factory-artifacts/` — two checked-in
  example task YAMLs plus five artifact directories from prior dry
  and dual-review runs.
- `decisions/` — DEC-CDCP-001, DEC-MOBREL-001..005, and the
  DEC-FACTORY-001..005 backfill that landed in the same agent run
  as this dream pass.
- `ops/event-log/2026-05-24.jsonl` — 12 events covering the CDCP
  install, the MOBREL backfill, and the FACTORY backfill.

Six Python gates run on every push (`spec_check`, `voice_lint`,
`validate_decisions`, `validate_roles`, `validate_tools`,
`validate_policies`). The two backfill commits (`1749277` and
`7500aa7`) both passed all six locally before push.

## Modes run

This v1 pass runs three of the eight modes documented in
`dreams/README.md`:

1. **memory_consolidation** — three candidates that should become
   persistent `.agents/AGENTS.md` notes for the next agent loop.
2. **skill_extraction** — zero candidates. No pattern recurred at
   least three times in the week's commits. The
   factory-task-from-spec pattern (`scripts/factory/spec_tasks.py`)
   has been used in spec 0009 only, so it does not yet earn its
   own skill graduation.
3. **eval_generation** — two regression-test candidates that pin
   load-bearing behaviors against accidental removal.

Skipped modes (each with a "reopen when" precondition):

- **failure_clustering** — reopen when there are at least two
  hosted-CI failure runs whose failure modes can be clustered. The
  week has exactly one failed Maestro run mode (Gradle
  `assembleDebug`), already captured in
  `ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md`.
  Clustering needs more than one cluster member.
- **adversarial_simulation** — reopen when a known-fragile path
  (scenario JSON validator, ADMM solver, participant strategy) has
  a recent green-tests-but-real-defect run. The week's tests are
  all green; there is no fragile path that the existing 92 pytest
  + 449 vitest cases failed to catch.
- **counterfactual** — reopen when a past factory run has an
  artifact pair (plan + review) interesting enough to replay with
  a different prompt or model. The five archived runs under
  `ops/factory-artifacts/` are dry-run stubs; replaying them with
  a different model would produce the same stub output.
- **architecture_drift_detection** — reopen when a spec promises a
  folder the file tree does not provide or vice versa. The week's
  `spec_check.py` runs clean across all 13 active specs.
- **prompt_patch_generation** — reopen when a factory worker prompt
  in `scripts/factory/pipeline.py` has produced a drifted output
  in a real (non-stub) run. The week's prompts are unchanged and
  every checked-in artifact came from a stub worker.

## Candidate index

| File | Mode | Target |
|---|---|---|
| `candidates/memory-001-hosted-mobile-gradle-brittleness.md` | memory_consolidation | `.agents/AGENTS.md` |
| `candidates/memory-002-factory-worktree-isolation-as-convention.md` | memory_consolidation | `.agents/AGENTS.md` |
| `candidates/memory-003-cdcp-install-needs-stash-restore.md` | memory_consolidation | `.agents/AGENTS.md` |
| `candidates/eval-001-eas-three-profile-shape-pin.md` | eval_generation | `apps/mobile/__tests__/eas-profile.test.ts` |
| `candidates/eval-002-factory-checkpoint-interrupt-pin.md` | eval_generation | `tests/factory/test_checkpoint_interrupts.py` |

Total: 5 candidates across 2 modes.

## Findings

### memory_consolidation

The week shows three patterns the next agent loop should walk in
with already loaded:

1. **Hosted Android emulator + Gradle native build is brittle.** Two
   commits this week (`93d5190`, `646d989`) record back-to-back
   Maestro failures that never reached the flow runner because
   prebuild assets were missing, then `expo-module-gradle-plugin`
   resolution broke. The next mobile change should expect a
   Gradle-side surprise and budget time for it.

2. **The factory's per-task git worktree pattern prevents
   collisions.** The DEC-FACTORY-001..005 backfill that landed in
   commit `7500aa7` evidences this pattern in
   `scripts/factory/worktree.py`. The CDCP and MOBREL backfill
   commits the day before (`3cd9314`, `1749277`) ran without a
   worktree because they were not factory tasks, but they touched
   the same files repeatedly. Adopting the worktree convention for
   any multi-step agent run on this repo would prevent the
   "agent A and agent B race on `decisions/`" failure mode.

3. **A CDCP-style install needs a stash-and-restore for in-flight
   WIP.** The CDCP install commit `3cd9314` landed on a clean tree.
   If it had landed on a tree with uncommitted work, the install
   would have either committed the WIP alongside the install or
   refused to run. Future agent-install workflows should make the
   stash-and-restore step explicit.

### skill_extraction

Zero candidates. The two checked-in factory tasks
(`example-rename-fc-count.yaml`, `example-with-checkpoint.yaml`)
plus the spec 0009 expansion path show two distinct uses of the
spec-task-expansion pattern. Three uses is the bar; the pattern
needs one more real-world use before it earns a
`.agents/skills/factory-task-from-spec/SKILL.md` of its own.

### eval_generation

The week landed two decisions whose shape is load-bearing and would
not survive an accidental refactor cleanly:

1. **The EAS three-profile shape** (DEC-MOBREL-001). A test that
   reads `apps/mobile/eas.json` and asserts `development`,
   `preview`, and `production` profiles with the right channels and
   `buildType` values would catch a one-line collapse before it
   ships.

2. **The factory checkpoint-interrupt behavior** (covered by
   DEC-FACTORY-002 and DEC-FACTORY-003). The pause/resume pattern
   in `scripts/factory/pipeline.py` is exercised by existing tests,
   but the specific "checkpoint set in YAML pauses the pipeline at
   the named step and resume picks up correctly" path could be
   tightened to also assert the per-checkpoint event names. A
   regression here would silently turn the factory into a
   no-checkpoints pipeline.

## Promotion path

All five candidates carry `human_review_required: true`. The
operator triages and decides which to route through the
`single-change` workflow under `.agents/workflows/single-change.yaml`.
No candidate auto-applies; the `learning.dream-orchestrator` role's
forbidden-actions list spells out the rule.

## Next pass

The next weekly pass (2026-W22) should:

- Re-evaluate the four skipped modes against the W22 corpus.
- Promote at least one of the memory candidates from this week into
  `.agents/AGENTS.md` before W22 closes, so memory_consolidation has
  a baseline shape to follow.
- Run `failure_clustering` once Tier 2 produces a second hosted-CI
  failure run with a different root cause.

## Promotion record

All five W21 candidates were promoted on 2026-05-24.

| Candidate | Mode | Landed at |
|---|---|---|
| `candidates/memory-001-hosted-mobile-gradle-brittleness.md` | memory_consolidation | `.agents/AGENTS.md` (Lessons promoted from weekly dreams) |
| `candidates/memory-002-factory-worktree-isolation-as-convention.md` | memory_consolidation | `.agents/AGENTS.md` (Lessons promoted from weekly dreams) |
| `candidates/memory-003-cdcp-install-needs-stash-restore.md` | memory_consolidation | `.agents/AGENTS.md` (Lessons promoted from weekly dreams) |
| `candidates/eval-001-eas-three-profile-shape-pin.md` | eval_generation | `apps/mobile/test/eas-profiles.shape.test.ts` |
| `candidates/eval-002-factory-checkpoint-interrupt-pin.md` | eval_generation | `tests/factory/test_checkpoint_interrupts.py` |

Each candidate file's front-matter carries `status: promoted` and
`promotion_date: 2026-05-24`. The two eval tests pass on first run
against the W21 codebase. The three memory entries live under a new
`## Lessons promoted from weekly dreams` section in `.agents/AGENTS.md`.
