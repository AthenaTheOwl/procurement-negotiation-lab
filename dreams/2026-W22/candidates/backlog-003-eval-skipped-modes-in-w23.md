---
id: backlog-003-eval-skipped-modes-in-w23
target_kind: backlog_item
target_path: dreams/2026-W23/
week: 2026-W22
mode: meta_planning
direction: extend
cost: small
risk: low
timeline: next sprint
human_review_required: true
status: proposed
evidence:
  - kind: doc
    ref: dreams/README.md
  - kind: doc
    ref: dreams/2026-W21/meta.yaml
  - kind: doc
    ref: dreams/2026-W22/meta.yaml
---

## idea

In the W23 weekly pass, run two of the five skipped modes from
the W22 `meta.yaml`: `counterfactual` (replay the canonical
sample against a non-stub worker variant) and
`failure_clustering` (cluster any `run-evidence-gates.yml` red
runs that W23 produces). Even a single counterfactual gives the
lab a comparison datum against the stub-worker baseline; even
zero clustered failures is a useful signal that the gate chain
is stable.

## why

The W22 pass ran three of eight modes. The skipped-modes list
in `meta.yaml` carries explicit "reopen when" preconditions, but
the lab's dream cadence has yet to exercise
`counterfactual` or `failure_clustering` yet in any week. The
risk is that the modes stay frozen as documented-but-unrun. Two
runs across the next two weeks (one counterfactual in W23, one
failure-clustering in W24 once data accumulates) close the gap
between mode taxonomy and mode practice.

## cost

Small. Each mode is a single-pass execution that the
dream-orchestrator role already supports. The counterfactual
needs one non-stub worker invocation (under a budget cap); the
failure-clustering needs at least two red CI runs to cluster.

## risk

Low. The counterfactual could surface a model-dependence in the
pipeline that the stub worker hides; that is information, not
failure. The failure-clustering could find that the gate chain
is too stable to cluster anything; that is also information.

## timeline

Next sprint (W23) for the counterfactual; next month (W24-W25)
for the first failure-clustering once data exists.

## evidence

- `dreams/README.md` documents the eight modes and the eight
  cognitive modes the dream job is supposed to exercise.
- `dreams/2026-W21/meta.yaml` records three modes run in W21.
- `dreams/2026-W22/meta.yaml` records three modes run in W22.

## promotion path

The dream-orchestrator role's W23 pass picks up this candidate
in the meta-planning step. No CI or code change. The "promotion"
is the operator nodding at the W23 pass plan before the run
starts.
