# requirements: pedagogical redesign + mobile

## Scope

Specs 0001-0009 built a fully-featured mechanism-design simulator. A real
reader of the deployed app reported that the entry experience is too
dense and text-heavy. Spec 0010 rebuilds the entry experience around an
8-level guided journey using round-friendly visual primitives, and adds
a native iOS + Android mobile app sharing the same TypeScript engine via
an npm-workspaces monorepo.

The simulator engine, the Sandbox (today's Lab Arena), the factory
(`scripts/factory/`), the bridges, and the spec ledger are all
preserved unchanged. This is a *surface* redesign plus a *platform*
expansion.

References (design-only, not runtime dependencies):

- **Brilliant.org** — one-concept-per-screen, manipulable diagrams,
  predict-then-reveal pattern.
- **Duolingo** — gated progression, streaks, retention via small reviews
  before introducing a new idea.
- **Jackbox** — round-friendly characters with mood, low-effort
  high-engagement reveals.
- **Memrise** — recap-then-introduce pattern between lessons.
- **Examor** (https://github.com/codeacme17/examor) — active-recall +
  spaced-repetition idea, plus role-framed question design.

## Requirements

### R-LEARN-001: 8-level guided journey

WHEN a first-time visitor lands on the deployed app, THE SYSTEM SHALL
present a "Start playing" CTA leading to an 8-level guided journey
that builds mechanism-design intuition from first principles.

Acceptance:
- Levels are reachable at `/learn/1` through `/learn/8` on web and on
  matching mobile screens.
- Each level fits one concept per screen, with one primary interaction
  and one reveal moment.
- A first-time visitor can complete all 8 levels in 15-20 minutes total.

### R-LEARN-002: gated progression

WHEN a visitor opens the learn surface, THE SYSTEM SHALL lock levels 2+
until the prior level is completed at least once, with completion state
persisted in `localStorage` (web) and `AsyncStorage` (mobile).

Acceptance:
- Direct URL access to `/learn/N` with N > 1 redirects to the lowest
  unlocked level if the user hasn't completed N-1.
- A "Reset progress" link in the footer clears state.
- Progress dots at the top of the learn surface reflect the current
  state.

### R-LEARN-003: visual-first primitives

WHEN a level introduces a concept, THE SYSTEM SHALL render the concept
visually before any text explanation longer than two sentences.

Acceptance:
- Every level has at least one of: agent figure, surplus bar, privacy
  meter, utility curve, deal zone, transfer ledger visual, or
  convergence animation.
- No level paragraph exceeds 2 sentences in the primary interaction
  area (the reveal panel may add 1-2 more sentences of insight).

### R-LEARN-004: predict-then-reveal interaction

WHEN a level reaches its key moment, THE SYSTEM SHALL invite a user
prediction (slider, multiple-choice, or drag) before showing the
correct outcome.

Acceptance:
- At least 5 of the 8 levels include a predict-then-reveal step.
- The reveal shows whether the user's prediction was within tolerance.

### R-LEARN-005: round-friendly character system

WHEN agent figures appear, THE SYSTEM SHALL render them as
round-friendly SVG characters with role + mood variants, rendered
identically on web and mobile.

Acceptance:
- A single `<AgentFigure role={...} mood={...} />` component renders
  on web (via plain SVG) and mobile (via `react-native-svg`).
- 6 roles supported: buyer, supplier, packager, logistics, distributor,
  coordinator.
- 4 moods supported: neutral, happy, worried, walked-away.
- 4 Lottie motion clips supported for reveals: wave, nod-yes, shake-no,
  walk-away.

### R-LEARN-006: generic story scaffolding

WHEN a level introduces participants, THE SYSTEM SHALL use role names
(Buyer, Supplier, Packager, etc.) rather than the
Northstar/Cinder/Substrate-crunch names used in the existing Story.

Acceptance:
- No level UI string contains "Cinder", "Northstar", or "substrate
  crunch".
- The existing `data/story.ts` content is preserved for use in the
  Sandbox.

### R-LEARN-007: Sandbox one click from home

WHEN a repeat visitor lands on the deployed app, THE SYSTEM SHALL
present a visible "Sandbox →" link in the top nav alongside the
"Start playing" CTA.

Acceptance:
- The Sandbox link is present on the home page and on every level
  screen.
- The Sandbox routes to today's Lab Arena (renamed), with no
  functional change to its UI.

### R-MOBILE-001: native iOS + Android apps

WHEN a developer runs `expo start` from `apps/mobile/`, THE SYSTEM
SHALL launch the same 8-level journey on iOS Simulator and Android
Emulator, sharing the model engine with the web app.

Acceptance:
- `apps/mobile/` is an Expo + React Native + TypeScript project.
- All 8 levels are reachable.
- The mobile app imports from `@lab/engine` (the shared package).
- An EAS Build configuration produces `.apk` and `.ipa` artifacts.

### R-MOBILE-002: cross-platform engine

WHEN the engine evolves, THE SYSTEM SHALL share its TypeScript code
between web and mobile via a single `packages/engine` npm workspace.

Acceptance:
- `packages/engine/` exports a stable public surface (the existing
  functions in `web/src/model/` and the existing data files).
- `apps/web/` and `apps/mobile/` both depend on `@lab/engine` via
  workspace resolution.
- A change to `simulation.ts` in `packages/engine` is visible to both
  apps without a publish step.

### R-MONO-001: monorepo restructure preserves behavior

WHEN the monorepo restructure lands (Phase 1), THE SYSTEM SHALL
preserve all current functionality, tests, and the deployed Vercel
build.

Acceptance:
- `npm test -- --run` in `apps/web/` returns 160/160 (unchanged).
- `python -m uv run pytest` from the root returns 92+ (unchanged).
- Vercel preview deploy of the post-restructure branch serves the
  Sandbox successfully.

### R-SPEC-010: spec discipline

Standard. Same shape as specs 0001-0009.

Acceptance:
- Every R-* requirement maps to tasks and acceptance checks.
- `traceability.md` kept current.
- `research.md` cites the references named above.
- `ops/run-ledger.md` gets entries per phase.

## Out of scope

- User accounts, leaderboards, cross-device sync.
- Localization.
- New scenarios beyond the 11 currently in `data/scenarios.ts`.
- New mechanisms beyond what `simulation.ts` already provides.
- AI-generated character variations.
- Native-only iOS or Android features (haptics, push notifications,
  iPad split-view, Android wear, etc.).
- App Store / Google Play public release. Internal testing
  distribution (TestFlight + Play Internal Testing) is the v1 success
  bar.
