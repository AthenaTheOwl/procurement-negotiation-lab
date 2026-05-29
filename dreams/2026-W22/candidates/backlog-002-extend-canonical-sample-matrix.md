---
id: backlog-002-extend-canonical-sample-matrix
target_kind: backlog_item
target_path: .github/workflows/run-evidence-gates.yml
week: 2026-W22
mode: architecture_drift_detection
direction: extend
cost: medium
risk: medium
timeline: next month
human_review_required: true
status: proposed
evidence:
  - kind: decision
    ref: decisions/DEC-FACTORY-011-procurement-negotiation-lab-ci-enforces-run-evidence-chain.md
  - kind: doc
    ref: .github/workflows/run-evidence-gates.yml
  - kind: run
    ref: ops/run-records/run-7b662d3f68b1.json
  - kind: artifact
    ref: ops/event-ledger/run-7b662d3f68b1.jsonl
---

## idea

Extend the canonical-sample CI matrix in
`.github/workflows/run-evidence-gates.yml` from one sample
(`run-7b662d3f68b1`) to N samples covering the distinct pipeline
shapes the lab can emit: dry-run stub, checkpoint-paused/resumed,
reject-on-review, and (later) a real non-stub worker run. Each
matrix slot replays + validates its own canonical sample under
the existing three product gates.

## why

DEC-FACTORY-011 explicitly notes "the workflow has only one
matrix slot because the lab carries one finalized sample at a
time." That is the right call for the W22 landing but it bakes in
a one-shape-fits-all assumption. The factory's
checkpoint-pause/resume contract (DEC-FACTORY-002 + DEC-FACTORY-003)
is exercised by tests but not by the run-evidence chain: a
silent regression in the checkpoint-resume path would not show
up in `replay-smoke` because the canonical sample is a dry-run
without checkpoints. Extending the matrix turns a class of
regressions from "tests pass, ledger looks wrong" into "the
specific sample shape fails CI loudly."

## cost

Medium. Each new canonical sample needs (1) a generated Run
record + event ledger pair under `ops/`, (2) a finalize-helper
run to flip `sandbox_image_ref`, (3) a matrix slot in the
workflow, and (4) a test that the replay-determinism fixture
covers each sample. Estimate two days for the first new sample,
half a day per additional sample once the per-sample factoring
is in place.

## risk

Medium. The risk is matrix bloat: every sample shape pays
`RERUNS * replay_time` in CI and the determinism fixture
already pays it once per slot. With four samples and `RERUNS=3`
the determinism job runs twelve replays per push. Mitigation:
trim `RERUNS` to 2 for the additional samples (the canonical
slot keeps `RERUNS=3` as the primary guard), or move the
extended matrix to a nightly workflow on a cron schedule
instead of running on every PR. Either approach keeps the
per-PR contract crisp while extending coverage.

## timeline

Next month (W25-W26). Needs the engineering role to factor the
per-sample plumbing first; the W23-W24 reduce work should land
before this so the canonical-sample helpers are stable.

## evidence

- `decisions/DEC-FACTORY-011-procurement-negotiation-lab-ci-enforces-run-evidence-chain.md`
  names the single-slot decision and the rationale.
- `.github/workflows/run-evidence-gates.yml` carries the current
  matrix shape.
- `ops/run-records/run-7b662d3f68b1.json` is the W22 canonical
  sample whose plumbing the additional samples will reuse.

## promotion path

A multi-step workflow: (1) factor per-sample plumbing into a
reusable composite action under `.github/actions/`, (2) generate
the additional canonical samples, (3) write the new DEC, (4)
extend the matrix. Owner: `engineering.implementation` +
`operations.release-manager` for the CI work.
