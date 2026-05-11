# research: operational mechanism refinements

Sources used for each refinement. These shaped the implementation in spec
0004; none are runtime dependencies.

## Primary thesis source

**This portfolio's essay [`from-mechanism-to-mechanism-design`](https://athena-site-six.vercel.app/essays/from-mechanism-to-mechanism-design/).**
The essay names alpha clipping, reliability multipliers, epsilon frontier,
and decoy demand as operational rule choices rather than solver tweaks.

**Bergemann, D.** *How mechanism design theory helps optimize Amazon-vendor
collaboration.* Amazon Science, May 5, 2026.
https://www.amazon.science/blog/how-mechanism-design-theory-helps-optimize-amazon-vendor-collaboration

Shapes:

- The CPP + VCG framing.
- The cost-benefit transfer explanation.
- The need to handle information privacy, shortages, rolling horizons, and
  uncertain forecasts in an operational mechanism.

## Alpha clipping (R-OPS-001)

**ChatGPT VCG-style sketch (2026-05-10).** Internal user-shared note.

Shapes:

- The specific teaching form `transfer = alpha * externality`.
- The framing of alpha as a planner-set budget/risk knob.

**Nisan, N., Roughgarden, T., Tardos, E., Vazirani, V. V.** *Algorithmic
Game Theory.* Cambridge University Press, 2007.

Shapes:

- The standard treatment of VCG transfers and incentive compatibility.

## Reliability multipliers (R-OPS-002)

**Lin, K.-Y. and Lin, Y.-K.** *Sustainable supply chain evaluation with
supplier sustainability in terms of reliability.* Annals of Operations
Research, 2024.
https://link.springer.com/article/10.1007/s10479-024-05970-1

Shapes:

- Reliability as the probability that a supply chain can satisfy demand
  under capacity, budget, and supplier conditions. The lab adapts this into
  an effective-capacity multiplier.

**Pactum on agentic procurement architecture.**
https://pactum.com/blog/understanding-agentic-ai-in-procurement-how-autonomous-ai-has-been-transforming-supplier-deals

Shapes:

- Specialized agents operating inside explicit mandates and thresholds.
  Reliability priors are one visible mandate.

## Epsilon frontier (R-OPS-003)

**Bertsimas, D. and Sim, M.** *The Price of Robustness.* Operations
Research, 2004.
https://web.mit.edu/dbertsim/www/papers/melvyn/The-Price-Of-Robustness-OR52.pdf

Shapes:

- The UI framing that a planner may accept slightly lower nominal utility
  to gain robustness under uncertainty.

**Distributed Augmented Lagrangian Decomposition (DALD).**
https://arxiv.org/pdf/2508.04960

Shapes:

- A future algorithm extension path beyond the current ADMM comparison.

## Decoy demand (R-OPS-004)

**Asker, J.** *A Study of the Internal Organization of a Bidding Cartel.*
American Economic Review, 2010.
https://www.aeaweb.org/articles?id=10.1257/aer.100.3.724

Shapes:

- The framing that systematic misreporting and collusion are empirical
  behaviors that a clean equilibrium story can miss.

**ChatGPT VCG-style sketch (2026-05-10).** Internal user-shared note.

Shapes:

- The specific phrase and idea of decoy demand scenarios during pilot.

## Open-source and product references for future specs

**snap-stanford/supply-chains.**
https://github.com/snap-stanford/supply-chains

- Useful for source-boundary design: synthetic datasets are released, while
  real-world datasets are documented but not redistributed.

**NegMAS.**
https://github.com/yasserfarouk/negmas

- Useful for multi-issue utility functions and negotiation protocol design.

**AgenticPay.**
https://github.com/SafeRL-Lab/AgenticPay

- Useful for environment registration, multi-product negotiation, multi-seller
  negotiation, and Gymnasium-like scenario structure.

**Magentic Marketplace.**
https://www.microsoft.com/en-us/research/wp-content/uploads/2025/10/multi-agent-marketplace.pdf

- Useful for the full economic lifecycle: search, matching, negotiation, and
  transaction.

## Spec-driven-development references

**Kiro specs.**
https://kiro.dev/docs/specs/

- External comparison for this repo's requirements/design/tasks spec ledger.

**Self-Refine.**
https://arxiv.org/abs/2303.17651

- Supports the generate-review-revise loop, but this repo grounds revision in
  deterministic tests, browser QA, and traceability rather than model self-rating.

## Production-repo inspiration

`../cargo-health/medroute-main` shaped the hardening roadmap:

- Specs before code.
- Red/green task execution.
- Test rings for unit/property, integration, contract/observability, and
  browser/system tests.
- Property or metamorphic tests for new domain rules.
- Pact/authz/observability rows for externally visible behavior.
- Schema validation and test data factories instead of ad-hoc fixtures.

These practices are recorded in `docs/product-expansion-roadmap.md` as future
hardening work rather than imported wholesale into this small public demo.
