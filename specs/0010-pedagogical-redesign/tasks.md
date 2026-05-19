# tasks: pedagogical redesign + mobile

Build order: Phase 0 (this commit) → Phase 1 (monorepo) → Phase 2 (Level 1
+ primitives) → Phases 3-5 (Levels 2-8 + Sandbox + progress) → Phase 6-7
(mobile) → Phase 8 (polish) → Phase 9 (deploy).

Each phase ends with a full gate sweep before the next begins.

## Phase 0 — storyboards + design tokens + character spec (no code)

- [ ] **A1**: Finalize `requirements.md`, `design.md`, `acceptance.md`,
  `tasks.md`, `research.md`, `traceability.md`, `character-system.md`.
  *(R-SPEC-010)*
- [ ] **A2**: Write 8 storyboards under `levels/01.md`-`08.md`. Each ≤ 80
  lines, in-voice (voice_lint clean), with copy + interaction + reveal
  + components list. *(R-LEARN-001, R-LEARN-003, R-LEARN-004)*
- [ ] **A3**: Draft `tokens.css` (colors, type, spacing, motion, radius).
  *(R-LEARN-003, R-LEARN-005)*
- [ ] **A4**: Register spec 0010 in `specs/README.md`. *(R-SPEC-010)*
- [ ] **A5**: Phase-0 gate sweep: voice_lint clean on all new docs;
  spec_check picks up new R-* IDs. *(R-SPEC-010)*

## Phase 1 — monorepo restructure

- [ ] **B1**: Create npm workspaces config at the repo root
  (`package.json` → `"workspaces": ["packages/*", "apps/*"]`).
  *(R-MONO-001)*
- [ ] **B2**: Move `web/src/model/` and `web/src/data/` to
  `packages/engine/src/`. Update imports across all dependents.
  *(R-MOBILE-002)*
- [ ] **B3**: Move `web/` to `apps/web/`. Update `vite.config.ts`,
  `tsconfig.json`, vitest config, package.json scripts. *(R-MONO-001)*
- [ ] **B4**: Add `@lab/engine` package entry (`packages/engine/package.json`,
  `tsconfig.json`, `src/index.ts` re-exporting the public surface).
  *(R-MOBILE-002)*
- [ ] **B5**: Run full test sweep: vitest 160/160, pytest 92, tsc clean,
  ruff clean, mypy clean, spec_check OK. *(R-MONO-001)*
- [ ] **B6**: Verify Vercel preview deploy serves Sandbox (unchanged
  behavior). *(R-MONO-001)*

## Phase 2 — visual primitives + Level 1 (web)

- [ ] **C1**: Build `AgentFigure.tsx` (SVG, role × mood matrix, 6 roles ×
  4 moods). *(R-LEARN-005)*
- [ ] **C2**: Build `QuantityKnob.tsx`, `SurplusBar.tsx`,
  `ProgressDots.tsx`, `LevelShell.tsx`. *(R-LEARN-003)*
- [ ] **C3**: Build `Level01.tsx` — "there is a gap" — wire to engine
  via `algorithmResults`. *(R-LEARN-001)*
- [ ] **C4**: Route `apps/web/src/App.tsx` so `/learn/1` renders
  `LevelShell` with `Level01` content. Home gets "Start playing" CTA
  + "Sandbox →" nav link. *(R-LEARN-001, R-LEARN-007)*
- [ ] **C5**: Unit tests for primitives (vitest +
  @testing-library/react). *(R-SPEC-010)*
- [ ] **C6**: Phase-2 gate sweep. *(R-SPEC-010)*

## Phase 3 — Levels 2-4 (web)

- [ ] **D1**: Build `UtilityCurve.tsx`, `PrivacyMeter.tsx`,
  `DealZone.tsx`, `PredictReveal.tsx`. *(R-LEARN-003, R-LEARN-004)*
- [ ] **D2**: Build `Level02.tsx`, `Level03.tsx`, `Level04.tsx`.
  *(R-LEARN-001)*
- [ ] **D3**: Unit tests + at least one integration test per level
  (mount the level, simulate the primary interaction, assert reveal
  state). *(R-SPEC-010)*
- [ ] **D4**: Phase-3 gate sweep. *(R-SPEC-010)*

## Phase 4 — Levels 5-7 (web)

- [ ] **E1**: Build `ConvergenceAnimation.tsx`,
  `TransferLedgerVisual.tsx`. *(R-LEARN-003)*
- [ ] **E2**: Build `Level05.tsx`, `Level06.tsx`, `Level07.tsx`.
  *(R-LEARN-001)*
