---
id: test-001-chaos-replay-determinism-under-clock-skew
target_kind: test_generation
spec_id: R-FACTORY-RUN-EVIDENCE-023
test_path: tests/factory/test_replay_determinism_chaos.py
target_path: tests/factory/test_replay_determinism_chaos.py
week: 2026-W22
mode: adversarial_simulation
direction: audit
cost: medium
risk: medium
timeline: next sprint
human_review_required: true
status: proposed
evidence:
  - kind: decision
    ref: decisions/DEC-FACTORY-012-procurement-negotiation-lab-replay-determinism-test.md
  - kind: doc
    ref: tests/factory/test_replay_determinism.py
  - kind: doc
    ref: scripts/replay_run.py
  - kind: run
    ref: ops/run-records/run-7b662d3f68b1.json
---

## idea

Add an adversarial sibling to the W22 determinism fixture at
`tests/factory/test_replay_determinism_chaos.py` that replays
the canonical sample `RERUNS=5` times under controlled chaos:
- monotonic-but-skewed wall-clock between replays (set
  `SOURCE_DATE_EPOCH` to varying values),
- shuffled directory iteration order for any `Path.iterdir`
  calls inside the replay path,
- swapped `PYTHONHASHSEED` per replay.

The three canonical-field hashes MUST still match. If any chaos
axis breaks the determinism contract, the fixture surfaces
exactly which axis (clock / order / hash-seed) caused divergence.

## why

DEC-FACTORY-012 names the three replay-equivalence fields as
"content-derived" and the fixture asserts they hash identically
across `RERUNS`. But the W22 fixture runs all `RERUNS` in the
same process within seconds: clock, hash-seed, and iteration
order are effectively constant. The contract DEC-FACTORY-012
defends is stronger than what the W22 fixture exercises in
practice.
A chaos variant turns "the hashes match when run back-to-back"
into "the hashes match across the axes a real replay weeks
later would see." Catching a hidden time / order / hash
dependency now is cheaper than catching it in a downstream
trace-to-eval consumer next quarter.

## cost

Medium. The fixture reuses the W22 `test_replay_determinism.py`
plumbing (canonical-sample restore, hash whitelist, failure
bundle writer) and adds three monkeypatch wrappers. New
artifact path: `artifacts/failbundles/chaos_*.json`. Estimate
one day to write + one half-day to run the variants and confirm
the W22 sample is chaos-clean.

## risk

Medium. The chaos test could legitimately fail if a hidden
dependency surfaces. That is the point of the test, but the
operator must decide whether a discovered non-determinism gates
the build (red, like the W22 fixture) or just files an issue
(non-blocking nightly suite). Recommendation: ship as a
non-blocking nightly job for two weeks, harvest the failure
modes, then promote to a blocking gate once the W22 sample is
demonstrably chaos-clean across all three axes. The CI cost is
bounded: `RERUNS=5` plus monkeypatch overhead, run once nightly.

## timeline

Next sprint (W23). Local-first: run on a developer machine for
a week before any CI integration. Owner:
`science.proof-gate-runner` for the test design,
`engineering.implementation` for the wiring.

## evidence

- `decisions/DEC-FACTORY-012-procurement-negotiation-lab-replay-determinism-test.md`
  names the three-field whitelist and the determinism contract.
- `tests/factory/test_replay_determinism.py` is the W22 fixture
  this chaos variant builds on.
- `scripts/replay_run.py` is the replay command both fixtures
  invoke.
- `ops/run-records/run-7b662d3f68b1.json` is the canonical sample.

## promotion path

A `single-change` workflow run that adds the chaos fixture as a
non-CI-wired local test. Operator decision required before any
CI integration. Gates: `pytest tests/factory/` (the new file
runs locally green on the W22 sample), `voice_lint`, the
universal gates.
