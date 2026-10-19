---
id: DEC-SDK-005-sensitivity-ranking-feasibility-first-no-name-tiebreak
spec: specs/0014-mechanism-design-sdk/
requirement: R-SDK-004
date: 2026-10-19
status: approved
reversible: true
amends: DEC-SDK-004-sensitivity-recommendations-use-ratified-qualification-rule
decision: |
  The qualification rule from DEC-SDK-004 stays: a non-oracle mechanism
  qualifies only when every stress cell converges with a feasible transfer.
  The ranking among qualifying mechanisms changes. It now orders by
  allocation-feasible cells (more first), worst oracle gap, mean oracle gap,
  then disclosure-limited cells (more first). A tie that survives every key
  is reported as a tie. Mechanism name never decides the order.
alternatives:
  - label: Keep worst gap, mean gap, then mechanism name
    rejected_because: |
      After the oracle fix, admm, weighted_nash_plaintext and
      weighted_nash_mpc all reach the optimum in every scored cell. The old
      key then picks admm by spelling, just as it picked weighted_nash_mpc
      over the identical weighted_nash_plaintext before. A recommendation
      that the alphabet decides is not a recommendation.
  - label: Make allocation feasibility a qualification gate
    rejected_because: |
      R-SDK-004 and DEC-SDK-004 keep qualification to convergence and
      transfer feasibility. No current mechanism fits the 360-unit capacity
      cells, so a gate would turn every report into "none" without saying
      which mechanism comes closest. Ranking feasibility first keeps the
      ratified gate and still puts the mechanism that respects capacity
      most often at the top.
  - label: Break remaining ties on runtime or iteration count
    rejected_because: |
      Runtime is not deterministic, which breaks byte-identical reports.
      Iteration counts reward one-shot reference solvers that assume full
      visibility of every utility function, which is the opposite of what
      the lab teaches about deployable coordination.
  - label: Rank by a mechanism's numeric exposure bound
    rejected_because: |
      The bounded protocol reports measured transcript bits against a
      declared bound, while the MPC path reports a schema constant for a
      cryptographic contract (DEC-MPC-001). The numbers are not on one
      scale, so the rule counts cells where a run was disclosure-limited
      instead of comparing the values.
rationale: |
  A review of the committed report found that the recommended mechanism
  outscored the centralized oracle in every stress cell only because the
  oracle searched a 25-unit grid and ignored capacity. With the oracle exact and capacity
  enforced, the remaining failure was the tie-break. Allocation feasibility
  goes first because a plan the supplier cannot deliver is not a plan; the
  SDK already leaves such cells unscored. Worst gap then mean gap keep the
  DEC-SDK-004 preference for robust over average performance. Disclosure is
  the documented secondary criterion because two mechanisms that reach the
  same allocation differ for participants only in what they had to reveal,
  which is the trade the lab exists to show (DEC-LAB-009). Disclosure-limited
  means the run used private information mode and returned a transcript-
  exposure report. When even that ties, the report names every tied
  mechanism instead of choosing one.
evidence:
  - kind: decision
    ref: decisions/DEC-SDK-004-sensitivity-recommendations-use-ratified-qualification-rule.md
  - kind: decision
    ref: decisions/DEC-LAB-009-information-vs-privacy-on-the-same-instance.md
  - kind: doc
    ref: src/procurement_lab/sensitivity.py
  - kind: doc
    ref: src/procurement_lab/algorithms/oracle.py
  - kind: doc
    ref: tests/test_sensitivity.py
  - kind: doc
    ref: reports/mechanism-sensitivity.md
rollback: |
  Restore the previous `recommendation()` sort key in
  `src/procurement_lab/sensitivity.py`, drop `ranked_qualifiers`,
  `recommended_mechanisms` and the `disclosure_limited` row field, revert the
  ranking tests in `tests/test_sensitivity.py`, regenerate
  `reports/mechanism-sensitivity.*` with `python -m procurement_lab.sensitivity`,
  and mark this DEC reversed.
owner: science.proof-gate-runner
systems_map: |
  The oracle defines the scored region (allocations inside capacity). The SDK
  scores only that region, the rollup counts how often each mechanism stays
  inside it, and the ranking reads feasibility, robustness, average gap and
  disclosure in that order before it reads anything else.
transferable_principle: |
  When ranked metrics tie, either break the tie on a property the reader
  cares about and name it, or report the tie. An identifier is never a
  property.
falsification_test: |
  This decision is wrong if renaming or relabelling a mechanism changes its
  rank, if a mechanism with fewer capacity-feasible cells outranks one with
  more, or if the report names a single recommendation while two qualifying
  mechanisms are equal on every ranking key.
adoption_ladder:
  minimum_viable: Ship the ranking, its label-swap and tie tests, and regenerated reports.
  mid_adoption: Apply the same no-name rule to the scorecard best-row and SDK selector tie-breaks.
  full_adoption: Give non-oracle mechanisms local capacity constraints so the feasibility key separates them.
  monitoring_signals:
    - tests/test_sensitivity.py label-swap and tie tests stay green
    - no committed report row has a negative oracle gap
    - the recommendation line states how many cells the winner fits capacity in
---

# DEC-SDK-005: sensitivity ranking is feasibility first and never uses the name

## decision

Qualification is unchanged from DEC-SDK-004. Qualifying mechanisms rank by
allocation-feasible cells, worst oracle gap, mean oracle gap, then
disclosure-limited cells. Ties that survive every key are reported as ties.

## alternatives

- Keep the name tie-break: rejected because it let spelling pick the winner.
- Gate on allocation feasibility: rejected because R-SDK-004 keeps the gate to
  convergence and transfers, and no current mechanism would ever qualify.
- Runtime or iteration count: rejected as non-deterministic or as rewarding
  full-visibility reference solvers.
- Numeric exposure bounds: rejected because the bounded and MPC paths do not
  report on one scale.

## rationale

With an exact, capacity-bound oracle, admm, weighted_nash_plaintext and
weighted_nash_mpc tie on both gap keys. Feasibility first puts deliverable
plans ahead of undeliverable ones. Disclosure separates mechanisms that reach
the same allocation by what participants had to reveal. Anything still equal
is shown as a tie.

## evidence

- `src/procurement_lab/sensitivity.py` implements `ranked_qualifiers`.
- `tests/test_sensitivity.py` pins feasibility before gap, the tie report, a
  label swap, and that no scored row beats the oracle.
- `reports/mechanism-sensitivity.md` shows the ranking and the recommendation
  with its capacity caveat.

## rollback

Restore the DEC-SDK-004 sort key, remove the ranking helpers and the
`disclosure_limited` field, regenerate the reports, and mark this DEC
reversed.
