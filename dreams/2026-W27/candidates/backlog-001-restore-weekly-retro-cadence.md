---
id: backlog-001-restore-weekly-retro-cadence
target_kind: backlog_item
target_path: dreams/README.md
week: 2026-W27
mode: architecture_drift_detection
direction: restore
cost: small
risk: low
timeline: before next Friday pass
human_review_required: true
status: proposed
evidence:
  - kind: observation
    ref: "pre-backfill dreams/ contained only 2026-W21 and 2026-W22 on 2026-07-05"
  - kind: doc
    ref: dreams/README.md#cadence
  - kind: doc
    ref: dreams/README.md#published
  - kind: commit
    ref: "f45b5ef sdk: add explainable mechanism selector"
  - kind: commit
    ref: "b400ca2 merge: cross-scenario mechanism benchmark scorecard (backlog Now #12)"
systems_map: "The cadence claim, folder registry, and Published table need a small registry discipline so retros do not silently disappear."
transferable_principle: "A recurring learning ritual needs an artifact-level check, not just prose that says it runs weekly."
falsification_test: "If the next Friday pass creates the new week folder and README row without manual recovery, this backlog item can close."
adoption_ladder:
  minimum_viable: "Add the missing rows and make the next pass explicitly check the prior week exists."
  mid_adoption: "Add a lightweight docs-safe check that flags gaps between the current ISO week and dreams/ folders."
  full_adoption: "Promote a typed registry or CI check that keeps cadence prose, folders, and Published rows in sync."
  monitoring_signals:
    - "A Friday passes without a dreams/YYYY-WNN folder."
    - "Published table omits a folder that exists on disk."
    - "Multiple backfilled weeks share the same generated_at date."
---

## idea

Add a small cadence check so weekly dream retros cannot lapse for
five weeks while the README still claims a weekly Friday pass.

## why

Before this backfill, the repository had W21 and W22 dream folders,
but no W23, W24, W25, W26, or W27 folders. The Published table listed
only W21. That made the docs claim stronger than the artifact trail.

The lapse also hid a real product story. W23 shipped weighted-Nash,
MPC, scenario, and property-test work. W24 had no
commits. W25 and W26 were mostly factory-control-plane work. W27
finally brought product momentum back with `f45b5ef` and the benchmark
scorecard merge `b400ca2`. A weekly retrospective exists to preserve
that shape while it is fresh.

## cost

Small. The minimum viable action is procedural: the next weekly pass
checks that the previous ISO week has `report.md`, `meta.yaml`, and a
Published row. A later typed registry or test can make the check
automatic if this lapse repeats.

## risk

Low. The risk is adding a noisy gate that fails during intentional
pauses. Check for an explicit skipped-week record and allow weeks with
zero candidates.

## promotion path

Route as a backlog item for the next docs/process pass. Any automated
check should stay docs-safe and must not write into `ops/handoffs/` or
run `tests/factory`.
