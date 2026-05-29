---
id: backlog-004-cross-link-trace-to-eval-packet-fixture
target_kind: backlog_item
target_path: ops/qa-evidence/cross-link-trace-to-eval-packet.md
week: 2026-W22
mode: architecture_drift_detection
direction: cross_link
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
  - kind: artifact
    ref: ops/event-ledger/run-7b662d3f68b1.jsonl
---

## idea

Land a paired fixture across procurement-negotiation-lab,
trace-to-eval-harness, and athena-site so the canonical sample
`run-7b662d3f68b1` becomes a shared portfolio asset. Concretely:

1. Pin the SHA of the canonical sample (`run-7b662d3f68b1`) plus
   its sandbox SHA in a new portfolio-level reference doc under
   athena-site at `ops/refs/canonical-samples.md`.
2. Add a trace-to-eval-harness regression test that loads the
   procurement-negotiation-lab canonical sample (via a sibling
   checkout) and asserts the packet shape it generates today,
   pinning the consumer-side contract against unannounced
   producer drift.
3. Cross-reference both from procurement-negotiation-lab in a
   short `ops/qa-evidence/cross-link-trace-to-eval-packet.md`
   note so a sample-touching change here surfaces the
   downstream consumer immediately.

## why

DEC-FACTORY-011 wires the canonical sample into a sibling
trace-to-eval-harness checkout in `run-evidence-gates.yml`, but
the cross-repo relationship is currently one-way: this lab's CI
fails if trace-to-eval-harness's packet validator rejects the
sample. The reverse (trace-to-eval-harness's CI flagging if its
own contract has drifted relative to a known-good lab sample)
does not exist. The cross-link closes a portfolio-level
detection loop and makes the canonical sample a first-class
shared portfolio asset instead of an opportunistic local
artifact.

## cost

Medium. Three repos to touch, two PRs to coordinate
(athena-site + trace-to-eval-harness), one note here. The
trace-to-eval-harness regression test is the load-bearing
piece; the athena-site reference doc is a small entry; the
note here is a single page. Estimate three days end-to-end,
with the multi-repo coordination as the time sink.

## risk

Medium. Cross-repo PRs are coordination-heavy and can stall
mid-flight. If the athena-site reference doc lands but the
trace-to-eval-harness regression test does not, the canonical
sample is "documented as shared" without the enforcement loop,
which is worse than the status quo. Mitigation: ship the
trace-to-eval-harness side first (it is the load-bearing leg),
then the athena-site reference and the note here. Each leg
ships its own DEC with rollback.

## timeline

Next month (W24-W25). Coordinate with athena-site dream cycle
and trace-to-eval-harness owner before starting; this is the
kind of work where lining up the multi-repo cadence is half
the cost.

## evidence

- `decisions/DEC-FACTORY-011-procurement-negotiation-lab-ci-enforces-run-evidence-chain.md`
  names the current one-way producer-CI relationship.
- `.github/workflows/run-evidence-gates.yml` shows the sibling
  checkout pattern.
- `ops/event-ledger/run-7b662d3f68b1.jsonl` is the canonical
  ledger that would become a portfolio-shared asset.

## promotion path

Three coordinated workflow runs: one on trace-to-eval-harness
(add the regression test + DEC), one on athena-site (add the
reference doc + portfolio DEC), one here (add the
cross-link note). Owner: `control.coordinator` for the
multi-repo coordination, `engineering.implementation` for the
per-repo PRs.
