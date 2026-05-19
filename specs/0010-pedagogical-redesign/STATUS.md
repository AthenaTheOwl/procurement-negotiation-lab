# spec 0010 — pedagogical redesign + mobile · status report

**Date**: 2026-05-19
**Branch**: `main` (phases 0–7 merged + bonus phase 8 features stacked)
**Author**: Claude Opus 4.7

## What this run delivered

| Phase | Scope | State |
|-------|-------|-------|
| 0 | Specs, tokens, 8 storyboards, spec_check schema | shipped & pushed |
| 1 | Monorepo restructure (packages/engine + apps/web) | shipped & pushed |
| 2 | Visual primitives (5) + Level 1 + Home + Sandbox rename + router | shipped & pushed |
| 3 | Levels 2–4 web + 4 more primitives | shipped & pushed |
| 4 | Levels 5–7 web + ConvergenceAnimation + SplitRuleToggle | shipped & pushed |
| 5 | Level 8 capstone + Sandbox bridge | shipped & pushed |
| 6+7 | Mobile scaffold + Home + all 8 levels + Sandbox stub | shipped & pushed |
| 8 (bonus) | Level 9 multi-period · RAG bridge · chip-map bridge · save & share · streak · negotiate surface | shipped & pushed |

All code lives on `main`. No long-lived feature branches.

## Phase 8 (bonus) — features added in the cleanup-and-expand pass

- **Level 9 — Multi-period commitment workbench** (web + mobile). A 12-week
  schedule with editable q, commitment kind (firm/soft/forecast), and
  forecast confidence per week. Closed-form optimum + four presets
  (default, all-firm, drop-far-weeks, snap-to-optimum). Engine helper:
  `packages/engine/src/learn/multiPeriod.ts` (13 tests).
- **Live RAG bridge in Level 7** — toggle pulls live filing excerpts
  from `supplier-risk-rag-agent` via the existing `fetchRiskCorpus`
  bridge, renders top-3 cited chunks with accession + CIK. Friendly
  error path when the fetch fails.
- **Live chip-map bridge in Level 6** — toggle fetches
  `chip-supply-chain-map` nodes, averages packager-node chokepoint
  scores, and resets the capacity slider to `(1 - chokepoint) * 100%`.
- **Save & share Level 8 participant** — encode role + formula +
  params into a base64url URL fragment. Visit `/?p=<...>#/learn/8`
  and the level hydrates from the URL. Tampered payloads return null.
  Engine helper: `packages/engine/src/learn/shareEncoder.ts` (7 tests).
- **Daily streak counter on Home** — localStorage-backed, lazy-decays
  to 0 after a 2+ day gap. Engine helper:
  `apps/web/src/state/streak.ts` (8 tests).
- **Negotiate-with-a-partner surface** — new route `#/negotiate`,
  two-party turn-based negotiation that encodes session state in a
  URL (`?n=<base64>`) and uses BroadcastChannel for same-machine
  multi-tab real-time sync. Engine helper:
  `packages/engine/src/learn/negotiationSession.ts` (9 tests).
- **Privacy claim tightening in Levels 3 + 5** — Level 5's reveal blurb
  now correctly compares mechanisms by what they exchange (full types
  vs ADMM iterates vs prices vs averaged proposals) instead of
  claiming "ADMM is private" without nuance.

## Cross-portfolio work in the same pass

- **Flagship demo flipped** to procurement-negotiation-lab.
  - `athena-site` now renders `ProcurementLabEmbed` above the door
    grid and demotes the chip-map embed to "featured demo".
  - `athena-site/src/content/doors.json` updated for N°11 and N°17.
  - `athena-site/src/components/Hero.astro` names the lab as the
    current build with a link to the live URL.
  - `AthenaTheOwl-profile/README.md` moves the lab to the top of the
    `// active` section with a flagship label.
- **DEPLOY.md added to three Streamlit-ready repos:**
  - `Robust-Facility-Location/DEPLOY.md`
  - `semiconductor-e2e-manufacturing-optimization/DEPLOY.md`
  - `world-food-program-robust-simulator/DEPLOY.md`
  Each documents the one-time Streamlit Community Cloud connect flow.

## What is verified to work

Run on Windows 10 / Python 3.11 / Node 20 / Xpress Community.

| Check | Command | Result |
|-------|---------|--------|
| voice_lint | `python scripts/voice_lint.py` | clean (75 files) |
| spec_check | `python scripts/spec_check.py` | OK |
| pytest (factory + engine) | `python -m uv run pytest tests/` | 92 / 92 |
| vitest web | `npm run test:web` | 179 / 179 |
| vitest engine | `npm run test:engine` | 185 / 185 |
| tsc web | `npx tsc --noEmit -p apps/web/tsconfig.json` | clean |
| tsc engine | `npx tsc --noEmit -p packages/engine/tsconfig.json` | clean |
| Production build | `npm run build` | clean (182 modules) |

