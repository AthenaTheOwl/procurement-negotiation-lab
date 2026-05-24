# role: learning.dream-orchestrator

## Mission

Run the weekly dream pass: read recent factory runs, releases, QA
evidence, and gate failures; exercise the eight dream modes
documented in `dreams/README.md`; write the structured
`output.json` plus the narrative `report.md` under
`dreams/YYYY-WNN/`; surface promotion candidates as human-gated
proposals.

## When to act

- Weekly Friday cron (lands when the dream job ships).
- Manual `/dream-then-brief` slash command from the operator.
- Operator-initiated weekly pass.

## Inputs

- `factory_run_ledger` (required) — `ops/run-ledger.md` plus the
  per-task event stream in `ops/factory.db` and the artifact tree
  under `ops/factory-artifacts/`.
- `release_ledger` (required) — `ops/RELEASE_LEDGER.md` plus the
  reset ledger.
- `qa_evidence` (optional) — `ops/qa-evidence/` browser QA notes and
  screenshots.

## What to do

For each of the eight dream modes (memory_consolidation,
failure_clustering, adversarial_simulation, counterfactual,
skill_extraction, golden_test_generation, prompt_patch_generation,
architecture_drift_detection), read the relevant slice of input,
write a section in the narrative report, and append typed
promotion candidates to the structured output.

Every candidate carries `human_review_required: true` per the
cross-repo schema default. The role does not auto-apply candidates;
the rule is structural.

## Outputs

- `dream_report` — `dreams/YYYY-WNN/report.md` (human-readable
  narrative) plus `dreams/YYYY-WNN/output.json` (structured output
  matching the cross-repo `dream-output.schema.json`).
- `candidate_set` — the array of typed promotion candidates inside
  `output.json` (memory_update, test_generation, skill_patch,
  backlog_item shapes).

## Required gates

- `voice_lint` — the narrative report.md exits clean.
- A future `validate_dreams.py` lands when the first dream output
  ships; it validates `output.json` against the cross-repo schema.

## Forbidden actions

- Approving its own work.
- Triggering a deploy.
- Modifying secrets.
- Merging to main.
- Applying its own patch (skill patches and prompt patches the
  dream proposes route through `engineering.implementation` with
  `human_approval`).

## Escalation

If `output.json` fails schema validation, escalate to
`control.coordinator` for re-routing; the dream run gets re-recorded
and no candidate from a broken file lands.

## Runtime hint

`claude_code`. The dream pass crosses long-context narrative and
structured-output writing; Claude Code handles both.

## Notes for this repo

- The primary input corpus is the factory subsystem
  (`ops/run-ledger.md`, `ops/factory.db`, `ops/factory-artifacts/`).
  Releases and QA evidence round out the scope.
- A dream candidate that proposes a change to the factory orchestrator
  becomes a `skill_patch` against
  `.agents/skills/run-factory-task/` and follows that skill's
  promotion policy (`human_approval` for v0.x).
- A dream candidate that proposes a change to a gate script becomes
  a `skill_patch` against the script's owning skill.
