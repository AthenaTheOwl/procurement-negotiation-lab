# research: bergemann arc + so-what pass

Sources used for the requirements, design, and acceptance criteria. Each
entry includes how it shaped a specific decision.

## Primary thesis source

**Bergemann, D.** *How mechanism design theory helps optimize Amazon vendor
negotiations.* Amazon Science blog, 2025.
https://www.linkedin.com/pulse/how-mechanism-design-theory-helps-optimize-amazon-vendor-9igre/

Shapes:
- The thesis the lab teaches (R-ARC-001 through R-ARC-006).
- The 8-step arc structure (R-ARC-002): coordination gap → asymmetric
  information → VCG → CPP/ADMM → convergence variants → authoring →
  joint-optimality cases → CBT.
- The credibility marker copy: "9-week pilot with a consumer-product
  manufacturer demonstrating real cost savings."
- The framing of the menu-of-contracts as a transparency-friendly
  alternative.

## Mechanism design

**Vickrey, W., Clarke, E., Groves, T.** Foundational results on
incentive-compatible mechanisms. Surveyed in Bergemann (2025) above and in:

**Nisan, N., Roughgarden, T., Tardos, E., Vazirani, V. V.** *Algorithmic
Game Theory.* Cambridge University Press, 2007.
https://www.cambridge.org/core/books/algorithmic-game-theory/0092C07CA8B724E1B1BE2238DDD66B38

Shapes:
- The R-ARC-003 (Step 3 Truth Dominant) widget: showing how truthful
  reporting becomes dominant under VCG-style payments.
- The CBT design in Step 8 (R-ARC-002 step 8): not arbitrary surplus splits
  but Vickrey-Clarke-Groves-aligned transfers.

**Bergemann, D., Välimäki, J.** *The dynamic pivot mechanism.* Econometrica,
2010, 2019. Cited in Bergemann (2025) above.

Shapes:
- The rolling-horizon framing in the design (multi-period commitments,
  certainty-equivalent CBT). v0 ships the static case; the dynamic
  extension is referenced in Step 8 docs but not implemented in this pass.

## Distributed optimization (CPP / ADMM)

**Boyd, S., Parikh, N., Chu, E., Peleato, B., Eckstein, J.** *Distributed
optimization and statistical learning via the alternating direction method
of multipliers.* Foundations and Trends in Machine Learning, 2011.
https://web.stanford.edu/~boyd/papers/admm_distr_stats.html

Shapes:
- ADMM is *one* algorithm in a family, not the universal winner. Step 5
  (R-ARC-003) compares it against alternating best response, price-only
  dual, and consensus averaging. The lab must not crown ADMM.
- The proximal penalty + dual update structure in the existing simulation
  engine.

**LibADMM-toolbox.** https://github.com/canyilu/LibADMM-toolbox

Shapes:
- The vocabulary of split-form ADMM with consensus updates. Used as a
  vocabulary reference; not a dependency.

**nirum/ADMM.** https://github.com/nirum/ADMM

Shapes:
- A small Python ADMM example. Reference for the residual definition and
  convergence-detection logic in the existing engine.

## Convergence comparisons

**Tibshirani, R.** *Frank-Wolfe / conditional gradient.* CMU Convex
Optimization lecture notes, 2018.
https://www.stat.cmu.edu/~ryantibs/convexopt-F18/lectures/frank-wolfe.pdf

Shapes:
- Future Step 5 extension: Frank-Wolfe as a fifth algorithm. Not in this
  pass; documented as a follow-up in `tasks.md` out-of-scope.

**arXiv 2508.04960.** *Distributed Augmented Lagrangian Decomposition (DALD).*
https://arxiv.org/pdf/2508.04960

Shapes:
- DALD as a generalization of ADMM with broader convergence guarantees.
  Future arc step extension; not implemented in this pass.

**arXiv 1901.09252.** *Asynchronous Distributed ADMM over Lossy Networks.*
https://arxiv.org/pdf/1901.09252

Shapes:
- Future "what happens when messages drop" arc widget. Not implemented in
  this pass; flagged as a v1 extension in `design.md`.

## Pedagogy and learning-simulator design

**Sterman, J.** *Interactive web-based simulations for strategy and
sustainability.* System Dynamics Review, 2014.
https://onlinelibrary.wiley.com/doi/abs/10.1002/sdr.1513