- [ ] **E3**: Unit + integration tests. *(R-SPEC-010)*
- [ ] **E4**: Phase-4 gate sweep. *(R-SPEC-010)*

## Phase 5 — Level 8 + Sandbox + progress state

- [ ] **F1**: Build `Level08.tsx` (simplified ParticipantBuilder +
  formula editor wrapper, with one-click "Open Sandbox" handoff).
  *(R-LEARN-001)*
- [ ] **F2**: Move today's `LabSurface` content to `surfaces/sandbox/`.
  Route at `/sandbox`. Preserve all functionality. *(R-LEARN-007)*
- [ ] **F3**: Build `state/learnProgress.ts` with web `localStorage`
  backend. Gate level navigation: cannot jump to N+1 before N done.
  *(R-LEARN-002)*
- [ ] **F4**: Wire the home page to show progress dots + "Continue at
  Level N" when state is non-empty. *(R-LEARN-002)*
- [ ] **F5**: Add `Sandbox →` link to nav on every screen. *(R-LEARN-007)*
- [ ] **F6**: Integration test: click through 1→8, reach Sandbox,
  reload partway, resume at right level. *(R-SPEC-010)*
- [ ] **F7**: Phase-5 gate sweep. *(R-SPEC-010)*

## Phase 6 — mobile scaffold

- [ ] **G1**: Create `apps/mobile/` via `npx create-expo-app` with
  TypeScript template. *(R-MOBILE-001)*
- [ ] **G2**: Wire `@lab/engine` workspace dependency. Add
  `lottie-react-native`, `react-native-svg`,
  `@react-native-async-storage/async-storage`,
  `@react-navigation/native`, `@react-navigation/native-stack`.
  *(R-MOBILE-001, R-MOBILE-002)*
- [ ] **G3**: Build mobile primitives (mirror web primitive API; RN-SVG
  + Lottie-RN under the hood). *(R-LEARN-005)*
- [ ] **G4**: Mobile `LevelShell` + `Level01` screen. *(R-LEARN-001)*
- [ ] **G5**: `app.json` (bundle id `com.athenatheowl.proclab`,
  app name, icons placeholder). *(R-MOBILE-001)*
- [ ] **G6**: `eas.json` with `internal` profile (TestFlight + Play
  Internal Testing). *(R-MOBILE-001)*
- [ ] **G7**: jest-expo test for primitives. *(R-SPEC-010)*

## Phase 7 — mobile Levels 2-8

- [ ] **H1**: Port Levels 2-8 to mobile screens. *(R-LEARN-001)*
- [ ] **H2**: Mobile `learnProgress` with `AsyncStorage`. *(R-LEARN-002)*
- [ ] **H3**: Touch-friendly slider ergonomics; mobile-shaped layouts
  (single column, 44px tap targets). *(R-LEARN-003)*
- [ ] **H4**: Phase-7 gate sweep. *(R-SPEC-010)*

## Phase 8 — polish + cross-platform QA

- [ ] **I1**: Reveal animations (framer-motion web; Reanimated/Lottie
  mobile). *(R-LEARN-004)*
- [ ] **I2**: Mobile-responsive double-check on web at 375px width.
  *(R-LEARN-003)*
- [ ] **I3**: Dark mode tokens (optional). *(R-LEARN-003)*
- [ ] **I4**: Voice + lint full sweep (banned phrases + structural
  patterns) across all new copy. *(R-SPEC-010)*

## Phase 9 — deploy

- [ ] **J1**: Vercel build config updated for monorepo
  (`apps/web/dist/`). *(R-MONO-001)*
- [ ] **J2**: EAS Build internal profile produces `.apk` + `.ipa`.
  *(R-MOBILE-001)*
- [ ] **J3**: Sandbox URL still works; learn surface live. *(R-LEARN-001)*

## Spec discipline (S*)

- [ ] **S1**: Register in `specs/README.md`. *(R-SPEC-010)*
- [ ] **S2**: Update `traceability.md` as tasks ship. *(R-SPEC-010)*
- [ ] **S3**: Append `ops/run-ledger.md` per phase. *(R-SPEC-010)*

## Discipline gates

Every phase ends with:
- `python scripts/voice_lint.py` clean
- `python scripts/spec_check.py` clean
- `npx tsc --noEmit` clean (web)
- `npm test -- --run` clean (web vitest)
- `python -m uv run pytest` clean
- `python -m uv run ruff check .` clean
- `python -m uv run mypy src` clean
- `npm run build` clean (web)
- Mobile phases additionally: `npm test -- --workspace=apps/mobile` clean
  (jest-expo)
