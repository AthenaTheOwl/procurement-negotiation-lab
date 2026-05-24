---
id: DEC-LAB-008-mechanism-comparison-without-crowning-admm
spec: specs/0002-lab-authoring-workbench/
requirement: R-LAB-008
date: 2026-05-24
status: approved
reversible: true
decision: |
  The mechanism-comparison table compares eight mechanisms side by
  side on every run: JIT baseline, centralized oracle, CPP/ADMM,
  CPP+VCG/CBT, menu-of-contracts, alternating best response,
  price-only coordination, and consensus averaging. Each row reports
  global utility, oracle gap, residual, privacy exposure, incentive
  story, feasibility/quality, iterations, and runtime. The lab does
  not sort the table by ADMM and does not call ADMM the "right
  answer." Mechanism-design options (VCG/CBT and menu-of-contracts)
  are first-class rows, not subordinate to the optimization rows.
alternatives:
  - label: ADMM-first comparison with other mechanisms as "baselines"
    rejected_because: |
      Calling everything other than ADMM a "baseline" presupposes
      ADMM is the answer. The spec 0002 design thesis is the opposite:
      the lab is the surface where the visitor learns when ADMM helps
      and when something simpler wins. The flat eight-row table makes
      the comparison neutral.
  - label: report only joint utility per mechanism
    rejected_because: |
      Joint utility alone hides the trade-offs the lab is meant to
      teach. Privacy exposure, incentive story, and feasibility are
      the axes that distinguish mechanism-design options from
      optimization options; collapsing the report to one number flattens
      the comparison the lab exists for.
  - label: hide the centralized oracle (it's not implementable in
      practice)
    rejected_because: |
      The oracle is the ceiling the other mechanisms are measured
      against. Hiding it removes the upper bound the "oracle gap"
      column needs and makes the comparison look better than it is.
      The oracle row stays visible and is labeled as a reference
      point, not a recommendation.
rationale: |
  The lab teaches that mechanisms have trade-offs; an ADMM-crowning
  table teaches the wrong lesson. The eight-row flat comparison gives
  the visitor the eight comparable answers, each scored on the same
  eight columns, so they can read off which mechanism dominates which
  axis. VCG/CBT and menu-of-contracts are mechanism-design options
  in the procurement literature, so the lab represents them as such
  instead of as variants of an optimization algorithm.
evidence:
  - kind: spec
    ref: specs/0002-lab-authoring-workbench/requirements.md
  - kind: doc
    ref: packages/engine/src/model/simulation.ts
  - kind: doc
    ref: packages/engine/src/model/scenarioCases.test.ts
  - kind: doc
    ref: docs/algorithms.md
rollback: |
  Reduce the table to a two-row comparison (JIT vs. ADMM) and drop
  the oracle gap, residual, and privacy exposure columns. The
  engine functions for each mechanism stay in `simulation.ts`; only
  the table shape changes. The visitor loses the comparison the spec
  asks for.
owner: product
---

## decision

The mechanism-comparison table compares eight mechanisms side by side
on every run: JIT baseline, centralized oracle, CPP/ADMM, CPP+VCG/CBT,
menu-of-contracts, alternating best response, price-only coordination,
and consensus averaging. Each row reports global utility, oracle gap,
residual, privacy exposure, incentive story, feasibility/quality,
iterations, and runtime. The lab does not sort by ADMM and does not
call ADMM the right answer. VCG/CBT and menu-of-contracts are
first-class rows.

## alternatives

- ADMM-first comparison with the rest as baselines — pre-supposes the
  answer the lab is meant to make the visitor work out.
- Joint utility only — hides the trade-offs the lab teaches.
- Hide the centralized oracle — removes the upper bound the oracle
  gap column needs.

## rationale

The lab teaches that mechanisms have trade-offs; an ADMM-crowning
table teaches the wrong lesson. Eight rows on eight columns let the
visitor read off which mechanism dominates which axis. VCG/CBT and
menu-of-contracts are mechanism-design options in the procurement
literature, so the lab represents them as such, not as variants
of an optimization algorithm.

## evidence

- `specs/0002-lab-authoring-workbench/requirements.md` — R-LAB-008
  acceptance bullets (eight mechanisms, eight columns, no crowning,
  mechanism-design as first-class).
- `packages/engine/src/model/simulation.ts` — the eight `mechanismScore`
  calls and the column computation.
- `packages/engine/src/model/scenarioCases.test.ts` — cases that show
  ADMM is not always the best non-oracle row.
- `docs/algorithms.md` — the algorithm and mechanism reference page.

## rollback

Reduce the table to a two-row comparison (JIT vs. ADMM) and drop the
oracle gap, residual, and privacy columns. The engine keeps the
mechanism functions; only the table shape changes. The visitor loses
the comparison the spec asks for.
