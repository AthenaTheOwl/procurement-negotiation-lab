# research: operational mechanism refinements

Sources used for each refinement. Inline-cited where they shaped a
specific design decision.

## Primary thesis source for this pass

**This portfolio's essay [`from-mechanism-to-mechanism-design`](https://athena-site-six.vercel.app/essays/from-mechanism-to-mechanism-design/).**
The essay names the four refinements (α clipping, reliability multipliers,
ε-frontier, decoy demand) and frames each as a *rule choice*, not just an
algorithm tweak. Spec 0004 implements what the essay describes.

## α clipping (R-OPS-001)

**Bergemann, D.** *How mechanism design theory helps optimize Amazon vendor
negotiations.* Amazon Science blog, 2025.
https://www.linkedin.com/pulse/how-mechanism-design-theory-helps-optimize-amazon-vendor-9igre/

Shapes:
- The CPP+VCG framing (truth-telling as dominant strategy via cost-benefit
  transfers).
- The note that *practical* VCG implementations need budget control.

**ChatGPT VCG-style sketch (2026-05-10).** Internal user-shared note.
Shapes:
- The specific `α ∈ [0,1]` clipping form: `T_i = α · max(E_i, 0)`.
- The framing of α as a knob the planner sets per category/season.

**Vickrey, W.** *Counterspeculation, Auctions, and Competitive Sealed
Tenders.* Journal of Finance, 1961. The foundational result.

**Nisan, N., Roughgarden, T., Tardos, E., Vazirani, V. V.** *Algorithmic
Game Theory.* Cambridge University Press, 2007. Cited for the standard
treatment of VCG transfers and incentive compatibility.

## Reliability multipliers (R-OPS-002)

**Industry practice in supply-chain planning.** Reliability/adherence
scoring as a prior on stated capacity is standard in tools like Kinaxis,
o9, Blue Yonder. Cited as inspiration, not as a direct dependency.

**Pactum on agentic procurement architecture.**
https://pactum.com/blog/understanding-agentic-ai-in-procurement-how-autonomous-ai-has-been-transforming-supplier-deals

Shapes:
- The framing that agents operate within "clearly defined mandates,
  pricing thresholds, approval rules and escalation paths set by the
  enterprise." Reliability priors are one such mandate.

## ε-frontier (R-OPS-003)

**Multi-objective optimization literature.** The notion of returning a
Pareto front or near-optimal set rather than a single solution. Standard
in operations research; no single canonical reference required.

**arXiv 2508.04960.** *Distributed Augmented Lagrangian Decomposition
(DALD).* https://arxiv.org/pdf/2508.04960

Shapes:
- Frame the ε-frontier as a generalization of the "best of multiple
  algorithm runs" approach the existing Lab already uses (it ranks 8
  mechanisms; ε-frontier ranks multiple plans within one mechanism).

## Decoy demand (R-OPS-004)

**Audit and anti-collusion literature.** Random decoy injections during
procurement auctions are documented in:

- **Asker, J.** *A Study of the Internal Organization of a Bidding
  Cartel.* American Economic Review, 2010. https://www.aeaweb.org/articles?id=10.1257/aer.100.3.724

Shapes:
- The framing that decoy scenarios catch *systematic* misreporting that
  equilibrium math assumes away.

**ChatGPT VCG-style sketch (2026-05-10).** The specific phrase "decoy
demand scenarios during pilot" came from this note. The spec implements
it as Audit Mode.

## Prior portfolio specs (cross-references)

- `specs/0001-polished-simulator/` — the original lab spec.
- `specs/0002-lab-authoring-workbench/` — the workbench surface that this
  spec extends.
- `specs/0003-bergemann-arc/` — the arc surface that gains small additions
  in this spec.

## What this spec deliberately does NOT cite

- Specific ε / K / α values from production systems. The lab's defaults
  are *teaching* defaults, not operational recommendations.
- Any internal Amazon, vendor, supplier, or pilot data. All scenarios
  remain synthetic per the public-data boundary (`docs/public-data-boundary.md`).

## Open follow-up reading (for spec 0005+)

- **Multi-issue negotiation literature.** NegMAS, AgenticPay,
  Magentic Marketplace. Relevant once we move to 3+ vendors and a vendor
  portal flow.
- **Continuous mechanism retuning.** How α / reliability priors update
  from observed data over time. Long-term; needs a real-data harness.
- **Behavioral game theory.** When real vendors don't play the
  equilibrium strategy; deviations from rationality.