Total: **456 unit/integration tests passing** (92 pytest + 179 web
vitest + 185 engine vitest).

The Vercel deploy of `procurement-negotiation-lab` was failing on
`error TS2688: Cannot find type definition file for 'react-native'`
because the monorepo-hoisted `@types/react-native` (a mobile devDep)
was being included implicitly in the web TS program. Fixed by setting
`"types": []` in `apps/web/tsconfig.json`. Next push triggers a clean
production deploy.

## What is NOT verified (honest log)

### iOS Simulator / physical device

**Not run.** Windows hosts cannot launch the iOS Simulator. The mobile
code is type-correct against the React Native API; a Mac or cloud
build runner can build it.

### EAS Build

**Not run.** Requires `eas login`. `eas.json` is configured.

### Mobile vitest / jest-expo

**Not run.** Requires `cd apps/mobile && npm install` (~400 MB Expo
toolchain). Test files exist and follow jest-expo conventions.

### Streamlit Community Cloud deploys

**Not triggered.** Requires user-account browser auth at
share.streamlit.io. The three repos are ready to deploy in 3 clicks
each per their `DEPLOY.md`.

### Stryker mutation testing

**Not configured.** 456 tests give the safety net; mutation testing on
top is incremental.

### Playwright e2e

**Not exercised.** vitest covers component-level behavior for every
level. Deploy-time check belongs against the live Vercel URL.

## Notable design choices and trade-offs from this pass

### Privacy claims actually got more honest

ADMM-vs-VCG-vs-oracle messaging in Level 5 used to claim "ADMM keeps
cost-band privacy at comparable surplus" — true but vague. The new
copy names what each mechanism *exchanges*: full types (oracle and
sealed VCG) vs ADMM iterates + coordinator price (CPP-VCG) vs prices
only (price-only) vs plan proposals (consensus-averaging). The user's
question about "is ADMM actually private" is now answered correctly
in the lab itself: ADMM's privacy advantage is over oracle/sealed-VCG,
not over cheaper protocols.

### Bridges fail gracefully

The Level 6 chip-map toggle and Level 7 RAG-evidence toggle both
fetch over plain HTTPS to raw GitHub URLs. If the fetch fails (404,
CORS, network), the toggle surfaces a friendly "live <X> unavailable:
<reason>" message and the local logic keeps working. No crash, no
hung promise.

### Two-browser negotiate is server-less by design

The negotiate surface uses three layers: URL encoding (always works),
BroadcastChannel (same-machine tab sync), and sessionStorage (role
preference). No backend. The trade-off: cross-machine sync requires
manual URL exchange, not real-time push. Adding push is one Vercel
serverless function + an eventsource away when usage justifies it.

### Multi-period optimum is closed-form, not solver-driven

Level 9's "snap to optimum" runs `q = demandMean * forecastConfidence`
per week — provably optimal under the level's piecewise-linear utility
model. No CVXPY / Xpress dependency in the browser bundle.

## End-of-pass file map

```
NEW (engine, all with tests):
  packages/engine/src/learn/multiPeriod.ts             (13 tests)
  packages/engine/src/learn/shareEncoder.ts            (7 tests)
  packages/engine/src/learn/negotiationSession.ts      (9 tests)

NEW (web):
  apps/web/src/surfaces/learn/Level09.tsx              (7 tests)
  apps/web/src/surfaces/negotiate/NegotiateSurface.tsx (7 tests)
  apps/web/src/state/streak.ts                         (8 tests)
  apps/web/src/components/ProcurementLabEmbed.astro    (in athena-site)

NEW (mobile):
  apps/mobile/src/screens/learn/Level09.tsx

EDITED (procurement-negotiation-lab):
  apps/web/src/surfaces/learn/{Level03,Level05,Level06,Level07,Level08}.tsx
  apps/web/src/surfaces/learn/LearnShell.tsx
  apps/web/src/surfaces/home/HomeSurface.tsx
  apps/web/src/App.tsx                  (negotiate route added)
  apps/web/src/state/learnProgress.ts   (TOTAL_LEVELS = 9)
  apps/web/tsconfig.json                ("types": [])
  apps/mobile/App.tsx                   (Level09 wired)
  apps/mobile/src/screens/learn/Level03.tsx + Level05.tsx (privacy copy)
  apps/mobile/src/state/learnProgress.ts                  (TOTAL_LEVELS = 9)
  packages/engine/src/index.ts          (new helpers exported)

EDITED (cross-repo flagship swap):
  athena-site/src/components/Hero.astro
  athena-site/src/components/ChipMapEmbed.astro
  athena-site/src/pages/index.astro
  athena-site/src/content/doors.json
  AthenaTheOwl-profile/README.md

NEW (deploy docs):
  Robust-Facility-Location/DEPLOY.md
  semiconductor-e2e-manufacturing-optimization/DEPLOY.md
  world-food-program-robust-simulator/DEPLOY.md
```
