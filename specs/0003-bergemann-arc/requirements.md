# requirements: bergemann arc + so-what pass

## Scope

The lab has the operational machinery (8 mechanisms, 6 information modes, 6
agent archetypes, CBT ledger, scenario authoring, info-value sweep). It does
not communicate the *thesis* the machinery teaches. A first-time visitor can
spend two minutes inside the app without understanding why any of this matters
or what field it belongs to.

This spec adds:

- A claim-the-field hero that surfaces the coordination gap in literal dollars
  on first paint.
- A guided **arc surface** that walks the user through the Bergemann thesis
  step by step, with one interactive widget per step.
- An authoring layer (custom utility formulas) folded into the arc, so users
  can encode their own agent's objective and watch the negotiation respond.
- A small set of new scenario presets that demonstrate distinct
  joint-optimality cases (joint exists & ADMM finds it; joint exists & ADMM
  oscillates; joint does not exist).
- Public deploy: push to GitHub, host on Vercel, register the door in
  `athena-site`.

The thesis the lab teaches, drawn from Bergemann's *How mechanism design theory
helps optimize Amazon vendor negotiations* (Amazon Science, 2025):

1. Buyer and vendor optimizing on private cost data leave joint value on the
   table — the **coordination gap**.
2. Naive cooperation fails because neither side will reveal its full cost
   structure.
3. **Vickrey-Clarke-Groves (VCG)** mechanisms make truthful reporting a
   dominant strategy.
4. **Consensus Planning Protocol (CPP)** — implemented as ADMM — is the
   computational engine that scales VCG without requiring full utility
   disclosure.
5. **Cost-Benefit Transfer (CBT)** is the actual money flow that keeps both
   sides no-worse-off than walking away.
6. **Menu-of-contracts** is a transparency-friendly alternative for
   lower-dimensional decisions.

## Requirements

### R-ARC-001: claim-the-field hero

WHEN a visitor lands on the app, THE SYSTEM SHALL show a hero that names the
field, displays the coordination gap as a literal dollar amount computed live
from the default scenario, and links to the source article.

Acceptance:

- Hero contains the phrase "mechanism design" in body or eyebrow copy.
- Hero displays a `$` figure derived from `labTakeaway(default_scenario)` —
  not a hardcoded string.
- Hero contains a link to the Bergemann article.
- Hero contains exactly one primary CTA labeled to enter the arc, and at most
  two secondary CTAs (Lab, Play, Tutorial).

### R-ARC-002: guided arc surface

WHEN a visitor clicks the hero CTA or selects "Walk the arc" from nav, THE
SYSTEM SHALL render an arc surface with eight ordered steps, each containing
a plain-English explanation, an interactive widget, and a deep-link into Lab.

Acceptance:

- Surface renders steps 1 through 8 in order.
- Each step contains: title, plain-English paragraph (≤ 80 words), interactive
  widget, "open in Lab" deep-link.
- Steps map 1:1 to the Bergemann thesis points (gap, privacy, VCG, CPP/ADMM,
  alternative algorithms, authoring, joint-optimality cases, CBT).
- A user can advance forward and back through the arc without losing widget
  state.

### R-ARC-003: convergence-path comparison widget

WHEN the visitor reaches step 5, THE SYSTEM SHALL render a side-by-side
comparison of ADMM, alternating best response, price-only dual, and consensus
averaging on the same scenario, showing iterations, runtime, and final
oracle gap per algorithm.

Acceptance:

- All four algorithms run on the same scenario instance.
- Display shows iterations, runtime ms, and final oracle gap per algorithm.
- At least one of the seeded scenarios shows ADMM oscillating while
  alternating best response converges (R-ARC-006 dependency).

### R-ARC-004: authored utility formulas

WHEN the visitor reaches step 6, THE SYSTEM SHALL provide a formula editor
that accepts a custom utility expression for either party, validates it
against an AST whitelist, and reruns the negotiation on submission.

Acceptance:

- Editor accepts `100 * min(q, demand) - 50 * q` and reruns.
- Editor rejects `__import__('os')`, `os.system('rm')`, attribute access,
  and lambdas with a friendly error.
- Authored agent persists in `localStorage` for the session.
- Reset-to-default button restores the canonical formula.

### R-ARC-005: scenario authoring with knobs

WHEN the visitor wants a custom scenario in the arc, THE SYSTEM SHALL provide
sliders for at least demand volatility, capacity tightness, and lead time,
plus the ability to save the resulting JSON spec.

Acceptance:

- At least three structural knobs are sliders, not free-form numeric input.
- Save-as-JSON button copies a valid spec to clipboard.
- Pasting a saved spec back via a "load JSON" path reproduces the same run.

### R-ARC-006: joint-optimality demonstrations

WHEN the visitor reaches step 7, THE SYSTEM SHALL render three pre-baked
scenarios that demonstrate distinct joint-optimality cases.

Acceptance:

- Case A: joint optimum exists; ADMM converges within 30 iterations.
- Case B: joint optimum exists; ADMM oscillates; alternating best response
  converges. The UI surfaces this divergence.
- Case C: joint optimum does not exist (capacity too tight, surplus < 0);
  CBT ledger flags infeasible with a plain-English explanation.

### R-ARC-007: public deploy

WHEN this pass ships, THE SYSTEM SHALL be publicly accessible via a Vercel
URL backed by a public GitHub repository.

Acceptance:

- `https://github.com/AthenaTheOwl/procurement-negotiation-lab` resolves
  with this repo's content.
- A Vercel URL returns 200 and shows the new hero.
- `athena-site/src/content/doors.json` includes door N° 17 pointing at
  the Vercel URL.
- `athena-site/ops/portfolio-manifest.yml` includes the new repo for audit
  coverage.

### R-SPEC-003: traceability discipline

WHEN this spec is implemented, THE SYSTEM SHALL preserve traceability between
each requirement, the tasks that satisfy it, the acceptance check that
verifies it, and the research grounding it.

Acceptance:

- Every requirement above appears in `tasks.md` linked to one or more concrete
  tasks.
- Every requirement above appears in `acceptance.md` linked to one or more
  pass conditions.
- `traceability.md` shows the requirements ↔ tasks ↔ acceptance grid.
- `research.md` cites at least the Bergemann article, the Boyd ADMM survey,
  the kqshan/vcg-auction repo, and the SNAP supply-chains dataset reference.
