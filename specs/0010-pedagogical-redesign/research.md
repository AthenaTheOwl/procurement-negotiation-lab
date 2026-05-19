# research: pedagogical redesign + mobile

## Pedagogical patterns

### Brilliant.org
- One-concept-per-screen pattern: each interaction has a single
  manipulable diagram and one prompt. The reveal happens on the same
  screen via a state change, not a new page.
- Predict-then-reveal: many lessons ask the user to drag/select before
  showing the right answer.
- Building intuition before notation: geometric/visual setup precedes
  symbolic math.

### Duolingo
- Locked progression. Lessons unlock sequentially; users can't skip.
- Streaks + small daily commitments.
- Retention via spaced reviews and brief recaps before new material.
- Stickers/sounds on correct answers (lightweight gamification).

### Memrise
- Spaced repetition for vocabulary.
- Short video clips with native speakers — visual + audio anchoring.
- Quick MCQ-style checkpoints to enforce active recall.

### Jackbox Games
- Round-friendly cartoon characters with simple mood expressions.
- Phone-screen input → big-screen output divides cognitive load.
- Reveals are timed and theatrical (suspense → punchline).

### Examor (https://github.com/codeacme17/examor)
- Active recall + spaced repetition framework over user-supplied notes.
- Question-bank pattern: today's review / expired / new.
- Role-framed questions ("ask the buyer", "ask the seller") for
  perspective-taking.

## Visual / animation systems

### SVG character composition
- W3C SVG 1.1: https://www.w3.org/TR/SVG11/
- Composable `<g>` groups let us swap head / eyes / mouth / props per
  role × mood without per-frame redraw.
- Strokes: keep `stroke-width` at 3-4 px on a 64px figure for the
  "round friendly" feel.

### Lottie + Bodymovin
- LottieFiles: https://lottiefiles.com/ — free animation library.
- Lottie for web: https://github.com/airbnb/lottie-web
- Lottie for React Native: https://github.com/lottie-react-native/lottie-react-native
- Same JSON files work on both platforms.

### react-native-svg
- https://github.com/software-mansion/react-native-svg
- API parity with HTML SVG, so the `<AgentFigure>` component can be
  written once with a small platform-specific renderer abstraction.

## Mobile platform decisions

### Expo + React Native vs alternatives

**Chosen: Expo + React Native (TypeScript)**
- Single codebase iOS + Android.
- TypeScript first-class.
- EAS Build produces compiled binaries without local Xcode (mac
  build) or Android Studio (cross-compile).
- Strong community of TS+RN apps; mature.
- Expo SDK pins core peer deps so version churn is bounded.

**Considered + rejected:**
- *Flutter / Dart*: different ecosystem; can't share TS engine.
- *Native iOS (Swift) + Android (Kotlin)*: two codebases; can't share
  engine.
- *Capacitor / PWA wrapper*: doesn't give real mobile dev experience
  (which the user explicitly wants).
- *Tauri Mobile*: too early, ecosystem thin.

### Engine sharing pattern
- npm workspaces + a `packages/engine` workspace published locally to
  both `apps/web` and `apps/mobile`.
- TypeScript project references for incremental compile.
- Vite's `resolve.alias` handles `@lab/engine` in web.
- Metro (Expo's bundler) honors npm workspaces out of the box in modern
  Expo SDKs.

## Testing patterns

### Web
- vitest for unit + integration: already in use; 160 tests pass.
- @testing-library/react for component DOM assertions.
- Playwright for browser smoke (`web/e2e/smoke.spec.ts` already exists).

### Mobile
- jest-expo: standard for RN component testing.
- Detox: end-to-end on simulators (out of scope for v1).
- Storybook for primitive review (out of scope for v1).

### Cross-cutting
- Mutation testing: Stryker (`@stryker-mutator/core`) — config only in
  this pass; full runs are expensive and out of v1 critical path.
- Chaos testing: out of scope for v1 (no live services to chaos-test
  yet).

## Voice + content

### Voice spec
- Existing private spec: `C:/Users/Vignesh/.claude/plans/codex-briefs/voice-spec.md`
- Lint enforced via `scripts/voice_lint.py` (existing).
- All new copy must pass voice_lint before commit.

### Generic naming
- Replace "Northstar / Cinder / substrate crunch" in the learn surface
  with role labels (Buyer / Supplier / etc.).
- Sandbox retains the named story for power-user familiarity.

## Spec dependencies

- Spec 0001: lab visual identity → preserved in Sandbox.
- Spec 0004: α / ε / decoys → surfaced in levels 4-7.
- Spec 0005: multi-party + Shapley → level 6.
- Spec 0006: run reports → level 8 graduation handoff.
- Spec 0007: production hardening / spec_check → still enforced.
- Spec 0008: data bridges + cytoscape SourceGraph → level 6.
- Spec 0009: factory dev control plane → unaffected.

## Out of scope (future work)

- AI-generated character art.
- Native iOS or Android features (haptics, push, iPad split view).
- Localization.
- Multi-user / accounts / leaderboards.
- Live retrieval bridges beyond what spec 0008 ships.
