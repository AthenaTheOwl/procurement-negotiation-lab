---
id: DEC-FACTORY-003-bounded-dual-review-conservative-aggregation
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-003
date: 2026-05-24
status: approved
reversible: true
decision: |
  Support multiple reviewers per task via `review.reviewers` in the
  task YAML. Run every reviewer once per round in
  `scripts/factory/pipeline.py`, emit one `review.done` event per
  reviewer (tied to the per-run `trace_id` and the round index), and
  aggregate conservatively: any REJECT rejects the round, any
  NEEDS_PATCH forces a patch round, only an all-CLEAN aggregate
  proceeds. Cap patch rounds at `review.max_patch_rounds`; on cap
  hit, mark the task `blocked` and surface to a human.
alternatives:
  - label: single reviewer per task
    rejected_because: |
      One reviewer is one set of priors. The factory already routes
      claude_code and codex side by side for plan and implement work,
      and the same dual surface for review catches blind spots one
      model holds and the other does not. Single-reviewer mode stays
      available by listing one reviewer in the YAML; the multi-reviewer
      path is the additive option.
  - label: majority vote across reviewers
    rejected_because: |
      Majority vote treats a REJECT and a CLEAN as cancelable opposites
      and lets two over-confident reviewers outvote a real defect. The
      conservative aggregation rule (any REJECT rejects) keeps the
      reviewer with the strongest objection in charge of the round,
      which matches how human dual review works in this repo.
  - label: unbounded debate until reviewers agree
    rejected_because: |
      A retry loop with no cap can spin indefinitely on a model
      disagreement that has no resolution path. The
      `max_patch_rounds` cap turns the disagreement into a `blocked`
      task that a human triages, which is the right escalation surface.
rationale: |
  Conservative aggregation keeps the reviewer with the strongest
  objection in charge of the round, which matches how human dual
  review operates in this repo. The per-reviewer `review.done`
  events make it easy to inspect which reviewer flagged what and to
  attribute the aggregate outcome back to a specific reviewer. The
  `max_patch_rounds` cap converts a stalled disagreement into a
  `blocked` task that a human triages.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: doc
    ref: scripts/factory/pipeline.py
  - kind: doc
    ref: scripts/factory/task.py
  - kind: doc
    ref: scripts/factory/spec_tasks.py
rollback: |
  Reduce `ReviewSpec.reviewers` to a single-element list in
  `scripts/factory/task.py` and remove the `_run_reviewers` and
  `_combined_review_status` helpers in `scripts/factory/pipeline.py`,
  replacing them with a single-reviewer call. Existing task YAML
  keeps loading because `reviewer` (singular) is still the
  back-compat default; only the multi-reviewer aggregation path goes
  away.
owner: platform
---

## decision

Support multiple reviewers per task via `review.reviewers` in the task
YAML. Run every reviewer once per round in
`scripts/factory/pipeline.py`, emit one `review.done` event per
reviewer (tied to the per-run `trace_id` and the round index), and
aggregate conservatively: any REJECT rejects the round, any
NEEDS_PATCH forces a patch round, only an all-CLEAN aggregate
proceeds. Cap patch rounds at `review.max_patch_rounds`; on cap hit,
mark the task `blocked` and surface to a human.

## alternatives

- Single reviewer per task — one set of priors; dual review catches
  blind spots a single model holds.
- Majority vote — lets two over-confident reviewers outvote a real
  defect.
- Unbounded debate until reviewers agree — spins indefinitely on a
  no-resolution disagreement.

## rationale

Conservative aggregation keeps the reviewer with the strongest
objection in charge of the round, which matches how human dual review
operates in this repo. The per-reviewer `review.done` events
make it easy to inspect which reviewer flagged what and to attribute
the aggregate outcome back to a specific reviewer. The
`max_patch_rounds` cap converts a stalled disagreement into a
`blocked` task that a human triages.

## evidence

- `specs/0009-factory-dev-control-plane/requirements.md` — R-FACTORY-003
  acceptance bullets.
- `scripts/factory/pipeline.py` — `_run_reviewers`,
  `_combined_review_status`, and the `max_patch_rounds` cap in
  `_run_implement_loop`.
- `scripts/factory/task.py` — `ReviewSpec.reviewers` and the YAML
  loader path that normalizes singular and plural shapes.

## rollback

Reduce `ReviewSpec.reviewers` to a single-element list in
`scripts/factory/task.py` and remove `_run_reviewers` and
`_combined_review_status` in `scripts/factory/pipeline.py`, replacing
them with a single-reviewer call. Existing task YAML keeps loading
because `reviewer` (singular) is still the back-compat default; only
the multi-reviewer aggregation path goes away.
