---
id: backlog-001-retire-legacy-path-at-sha-fallback
target_kind: backlog_item
target_path: scripts/replay_run.py
week: 2026-W22
mode: architecture_drift_detection
direction: reduce
cost: small
risk: low
timeline: next sprint
human_review_required: true
status: proposed
evidence:
  - kind: decision
    ref: decisions/DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration.md
  - kind: doc
    ref: scripts/replay_run.py
  - kind: doc
    ref: scripts/validate_run_evidence.py
  - kind: run
    ref: ops/run-records/run-7b662d3f68b1.json
---

## idea

Retire the legacy `<path>@<sha>` fallback in
`scripts/replay_run.py::_extract_recorded_sha` and the matching
branch in `scripts/validate_run_evidence.py::resolve_uri`. The
lab now carries exactly one Run record and it uses the
`repo://<repo>@<sha>/<path>` URI form; the legacy branch is dead
weight that exists only because the DEC-FACTORY-010 migration
window kept it open.

## why

DEC-FACTORY-010 named the migration window explicitly and the
consumer-side `resolve_uri` helpers carry a fallback branch that
no checked-in record exercises. Carrying a dead branch in two
load-bearing scripts is exactly the kind of drift that
`architecture_drift_detection` is supposed to catch: the spec
says "portable URIs" but the code still accepts the pre-migration
shape. Retiring the fallback shrinks the surface area of two
scripts that already carry replay-determinism weight, and it
makes the URI contract one-way (emitter writes `repo://`,
consumer expects `repo://`, full stop). The reduction earns a
simpler invariant.

## cost

Small. Two `if uri.startswith("repo://")` branches collapse to
unconditional `repo://` parsing; both call sites have unit-test
coverage already. Update the docstring in
`scripts/validate_run_evidence.py::resolve_uri` and the
DEC-FACTORY-010 follow-up DEC notes the retirement. Total: one
commit, one DEC entry, two files touched.

## risk

Low if the lab is the only producer; medium if a sibling repo's
ledger ever lands here with the legacy form. Mitigation: pre-flight
grep across `ops/run-records/` and `ops/event-ledger/` for any
`<path>@<sha>` shapes before retiring, and the DEC-FACTORY-010
amend records the cutover. Worst-case rollback: re-add the
fallback (the deleted lines are five lines per script).

## timeline

Next sprint (W23). One commit + one DEC amend. Owner:
`engineering.implementation` via the `single-change` workflow.

## evidence

- `decisions/DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration.md`
  names the migration window and the fallback.
- `scripts/replay_run.py::_extract_recorded_sha` and
  `scripts/validate_run_evidence.py::resolve_uri` carry the
  branches to be retired.
- `ops/run-records/run-7b662d3f68b1.json` is the canonical sample
  that uses only the `repo://` form.

## promotion path

A `single-change` workflow run plus a follow-up DEC
(`DEC-FACTORY-013-retire-legacy-uri-fallback`). Gates:
`pytest tests/factory/` (must stay green),
`validate_run_evidence.py`, `replay_run.py` on the canonical
sample, the universal gates.