**Sterman, J.** *Learning In and About Complex Systems.* MIT Sloan WP
3660-94. https://dspace.mit.edu/bitstream/handle/1721.1/2504/SWP-3660-30352170.pdf

Shapes:
- The think → decide → see-consequences → reflect rhythm of each arc step
  (R-ARC-002). Each step uses one interactive widget rather than dumping
  every chart at once.
- The microworld principle: realistic enough to engage, simple enough to
  learn from.

**MIT Beer Game.** https://mitsloan.mit.edu/teaching-resources-library/beer-game

Shapes:
- One decision per round (R-ARC-002 each step has at most one user input).
- Information delay as part of the lesson (Step 2 and Step 5 widgets).
- The bullwhip-effect lesson teaches the field's name (system dynamics) by
  showing the failure, not by lecturing. The arc applies the same approach
  to mechanism design.

## Open-source supply-chain datasets

**SNAP Stanford supply-chains.** https://github.com/snap-stanford/supply-chains

Shapes:
- A public-data safety boundary reference. The lab does not depend on it,
  but cites it as a *citation pattern* for the synthetic data the arc uses.

## VCG implementation reference

**kqshan/vcg-auction.** https://github.com/kqshan/vcg-auction

Shapes:
- Reference for the *direct* VCG mechanism (auction setting). The lab's
  CPP+VCG is the iterative version per Bergemann; the direct version is
  referenced in design.md as an alternative.

## Project-based learning discipline

**practical-tutorials/project-based-learning.**
https://github.com/practical-tutorials/project-based-learning

Shapes:
- The lab as a *buildable, inspectable project*, not a narrative essay. The
  arc walkthrough must always anchor abstraction in a concrete on-page
  widget.

## gstack discipline (cognitive gears + browser QA)

**Tan, G.** *gstack — Garry Tan's Claude Code setup.*
https://github.com/garrytan/gstack

Shapes:
- The proof-gate discipline in `acceptance.md`: every pass exits through a
  named gate with browser-QA evidence saved as screenshots, not just a
  passing test suite.
- The cognitive-gears framing: each pass has a single named role
  (hero design, formula port, arc widgets, deploy) rather than blending
  concerns.

## Forio Epicenter (model / interface separation)

**Forio Epicenter.** https://forio.com/products/epicenter/

Shapes:
- The Model / Interface / Run-state separation in `design.md`: the
  simulation engine is preserved, the new work is only view + arc layer
  + a small TS formula engine. Run state lives per-session.

## Magentic Marketplace (modular extension)

**Microsoft Research.** *Magentic Marketplace: a multi-agent marketplace
environment.* 2025. https://www.microsoft.com/en-us/research/wp-content/uploads/2025/10/multi-agent-marketplace.pdf

Shapes:
- The Lab's existing swappable-axes design (algorithm × info-mode × agent
  count). The arc walks one path through these; Lab is the open exploration
  surface.

## Internal references

- `C:\Users\Vignesh\.claude\plans\codex-briefs\06-procurement-lab-redesign.md`
  — the original redesign brief that produced the current React app.
- `C:\Users\Vignesh\.claude\plans\codex-briefs\voice-spec.md` — the voice
  spec governing copy across the portfolio. The hero copy and arc-step
  paragraphs in this pass must clear the voice-lint check.
- `e:\claude_code\prompt-library\library\creative\interactive-narrative\_index.md`
  — Crawford / Schell / Murray / Jenkins on interactive narrative theory.
  Shapes the string-of-pearls (arc) vs emergent-sandbox (Lab) split.
- `e:\claude_code\prompt-library\library\foundations\operational\03-reasoning-protocol.md`
  — FRAME → MODEL → REASON → VALIDATE → DECLARE → UPDATE. Shapes the
  per-step debrief structure.

## Out-of-scope cited (for future passes)

These references are cited so future specs can find them; they are *not*
implemented in this pass:

- **NegMAS.** Multi-issue negotiation library. Future expansion of agent
  authoring beyond utility-formula DSL.
- **AgenticPay.** Multi-product, multi-buyer/multi-seller market simulator
  pattern. Future Lab extension.
- **OACP, OANP.** Open agent-coordination protocols.
- **Open Contracting.** Public procurement field-naming conventions.
  Reference for any future synthetic data expansion.
- **SDV.** Tabular synthetic data patterns. Reference for any future data
  generation beyond the seeded scenarios.
