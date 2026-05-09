# design: bergemann arc + so-what pass

## Architecture summary

The existing engine in `web/src/model/simulation.ts` is preserved unchanged.
The pass adds a new view layer (the Hero and the ArcSurface) and a new model
module (a TypeScript port of the Python AST formula whitelist) on top of it.

```
existing engine layer (preserved):
  web/src/model/simulation.ts
    algorithmResults, labTakeaway, informationSweep, transferLedger,
    mechanismScore, helper utilities
  web/src/data/agents.ts          6 archetypes
  web/src/data/scenarios.ts       3 existing presets

new in this pass:
  web/src/components/Hero.tsx               R-ARC-001
  web/src/surfaces/ArcSurface.tsx           R-ARC-002
  web/src/surfaces/arc/Step1CoordinationGap.tsx
  web/src/surfaces/arc/Step2PrivacyCost.tsx
  web/src/surfaces/arc/Step3TruthDominant.tsx
  web/src/surfaces/arc/Step4ADMMEngine.tsx
  web/src/surfaces/arc/Step5ConvergencePaths.tsx     R-ARC-003
  web/src/surfaces/arc/Step6AuthorAgent.tsx          R-ARC-004 + R-ARC-005
  web/src/surfaces/arc/Step7JointOptimumCases.tsx    R-ARC-006
  web/src/surfaces/arc/Step8CBT.tsx
  web/src/data/arc.ts                       step content + interactive config
  web/src/model/formula.ts                  AST whitelist (TS port of Python)
  web/src/model/formula.test.ts             mirrors Python tests/test_formula.py

edited in this pass:
  web/src/App.tsx                  new Hero, Arc route in nav
  web/src/data/scenarios.ts        + 3 joint-optimum-case scenarios (R-ARC-006)
  web/src/styles.css               hero + arc layout

new in repo for deploy:
  vercel.json                      framework config (Vite, root web/)
  README.md                        live URL after deploy
```

## Hero design (R-ARC-001)

Single full-width section above the existing nav. Three slots:

```
┌──────────────────────────────────────────────────────────────────┐
│ EYEBROW   mechanism design for long-lead procurement              │
│                                                                   │
│ HEADLINE  $42,800 left on the table                              │
│           when buyer and vendor optimize alone.                   │
│                                                                   │
│ SUBHEAD   When two sides hold private cost data, naive            │
│           cooperation fails — neither will fully disclose.        │
│           Vickrey-Clarke-Groves mechanisms with cost-benefit      │
│           transfers recover most of the surplus without forcing   │
│           either side to reveal its full cost structure.          │
│                                                                   │
│           Built around the thesis from [Bergemann, 2025] →        │
│                                                                   │
│ CTAs      [Walk the arc]   Play the case  ·  Open the lab         │
└──────────────────────────────────────────────────────────────────┘
```

Number derives at component mount from `labTakeaway(scenarios[0])` already in
`simulation.ts`. No new math.

Bergemann link: `https://www.linkedin.com/pulse/how-mechanism-design-theory-helps-optimize-amazon-vendor-9igre/`

## ArcSurface design (R-ARC-002)

Eight numbered steps. Step header + body + interactive widget + deep-link.

State is a `currentStep: 1..8` plus per-step widget state stored in a single
`useReducer`. Forward/back buttons increment/decrement currentStep. Per-step
widget state persists across navigation (so authored formulas in step 6 don't
get lost when the user advances and returns).

Each step is its own component file under `web/src/surfaces/arc/`. The
`ArcSurface.tsx` parent handles navigation, progress bar, and slot rendering.

## Convergence comparison (Step 5, R-ARC-003)

Reuse `algorithmResults(scenario)` filtered to the four iterative algorithms:
admm, alternating-best-response, price-only-dual, consensus-averaging.

Layout: 4 stacked rows, each with a sparkline of residual vs iteration plus
final-row metrics (iterations, runtime ms, oracle gap). The user can pick
any of the seeded scenarios from a small dropdown.

The seeded scenario `oscillating-admm` (added in R-ARC-006 case B) is the
teaching moment: same problem, ADMM oscillates, alternating best response
converges. The widget surfaces this through the sparkline shape.

## Formula authoring (Step 6, R-ARC-004 + R-ARC-005)

