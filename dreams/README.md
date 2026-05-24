# dreams

A weekly offline-cognition pass that reads the last N days of runs,
postmortems, eval reports, and audit traces, then proposes promotion
candidates. Dreams name what we learned. Every candidate is
human-gated; no CI job auto-applies a dream output.

## Folder shape

```
dreams/
  README.md           (this file)
  YYYY-WNN/           (one folder per ISO week, lands when the dream job ships)
    report.md         (human-readable narrative)
    output.json       (structured output matching the cross-repo schema)
```

The first weekly folder lands in a later pass; the README reserves
the shape now.

## The eight dream modes

The cross-repo `dream-output.schema.json` defines seven mode strings;
this README documents the eight cognitive modes the dream job
exercises. Mode strings in the schema map onto the cognitive modes
listed here.

1. **memory_consolidation** — read the last week of factory runs and
   roll up recurring observations into a `memory_update` candidate
   against a target memory file.

2. **failure_clustering** — read the last week of failures (test
   failures, gate failures, Maestro flow failures, factory gate
   failures) and cluster by root cause. Each cluster becomes a
   `backlog_item` candidate.

3. **adversarial_simulation** — generate inputs designed to break a
   known-fragile path (a scenario JSON validator, an ADMM solver, a
   participant strategy). Each reproducible breakage becomes a
   `test_generation` candidate.

4. **counterfactual** — replay one past factory run with a different
   prompt, model, or parameter. Compare outputs. Each material delta
   becomes a `backlog_item` or `skill_patch` candidate.

5. **skill_extraction** — read the last N factory runs for patterns
   that recur enough to deserve a name. Each pattern becomes a
   `.agents/skills/<id>/SKILL.md` proposal, surfaced as a
   `skill_patch` candidate or a backlog item to create a new skill.

6. **golden_test_generation** — for spec requirements that lack
   eval coverage (most R-* IDs ship without a golden case), generate
   a golden case. Each becomes a `test_generation` candidate tied to
   a spec_id.

7. **prompt_patch_generation** — for factory worker prompts that drift
   in quality over time, propose a patch. Each becomes a `skill_patch`
   candidate against the owning skill's instructions file.

8. **architecture_drift_detection** — read the spec ledger and the
   actual file tree, flag drift (a spec promises a folder that does
   not exist, or vice-versa). Each becomes a `backlog_item`
   candidate.

## Output shape

The structured `output.json` per week matches
`https://raw.githubusercontent.com/AthenaTheOwl/athena-site/main/ops/schemas/dream-output.schema.json`.

Required top-level fields:

- `id` — `dream-YYYY-WNN`
- `week` — ISO week label
- `generated_at` — ISO 8601 timestamp
- `generated_by` — agent or pipeline identifier
- `scope` — repos scanned, lookback days, sources
- `modes` — which modes ran
- `report_path` — pointer to the markdown narrative
- `candidates` — array of typed promotion candidates

## Promotion candidates

A candidate is one of four typed shapes:

1. `memory_update` — change a memory file.
2. `test_generation` — add a test case to CI.
3. `skill_patch` — change a skill's instructions, scripts, or evals.
4. `backlog_item` — track work that does not fit the other three.

Every candidate carries `evidence` (pointers to the artifacts that
justify the proposal) and `human_review_required` (defaults to true
per the schema). No CI job auto-applies a candidate. The agent
contract `.agents/AGENTS.md` repeats the rule.

## Gates

When the first dream output lands, a future `scripts/validate_dreams.py`
walks `dreams/**/output.json` and validates against the cross-repo
schema. Until then, this README reserves the contract.

## Cadence

Weekly Friday cron, manual `/dream-then-brief` slash command, or
operator-initiated pass. The factory subsystem's run ledger
(`ops/run-ledger.md`) and factory artifacts (`ops/factory-artifacts/`)
are the primary input corpus; releases (`ops/RELEASE_LEDGER.md`)
and QA evidence (`ops/qa-evidence/`) round out the scope.

## Failure modes

- Dream candidates that propose changes to gate scripts themselves:
  treated as a `skill_patch` against the script's owning skill, gated
  by `human_approval` per the promotion_policy.
- Dream candidates that propose changes to the factory orchestrator:
  treated as a `skill_patch` against
  `.agents/skills/run-factory-task/`, gated by human approval.
- Dream output that fails schema validation: the script flags the
  file and the dream run gets re-recorded; no candidate from a
  broken file lands.
- A candidate that lacks evidence: rejected at the schema layer
  (`evidence` is required).
