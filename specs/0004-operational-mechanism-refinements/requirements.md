# requirements: operational mechanism refinements

## Scope

Spec 0003 shipped the so-what pass and the guided Bergemann arc. The lab now
teaches the textbook VCG mechanism well. This spec adds the operational
refinements that move VCG from textbook to deployable — the design choices
the [from-mechanism-to-mechanism-design](https://athena-site-six.vercel.app/essays/from-mechanism-to-mechanism-design/)
essay names:

1. **α clipping** — pay `α · T_i` instead of full VCG transfer; bound spend
   while preserving anti-gaming pressure.
2. **Reliability multipliers** — system-applied weights on each supplier's
   stated capacity based on historical adherence; sidesteps full disclosure
   from a different angle.
3. **ε-frontier** — return top-K plans within ε of optimal so the planner
   can trade optimality for robustness; transfers recomputed consistently.
4. **Decoy demand** — pilot-mode injections with known-answer scenarios that
   catch systematic vendor misreporting.

Each refinement is a *rule choice*, not just an algorithm tweak. The lab
should make each choice visible and let the user feel the tradeoff.

Multi-vendor mode (3+ suppliers) and a full vendor-portal flow are
deliberately *out of scope* for this spec — they belong in 0005 because
they touch agent count and UI surface in ways the four refinements above
do not.

## Requirements

### R-OPS-001: α clipping on CPP+VCG

WHEN a visitor opens the Lab Arena or Arc Step 3, THE SYSTEM SHALL expose
an α parameter (0..1) on the `cpp-vcg` mechanism that scales the
cost-benefit transfer paid to each party. THE SYSTEM SHALL display the
resulting transfer values and no-worse-off status as α varies.

Acceptance:

- α slider visible on the Lab Arena's mechanism config panel.
- α defaults to 1.0 (full VCG transfer).
- Lowering α reduces transfer magnitudes; transfer ledger recomputes live.
- At α = 0, transfers are zero and the no-worse-off check fails for any
  party whose realized utility is below their outside option.
- The Lab surfaces the α value used in run-report exports and the spec
  trace JSON.
- Arc Step 3 ("VCG: truth becomes dominant") gains a brief paragraph and
  inline slider showing how α weakens dominant-strategy incentive
  compatibility while preserving anti-gaming pressure.

### R-OPS-002: reliability multipliers per participant

WHEN a visitor configures a participant in the Lab Arena, THE SYSTEM SHALL
expose a `reliability` parameter (0..1) per agent. THE SYSTEM SHALL apply
that multiplier to the agent's stated capacity before optimization, and
SHALL surface the adjusted capacity in the algorithm's plan output.

Acceptance:

- Each agent card in Lab Arena shows a reliability slider, default 1.0.
- Lowering reliability proportionally reduces the agent's effective
  capacity in all mechanism runs.
- Mechanism comparison surfaces both stated and effective capacity per
  agent.
- The Arc gains a brief explanatory paragraph in Step 2 (privacy/cost)
  about reliability as an alternative to full disclosure.

### R-OPS-003: ε-frontier (top-K near-optimal plans)

WHEN a visitor runs a mechanism in the Lab Arena, THE SYSTEM SHALL offer
an ε control that exposes the top-K plans within ε of the optimal
global utility. THE SYSTEM SHALL allow the visitor to inspect each plan
side-by-side with its consistently-recomputed CBT transfer.

Acceptance:

- ε slider visible on the Lab Arena; default ε = 0 (top-1 only).
- For ε > 0, the system returns up to K = 5 plans within ε of optimal.
- Each near-optimal plan displays: global utility, per-agent utility,
  surplus, CBT transfer, no-worse-off status.
- The visitor can select any plan from the frontier; the displayed
  transfer ledger updates to that plan's recomputed CBT.
- The Arc gains a brief paragraph in Step 7 (joint-optimality cases)
  framing ε as the choice between optimal-but-thin and slightly-suboptimal-but-robust.

### R-OPS-004: decoy demand scenarios for anti-collusion

WHEN a visitor enables Audit Mode in the Lab Arena, THE SYSTEM SHALL
inject a curated library of decoy scenarios with known correct answers
and display whether the configured agents respond as expected.

Acceptance:

- Audit Mode toggle visible on the Lab Arena.
- The decoy library contains at least 5 scenarios: cheap-routing-known,
  fragile-supplier-known, collusion-pattern, missing-capacity-pattern,
  reliability-mismatch.
- For each decoy, the system computes the agents' responses, compares to
  the expected pattern, and reports match/mismatch in an audit panel.
- The audit panel explains which kinds of misreport each decoy catches.
- The Arc gains a brief addition in Step 6 (author your own agent) noting
  that authored agents can be tested against the decoy library.

### R-SPEC-004: spec discipline

WHEN this spec is implemented, THE SYSTEM SHALL maintain the same
traceability discipline as specs 0001, 0002, and 0003.

Acceptance:

- Every R-OPS-* requirement maps to tasks in `tasks.md` and acceptance
  checks in `acceptance.md`.
- `traceability.md` is kept current as tasks ship.
- `research.md` cites at least the essay [`from-mechanism-to-mechanism-design`](https://athena-site-six.vercel.app/essays/from-mechanism-to-mechanism-design/),
  the Bergemann article, and one prior-art reference per refinement.
- `ops/run-ledger.md` gets an entry per pass.

## Out of scope

- Multi-vendor mode (3+ suppliers). Spec 0005.
- Vendor portal flow (per-vendor view, vendor-side shadow prices).
  Spec 0005.
- Pilot metrics dashboard (service lift, COGS delta, regret rate).
  Spec 0006.
- Continuous parameter retuning loop (system learns α / reliability priors
  from history). Long-term; needs real-data harness; not now.
- LLM-generated explanation copy for the new controls. The hand-written
  Arc copy reads cleaner than any auto-generated version would in this
  pass.
