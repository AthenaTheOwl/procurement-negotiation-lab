---
id: DEC-SDK-004-sensitivity-recommendations-use-ratified-qualification-rule
spec: specs/0014-mechanism-design-sdk/
requirement: R-SDK-004
date: 2026-08-28
status: approved
reversible: true
decision: |
  The mechanism-sensitivity report evaluates every default mechanism across a
  deterministic 2 x 2 x 2 stress grid. A non-oracle mechanism qualifies for
  recommendation only when every cell converges and every transfer is
  feasible. Allocation feasibility remains a separate reported signal.
alternatives:
  - label: Require allocation feasibility for recommendation
    rejected_because: |
      That adds a third decision criterion after the task contract ratified two.
      Readers still receive the allocation-feasibility rate and typed capacity
      failures, so the evidence remains visible without changing the rule.
  - label: Rank all mechanisms regardless of failed cells
    rejected_because: |
      A favorable average can hide a failed stress cell. Qualification must
      precede ranking so the report does not recommend a mechanism with a known
      convergence or transfer failure.
  - label: Build a new sensitivity solver
    rejected_because: |
      The public SDK already owns scenario construction and mechanism
      comparison. A second solver would create an unnecessary parity surface.
rationale: |
  The report is a decision aid over existing deterministic mechanisms. A fixed
  grid makes runs repeatable, while cell-level JSONL lets a reader recompute
  every rollup. Keeping qualification separate from descriptive evidence makes
  the recommendation rule reviewable and prevents metric creep.
evidence:
  - kind: spec
    ref: specs/0014-mechanism-design-sdk/requirements.md
  - kind: doc
    ref: src/procurement_lab/sensitivity.py
  - kind: doc
    ref: tests/test_sensitivity.py
  - kind: doc
    ref: reports/mechanism-sensitivity.jsonl
rollback: |
  Remove the sensitivity module, tests, and canonical reports, then remove
  R-SDK-004 and its traceability row. The underlying SDK stays unchanged.
owner: science.proof-gate-runner
systems_map: |
  Scenario-grid inputs flow through the existing SDK comparison boundary into
  cell-level evidence. The rollup is derived from that evidence, and the
  recommendation is derived from the rollup under a fixed qualification rule.
transferable_principle: |
  A decision report should separate eligibility constraints from ranking
  metrics and preserve the rows needed to recompute both.
falsification_test: |
  This decision is wrong if identical inputs produce different report bytes,
  if a recommended mechanism has a failed convergence or transfer cell, or if
  the Markdown rollup cannot be reproduced from the JSONL rows.
adoption_ladder:
  minimum_viable: Publish the deterministic report and its recomputation tests.
  mid_adoption: Add reviewed scenario profiles without changing the default grid.
  full_adoption: Compare historical scenario cohorts with versioned profiles.
  monitoring_signals:
    - report byte hashes remain stable for identical inputs
    - recommendation tests fail when a qualifying cell is degraded
    - every rollup value is recomputable from JSONL
---

# DEC-SDK-004: sensitivity recommendations use the ratified qualification rule

## decision

The mechanism-sensitivity report evaluates every default mechanism across a
deterministic stress grid. A non-oracle mechanism qualifies only when every
cell converges and every transfer is feasible. Allocation feasibility remains
visible as separate evidence.

## rationale

A favorable average can hide a failed cell. Qualification therefore precedes
ranking. The qualifying set is ordered by worst oracle gap, mean oracle gap,
then mechanism name. The JSONL rows preserve enough detail to recompute the
rollup and challenge the recommendation.

## evidence

- `src/procurement_lab/sensitivity.py` implements the grid, report, and rule.
- `tests/test_sensitivity.py` proves determinism and degrades a qualifying row.
- `reports/mechanism-sensitivity.jsonl` is the canonical cell-level artifact.
- `reports/mechanism-sensitivity.md` is the derived human-readable rollup.

## rollback

Remove the report module, tests, artifacts, and R-SDK-004. No SDK solver or
public API needs to change.
