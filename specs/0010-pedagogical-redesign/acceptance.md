# acceptance: pedagogical redesign + mobile

## Pass A — Phase 0 docs

| Check | Verification |
|---|---|
| All 6 ledger docs present + 8 level storyboards + character-system + tokens.css | file presence |
| Each level storyboard ≤ 80 lines, contains copy + interaction + reveal + components | grep + line count |
| `python scripts/voice_lint.py` clean across new docs | lint exit 0 |
| `python scripts/spec_check.py` registers all R-* IDs | spec_check exit 0 |
| `specs/README.md` lists the new ledger files | grep |

## Pass B — Monorepo restructure

| Check | Verification |
|---|---|
| Root `package.json` declares `workspaces` for `packages/*` and `apps/*` | file presence |
| `packages/engine/src/` contains the model + data files | file presence |
| `apps/web/` is the relocated web app | file presence |
| `@lab/engine` is importable from `apps/web` | tsc + vite build |
| `npm test -- --run` returns 160/160 from new layout | vitest exit 0 |
| `python -m uv run pytest` returns 92+ | pytest exit 0 |
| `npx tsc --noEmit` clean | tsc exit 0 |
| Vercel preview deploy serves the Sandbox at its new path | manual smoke |

## Pass C — Visual primitives + Level 1

| Check | Verification |
|---|---|
| `AgentFigure` renders 6 roles × 4 moods | unit test |
| `QuantityKnob` accepts min/max/step/value/onChange | unit test |
| `SurplusBar` renders surplus + lost-value zones | unit test |
| `LevelShell` renders progress dots + stakes line + interaction + reveal + continue | unit test |
| `/learn/1` renders Level 1 end-to-end | Playwright + visual smoke |
| Home page has "Start playing" CTA + "Sandbox →" link | Playwright |
| Lighthouse perf on `/learn/1` ≥ 90 | Lighthouse |

## Pass D — Levels 2-4

| Check | Verification |
|---|---|
| `/learn/2` renders, drag-to-find-optimum interaction works | integration test |
| `/learn/3` renders, info-slider raises both surplus + privacy meter | integration test |
| `/learn/4` renders, deal-zone vs walkaway-zone visualization toggles | integration test |
| `PredictReveal` fires in each level | unit test |
| Click-through 1→4 has no console errors | Playwright |

## Pass E — Levels 5-7

| Check | Verification |
|---|---|
| `/learn/5` renders 3 mechanism animations (oracle, ADMM, VCG), each with a Run button | integration test |
| `/learn/6` renders cytoscape graph with a third party; split-rule toggle redraws transfers | integration test |
| `/learn/7` renders decoy outcomes + honesty toggle | integration test |
| Click-through 1→7 reachable | Playwright |

## Pass F — Level 8 + Sandbox + progress

| Check | Verification |
|---|---|
| `/learn/8` renders ParticipantBuilder + formula editor (subset) | integration test |
| "Open Sandbox" button routes to `/sandbox` | integration test |
| `/sandbox` preserves all functionality from today's Lab Arena | manual smoke |
| `learnProgress.ts` writes to `localStorage` on level completion | unit test |
| Direct URL to `/learn/N` (N > unlocked) redirects to next unlocked | integration test |
| "Reset progress" link clears state and re-locks levels | integration test |
| Reload mid-progress preserves state | integration test |

## Pass G — Mobile scaffold

| Check | Verification |
|---|---|
| `apps/mobile/` is a valid Expo project | `expo doctor` |
| `expo start` boots without errors | manual |
| Mobile primitive `AgentFigure` renders on Android Emulator | manual |
| Level 1 mobile is functionally identical to web Level 1 | manual |
| `eas.json` declares `internal` profile | file presence |
| `app.json` declares bundle id | file presence |
| jest-expo tests for mobile primitives pass | jest exit 0 |

## Pass H — Mobile Levels 2-8

| Check | Verification |
|---|---|
| All 8 levels reachable on mobile | manual (Android Emulator) |
| Touch-target sizes ≥ 44px in iOS HIG / 48dp Android M3 | manual |
| `AsyncStorage` progress matches web `localStorage` behavior | unit test |

## Pass I — Polish

| Check | Verification |
|---|---|
| Reveal animations play once on completion, do not re-trigger on re-mount | manual |
| Web at 375px width is usable | manual |
| Voice lint clean across all new strings | lint exit 0 |

## Pass J — Deploy

| Check | Verification |
|---|---|
| Vercel main deploy from `apps/web/dist/` serves the learn surface | curl + manual |
| EAS Build `internal` profile produces an .apk + .ipa | EAS logs |

## Discipline gates

Standard set + spec_check:
- voice_lint.py clean
- spec_check.py clean
- tsc clean
- vitest 160/160 + new tests pass
- pytest clean
- ruff + mypy + bandit + pip-audit clean
- npm run build clean
- (mobile) jest-expo clean

## Definition of done

- All Pass A-J checks above pass for the most recent commit on the
  `spec/0010-*` branch family.
- A non-technical visitor lands on the deployed web URL, clicks "Start
  playing," completes Levels 1-8 in 15-20 minutes, and reaches Sandbox
  with intuition for: coordination gap, surplus splitting, information
  cost, mechanism choice, multi-party fairness, audit, and how to
  author their own utility formula.
- The same user on iPhone or Android can install via TestFlight / Play
  Internal Testing and complete the same 8 levels.
- Sandbox functionality unchanged.
- All existing engine tests still 100% pass.
