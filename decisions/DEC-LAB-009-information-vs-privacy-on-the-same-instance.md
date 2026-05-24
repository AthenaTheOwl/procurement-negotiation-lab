---
id: DEC-LAB-009-information-vs-privacy-on-the-same-instance
spec: specs/0002-lab-authoring-workbench/
requirement: R-LAB-009
date: 2026-05-24
status: approved
reversible: true
decision: |
  The information-mode control offers six ordered modes - private,
  risk-only, capacity-band, cost-band, forecast-band, and full-oracle -
  and the lab reports both joint welfare and privacy exposure on the
  same scenario instance whenever the mode changes. The privacy
  exposure column is computed from a per-mode disclosure table in
  `packages/engine/src/model/simulation.ts`; the welfare column is the
  joint utility of the same mechanism with the same agent population
  under the new information set. The lab does not auto-recommend
  full disclosure and does not collapse "more information" into a
  single welfare number.
alternatives:
  - label: show welfare only, hide the privacy column
    rejected_because: |
      Welfare alone makes "more information" look monotonically
      better, which is the wrong lesson. The spec calls out the
      privacy-vs-welfare tradeoff explicitly; hiding the privacy
      column would let the visitor conclude that full disclosure
      is the answer.
  - label: show privacy in a separate tab from welfare
    rejected_because: |
      Splitting privacy off into its own tab breaks the comparison
      the visitor needs to make. More information buys welfare at a
      privacy cost; the visitor cannot weigh the trade-off if the
      two numbers do not sit side by side.
  - label: continuous "privacy budget" slider instead of named modes
    rejected_because: |
      A continuous slider implies privacy is a single dimension that
      can be tuned smoothly. The actual disclosure cases the spec
      cares about are categorical (capacity band vs. cost band vs.
      forecast band), and each has a different incentive consequence.
      Named modes keep those categories visible.
rationale: |
  Welfare and privacy on the same instance turn the information mode
  into a measured trade-off, not a one-way ratchet. The ordered mode
  list keeps the comparison readable: each mode releases
  one more category of private information than the previous one, so
  the visitor sees a monotone information axis with a non-monotone
  welfare response. The lab refuses to recommend full disclosure
  because the procurement literature does not.
evidence:
  - kind: spec
    ref: specs/0002-lab-authoring-workbench/requirements.md
  - kind: doc
    ref: packages/engine/src/model/simulation.ts
  - kind: doc
    ref: docs/information-value.md
  - kind: doc
    ref: packages/engine/src/data/glossary.ts
rollback: |
  Collapse the six information modes into a binary "private vs.
  full-oracle" toggle and drop the privacy exposure column. The
  engine keeps the disclosure table; only the UI surface shrinks.
  The visitor loses the four intermediate modes that name the
  procurement-realistic disclosure categories.
owner: product
---

## decision

The information-mode control offers six ordered modes - private,
risk-only, capacity-band, cost-band, forecast-band, and full-oracle -
and the lab reports both joint welfare and privacy exposure on the
same scenario instance whenever the mode changes. The privacy column
comes from a per-mode disclosure table in
`packages/engine/src/model/simulation.ts`; the welfare column is the
joint utility under the new information set with the same mechanism
and the same agent population. The lab does not auto-recommend full
disclosure.

## alternatives

- Welfare only, hide privacy — makes more information look
  monotonically better.
- Privacy in a separate tab — breaks the side-by-side comparison the
  trade-off requires.
- Continuous privacy-budget slider — implies privacy is one
  dimension; the actual disclosure cases are categorical.

## rationale

Welfare and privacy on the same instance turn the information mode
into a measured trade-off, not a one-way ratchet. The ordered list
keeps the comparison readable: each mode releases one more category
of private information than the previous one. The visitor sees a
monotone information axis with a non-monotone welfare response. The
lab refuses to recommend full disclosure because the procurement
literature does not.

## evidence

- `specs/0002-lab-authoring-workbench/requirements.md` — R-LAB-009
  acceptance bullets (six modes, welfare and privacy on the same
  instance, no full-disclosure recommendation).
- `packages/engine/src/model/simulation.ts` — the per-mode
  disclosure table and the welfare computation.
- `docs/information-value.md` — the value-of-information reference.
- `packages/engine/src/data/glossary.ts` — the mode-name strings the
  lab reads aloud.

## rollback

Collapse the six modes into a binary "private vs. full-oracle"
toggle and drop the privacy exposure column. The engine keeps the
disclosure table; only the UI surface shrinks. The visitor loses
the four intermediate modes the spec names.
