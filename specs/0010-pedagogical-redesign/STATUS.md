# spec 0010 - pedagogical redesign + mobile status

**Date**: 2026-05-19
**Branch**: `main`
**Original implementation report**: Claude Opus 4.7
**Independent verification and corrections**: Codex

## Current Verdict

Spec 0010 is implemented and locally reproducible after one correction pass.
The major product additions are present, the app builds, the Python and
TypeScript test suites pass, mobile Jest now runs, and the live Vercel app
passes the Playwright smoke suite.

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
| Production build | `npm run build` | pass, 182 modules |
| Engine vitest | `npm run test:engine` | 185 / 185 |
| Web vitest | `npm run test:web` | 179 / 179 |
| Root JS tests | `npm run test` | 364 / 364 |
| Mobile Jest | `npm run test --workspace=@lab/mobile -- --runInBand` | 11 / 11 |
| Mobile typecheck | `npm run typecheck --workspace=@lab/mobile` | pass |
| Python tests | `python -m uv run pytest -q` | 92 / 92 |
| Ruff | `python -m uv run ruff check .` | pass |
| Mypy | `python -m uv run mypy src` | pass |
| Bandit | `python -m uv run bandit -q -r src` | pass |
| Python audit | `python -m uv run pip-audit` | no known Python vulns |
| Voice lint | `python scripts/voice_lint.py` | clean, 75 files |
| Spec check | `python scripts/spec_check.py` | OK |
| Live Playwright smoke | `SMOKE_URL=https://procurement-negotiation-lab.vercel.app/ npm run smoke --workspace=@lab/web` | 6 / 6 |

Current verified count: **467 unit/integration tests** passing
(92 pytest + 185 engine vitest + 179 web vitest + 11 mobile Jest), plus
**6 Playwright smoke checks** against the live Vercel URL.

## Remaining Caveats

### GitHub Actions

The previous `frontend` workflow failure was caused by stale `package-lock.json`.
This pass regenerates the lockfile and changes the workflow test step from
`npm run test -- --run` to `npm run test`, avoiding npm's unknown-config warning.
The push that contains this correction should be treated as the durable CI proof.

### Vercel

The active production URL is
`https://procurement-negotiation-lab.vercel.app/`. Vercel had a ready production
deployment before this correction pass; after this pass, the production redeploy
should be rechecked against the pushed commit.

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

Live smoke is verified. A broader browser suite for every new Level 9,
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

## File Map

```text
NEW (engine, with tests):
  packages/engine/src/learn/multiPeriod.ts
  packages/engine/src/learn/shareEncoder.ts
  packages/engine/src/learn/negotiationSession.ts

NEW (web):
  apps/web/src/surfaces/learn/Level09.tsx
  apps/web/src/surfaces/negotiate/NegotiateSurface.tsx
  apps/web/src/state/streak.ts

NEW (mobile):
  apps/mobile/src/screens/learn/Level09.tsx
  apps/mobile/scripts/run-jest.cjs

EDITED (verification/reproducibility):
  package-lock.json
  apps/mobile/package.json
  apps/web/package.json
  apps/web/e2e/smoke.spec.ts
  .github/workflows/frontend.yml
```
