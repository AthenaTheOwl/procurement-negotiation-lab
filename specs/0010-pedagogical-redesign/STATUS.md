# spec 0010 - pedagogical redesign + mobile status

**Date**: 2026-05-19
**Branch**: `main`
**Original implementation report**: Claude Opus 4.7
**Independent verification and corrections**: Codex

## Current Verdict

Spec 0010 is implemented and locally reproducible after verification and polish.
The major product additions are present, the app builds, the Python and
TypeScript test suites pass, mobile Jest now runs, the built local preview
passes the Playwright smoke suite, and the canonical Vercel production URL
passes the same smoke suite after deploy.

The original report was directionally right but had two stale verification
claims:

- The old Vercel `TS2688: Cannot find type definition file for 'react-native'`
  failure was fixed by `types: []` in `apps/web/tsconfig.json`.
- The active GitHub frontend failure after that was a different issue:
  `npm ci` failed because `package-lock.json` had not been regenerated after
  adding the `apps/mobile` workspace and Expo dependencies. The lockfile is now
  regenerated and `npm ci` is part of the verified gate.

## What Landed

| Phase | Scope | State |
|-------|-------|-------|
| 0 | Specs, tokens, 8 storyboards, spec_check schema | shipped |
| 1 | Monorepo restructure (`packages/engine` + `apps/web`) | shipped |
| 2 | Visual primitives, Level 1, Home, Sandbox rename, router | shipped |
| 3 | Levels 2-4 web + more primitives | shipped |
| 4 | Levels 5-7 web + ConvergenceAnimation + SplitRuleToggle | shipped |
| 5 | Level 8 capstone + Sandbox bridge | shipped |
| 6+7 | Mobile scaffold + Home + Levels 1-8 + Sandbox stub | shipped |
| 8 | Level 9, RAG bridge, chip-map bridge, save/share, streak, negotiate surface | shipped |
| 9 | Level 10 Model Studio for menu authoring and shared coordination kernel | shipped |
| 10 | Negotiate UX fixes + Level 11 mechanism catalog + multi-SKU BuyPlanStudio (replaces legacy lab as default sandbox; Classic kept as a tab) | shipped |

## Phase 10 Additions

- **Negotiate UX fixes**. Role-conflict detection now warns and offers a
  one-click switch when both browsers land on the same role. The role
  picker suggests the opposite side when the URL state already has
  offers. New offers from the partner trigger a flash banner. The
  Accept button opens a confirmation card naming the exact terms; a
  "half-accepted" banner makes the asymmetric-acceptance state
  explicit; the deal-closed surface lists the final quantity and unit
  price. A post-verification fix clears stale accepts whenever a new
  counteroffer is posted, so deal closure cannot mix old accept flags
  with newer terms. URL-encoded negotiation notes now preserve UTF-8.
- **Level 11 — How to coordinate without a solver**. Comparison surface
  for twelve mechanisms (rule engine, posted-price menu, score
  ranking, RFQ, sealed-bid VCG, matching, greedy-with-shadow-prices,
  small LP, price-adjustment loop, ADMM, DP-ADMM, secure MPC). Each
  carries the same provenance card: what it exchanges across the
  trust boundary, what an observer can infer, welfare ranking, setup
  effort, and whether truthful reporting is dominant. Owned by
  `packages/engine/src/learn/coordinationCatalog.ts`.
- **Multi-SKU BuyPlanStudio**. New default sandbox surface. Three
  starting SKUs with editable per-SKU utility formulas, parameters,
  and quantities. Typed inter-SKU relationships: substitute, complement,
  and shared-capacity. Aggregate plan utility = sum of per-SKU
  utilities + relationship corrections, with hard-cap violations
  flagged explicitly. Engine helper:
  `packages/engine/src/learn/buyPlan.ts`. The legacy LabArena is kept
  reachable as the "Classic Lab Arena" tab inside `SandboxShell`.
  Post-verification polish clamps invalid relationship strengths and
  missing relationship SKU ids so corrections stay finite and do not
  flip sign.
- **Privacy framing tightened in Level 11**. Vanilla ADMM gives
  structural privacy by decentralization, not formal privacy.
  DP-ADMM adds calibrated noise for an (ε, δ) guarantee. Secure MPC
  is the formal-privacy ceiling. Cheaper protocols (posted-price,
  scoring, RFQ) often cover ~80% of coordination value at a fraction
  of the operational cost.

## Phase 8 Additions

- **Level 9 - multi-period commitment workbench**: web + mobile screen, 12-week
  schedule, firm/soft/forecast commitments, closed-form per-week optimum, and
  four presets.
- **Live RAG bridge in Level 7**: optional fetch against the
  `supplier-risk-rag-agent` corpus, cited chunks, and graceful fallback.
- **Live chip-map bridge in Level 6**: optional fetch from the chip-map dataset
  that maps packager chokepoint scores into the capacity slider.
- **Save and share participant in Level 8**: `?p=<base64url>` hydration for role,
  formula, and params, with tamper rejection.
- **Daily streak counter on Home**: localStorage-backed streak with lazy decay
  after a 2+ day gap.
- **Two-browser Negotiate surface**: `#/negotiate` URL-encoded session state plus
  BroadcastChannel same-machine tab sync.
- **Privacy claim tightening**: web and mobile copy now names what each mechanism
  exchanges instead of reducing the message to "ADMM is private."
- **Model Studio in Level 10**: VCG-inspired menu authoring on top of a shared
  coordination kernel. The engine now exposes a typed coordination-model
  contract, scope resolution, menu generation, certification checks, and
  settlement clearing. Web and mobile both surface the core workflow.