The TS formula engine mirrors the Python implementation at
`src/procurement_lab/engine/formula.py`. Same allow list, same ban list,
same node-count and depth limits. AST walk uses `acorn` (already a transitive
Vite dep via Vitest) instead of Python's `ast`.

Allowed AST node types (mapped from acorn):
- `Literal`, `Identifier`, `BinaryExpression`, `UnaryExpression`
- `LogicalExpression`, `ConditionalExpression`
- `CallExpression` only if the callee is a whitelisted function name
- `MemberExpression` only on the rare cases needed; default deny

Banned everywhere:
- `Property`, `MemberExpression` to non-whitelisted names, `FunctionExpression`,
  `ArrowFunctionExpression`, `ImportDeclaration`, `MetaProperty`, `NewExpression`,
  `ThisExpression`, `Super`, `TaggedTemplateExpression`, `YieldExpression`,
  `AwaitExpression`, dunder identifiers (any name containing `__` or starting
  with `_`).

Allowed functions: `min`, `max`, `abs`, `sqrt`, `log`, `exp`, `clip`, `pow`
(with exponent capped at ±10).

Limits: max length 2000 chars, max AST node count 200, max call depth 5.

The widget binds the editor to a buyer or supplier role. On change, the
formula is parsed and validated. If valid, the simulation reruns and the
result panel below updates. If invalid, the error message replaces the result
panel until corrected.

`localStorage` key: `procurement-lab.arc.step6.{role}.formula` and
`...{role}.parameters`.

Scenario knobs (R-ARC-005) are existing sliders from LAB; the arc step 6
surface reuses those components and a "Save scenario JSON" button. Save
serializes to clipboard. Load is a paste-into-textarea path with schema
validation.

## Joint-optimality scenarios (Step 7, R-ARC-006)

Three new entries in `web/src/data/scenarios.ts`:

```ts
{
  id: 'joint-exists-admm-converges',
  title: 'Joint optimum exists, ADMM finds it',
  // demand and capacity calibrated so global maximum lies inside both
  // parties' feasible regions; rho can be set such that ADMM converges.
  ...
},
{
  id: 'joint-exists-admm-oscillates',
  title: 'Joint optimum exists, but ADMM oscillates',
  // calibrated so rho choice + dual-update step makes ADMM cycle around
  // the optimum without convergence; alternating best response finds it.
  ...
},
{
  id: 'joint-does-not-exist',
  title: 'No joint optimum (capacity too tight)',
  // demand >> capacity such that any feasible plan is below either party's
  // outside option; surplus < 0; CBT.feasible = false with explanation.
  ...
},
```

Step 7 widget displays the three cases as tabs. Each tab shows: scenario
description, the relevant algorithm output, and the relevant CBT-ledger row.

## CBT ledger (Step 8)

Reuse `transferLedger(scenario)` already in `simulation.ts`. The widget
renders the per-party ledger row with after-transfer utility, no-worse-off
flag, and the explanation note. A toggle switches the split rule between
proportional and equal.

## Deploy (R-ARC-007)

```bash
gh repo create AthenaTheOwl/procurement-negotiation-lab --public --source=. --push
```

Vercel: import the repo, root directory `web/`, framework Vite, build
`npm run build`, output `dist/`. The repo's `web/package.json` already
declares the right scripts.

After URL exists:
- update repo `README.md` with the live URL
- add door entry to `athena-site/src/content/doors.json`:
  ```json
  {
    "n": "17",
    "name": "procurement-negotiation-lab",
    "status": "active",
    "url": "https://github.com/AthenaTheOwl/procurement-negotiation-lab",
    "hook": "an interactive walk through the Bergemann thesis: coordination gap, VCG, ADMM, CBT — built on the open-source FloPro framework as the ADMM reference."
  }
  ```
- add to `athena-site/ops/portfolio-manifest.yml` for audit coverage

## Out of scope (deferred)

- Run report / shareable artifact (deferred to a later spec; Codex flagged
  it as next-highest-leverage but the so-what pass earns more from the
  hero + arc combination first)
- LLM-generated coach text (the arc copy is hand-written; mechanical generation
  hurts pedagogy quality at this stage)
- Multi-language support
- Live RAG bridge to supplier-risk-rag-agent (a different cross-portfolio
  feature, not this pass)
- True multi-party (3+) participants in the arc — current scope is two-party
  for teaching clarity; the existing LAB already supports up to 5 for
  exploration
