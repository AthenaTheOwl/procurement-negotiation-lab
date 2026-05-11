# research: multi-party portal and scenario authoring

## Multi-party negotiation

**NegMAS.** https://github.com/yasserfarouk/negmas

Shapes:
- Multi-issue utility function structure.
- Negotiation protocol design for N parties.
- Strategy abstractions (treated as inspiration; no runtime dependency).

**AgenticPay.** https://github.com/SafeRL-Lab/AgenticPay

Shapes:
- Environment registration patterns.
- Multi-product, multi-seller, multi-buyer scenario organization.
- Strategy/policy abstractions usable as a reference for the agent
  strategy library.

**Magentic Marketplace (Microsoft Research, 2025).**
https://www.microsoft.com/en-us/research/wp-content/uploads/2025/10/multi-agent-marketplace.pdf

Shapes:
- The full economic lifecycle: search → matching → negotiation → transaction.
- The lab implements a slice (negotiation + transfer) but the lifecycle
  framing informs the view-picker design (buyer, supplier, coordinator).

## Privacy in mechanism design

**Bergemann, D.** *How mechanism design theory helps optimize Amazon vendor
collaboration.* Amazon Science, 2025-2026.

Shapes:
- The principle that vendors should never reveal full cost structure.
- The per-party view enforces this principle in the UI: a vendor's view
  doesn't see what the coordinator sees, by construction.

**Bergemann, D. and Morris, S.** *Robust Mechanism Design.* Econometrica, 2005.

Shapes:
- The robustness framing for mechanisms when private types are uncertain.

## Shapley value

**Shapley, L. S.** *A Value for n-Person Games.* In Kuhn and Tucker, eds.,
Contributions to the Theory of Games II, 1953.

Shapes:
- The canonical fairness rule for splitting surplus across N parties.
- The three axioms (symmetry, efficiency, null-player) that the Shapley
  implementation must satisfy.

**Castro, J., Gómez, D., Tejada, J.** *Polynomial calculation of the Shapley
value based on sampling.* Computers & Operations Research, 2009.

Shapes:
- For N ≤ 5, exhaustive permutation enumeration is feasible. For N > 5,
  sampling-based approximation. This spec uses exhaustive enumeration only
  (N ≤ 5).

## Schema-first JSON

**zod.** https://zod.dev/

Shapes:
- The library used to define the scenario schema. Provides runtime
  validation + TypeScript inference.

## Open Contracting field conventions

**Open Contracting Data Standard.** https://standard.open-contracting.org/

Shapes:
- Naming conventions for procurement records (party, contract, award,
  release). The lab's scenario JSON borrows naming where it makes sense.

## Existing portfolio specs

- `specs/0001-polished-simulator/` — the original lab.
- `specs/0002-lab-authoring-workbench/` — the workbench surface.
- `specs/0003-bergemann-arc/` — the guided arc (remains two-party).
- `specs/0004-operational-mechanism-refinements/` — α, reliability, ε,
  decoys (extend cleanly to N parties under this spec).

## Out-of-scope cited (future specs)

- **Continuous mechanism retuning.** Spec 0007 / 0008+.
- **Real-time multi-user editing of the same scenario.** Out of scope
  entirely; the lab is single-user.
- **LLM-generated strategies.** Future enhancement; not this spec.