## Cross-Portfolio Work

- `athena-site` now promotes `procurement-negotiation-lab` as the flagship demo
  and demotes the chip-map embed to featured demo.
- `AthenaTheOwl-profile/README.md` puts the lab first in `// active`.
- `DEPLOY.md` exists in the three Streamlit-ready repos:
  `facility-location`, `semiconductor-wafer-robust-optimization`, and
  `food-relief-fund/food-relief-simulator`.

## Verified Gates

Run locally on Windows with Node/npm, Python 3.11, and uv.

| Check | Command | Result |
|-------|---------|--------|
| Clean npm install | `npm ci` | pass |
| Production build | `npm run build` | pass; Level 9, Level 10, Level 11, SandboxShell, SandboxApp, and cytoscape split into their own chunks; main chunk under Vite's 500 kB warning threshold |
| Engine vitest | `npm run test:engine` | 218 / 218 |
| Web vitest | `npm run test:web` | 207 / 207 |
| Root JS tests | `npm run test` | 425 / 425 |
| Mobile Jest | `npm run test --workspace=@lab/mobile -- --runInBand` | 11 / 11 |
| Mobile typecheck | `npm run typecheck --workspace=@lab/mobile` | pass |
| Python tests | `python -m uv run pytest -q` | 92 / 92 |
| Ruff | `python -m uv run ruff check .` | pass |
| Mypy | `python -m uv run mypy src` | pass |
| Bandit | `python -m uv run bandit -q -r src` | pass |
| Python audit | `python -m uv run pip-audit` | no known Python vulns |
| Voice lint | `python scripts/voice_lint.py` | clean |
| Spec check | `python scripts/spec_check.py` | OK |
| Playwright smoke | `SMOKE_URL=<target> npm run smoke --workspace=@lab/web` | 7 / 7 locally and 7 / 7 against `https://procurement-negotiation-lab.vercel.app/` |

Current verified count: **528 unit/integration tests** passing
(92 pytest + 218 engine vitest + 207 web vitest + 11 mobile Jest), plus
**7 Playwright smoke checks** against local preview and **7 Playwright smoke
checks** against the canonical production URL.

## Remaining Caveats

### GitHub Actions

The previous `frontend` workflow failure was caused by stale `package-lock.json`.
This pass regenerates the lockfile and changes the workflow test step from
`npm run test -- --run` to `npm run test`, avoiding npm's unknown-config warning.
The push that contains this correction should be treated as the durable CI proof.

### Vercel

The active production URL is
`https://procurement-negotiation-lab.vercel.app/`. Vercel deployment for the
verified commit completed successfully and the production smoke suite passed
against the canonical URL.

### iOS Simulator / Physical Device

Not run. Windows cannot launch the iOS Simulator. Mobile Jest and TypeScript now
run locally, but native device/simulator runtime verification still requires a
Mac or EAS.

### EAS Build

Not run. Requires `eas login`. `eas.json` is present.

### Streamlit Community Cloud Deploys

Not triggered. The three repos have `DEPLOY.md` instructions, but deployment
requires user-account authentication at `share.streamlit.io`.

### Full Playwright Flow Coverage

Local preview and production smoke are verified. A broader browser suite for every new Level 9/10,
RAG/chip-map bridge, save/share, streak, and negotiate flow remains future work.

### npm Audit

`npm ci` reports npm advisories in the JavaScript dependency tree, mostly through
the Expo/mobile stack. Do not run `npm audit fix --force` blindly; that would
likely jump framework versions. Treat this as a dependency-triage workstream.

## Design Notes

### Privacy Claims Are More Correct

The lab now compares mechanisms by the information they exchange: full types
for oracle/sealed VCG, ADMM iterates plus coordinator price for CPP-style
mechanisms, prices only for price-only, and proposals for consensus averaging.
ADMM's privacy advantage is over full-type mechanisms, not over every cheaper
protocol.

### Bridges Fail Gracefully

The Level 6 chip-map bridge and Level 7 RAG bridge fetch live data over HTTPS.
If a fetch fails, the UI reports the unavailable source and keeps the local
learning flow usable.

### Negotiate Is Serverless By Design

The negotiate surface uses URL encoding, BroadcastChannel, and sessionStorage.
Cross-machine sync still requires manual URL exchange; true push sync would need
a small backend channel.

### Multi-Period Optimum Is Closed Form

Level 9's optimum uses the level's own piecewise-linear utility model and avoids
shipping a solver into the browser bundle.

### Model Studio Standardizes the Interface

Level 10 implements the BYOM pattern as typed preferences plus shared protocol:
party models provide scope, objective, constraints, and allowed outputs; the
kernel resolves scope, generates feasible menus, certifies guardrails, clears
an agreement, and emits settlement terms.

## File Map

```text
NEW (engine, with tests):
  packages/engine/src/learn/multiPeriod.ts
  packages/engine/src/learn/shareEncoder.ts
  packages/engine/src/learn/negotiationSession.ts
  packages/engine/src/learn/modelStudio.ts

NEW (web):
  apps/web/src/surfaces/learn/Level09.tsx
  apps/web/src/surfaces/learn/Level10.tsx
  apps/web/src/surfaces/negotiate/NegotiateSurface.tsx
  apps/web/src/state/streak.ts

NEW (mobile):
  apps/mobile/src/screens/learn/Level09.tsx
  apps/mobile/src/screens/learn/Level10.tsx
  apps/mobile/scripts/run-jest.cjs

EDITED (verification/reproducibility):
  package-lock.json
  apps/mobile/package.json
  apps/web/package.json
  apps/web/e2e/smoke.spec.ts
  .github/workflows/frontend.yml
```
