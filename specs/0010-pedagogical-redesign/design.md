# design: pedagogical redesign + mobile

## Architecture summary

```
procurement-negotiation-lab/
  packages/
    engine/                       (@lab/engine — shared TS)
      src/
        model/   ← moved from web/src/model
        data/    ← moved from web/src/data
        bridges/ ← moved from web/src/model/bridges
        assets/
          lottie/                 (4 motion clips: wave, nod-yes, shake-no, walk-away)
          tokens.css              (design tokens — colors, spacing, motion)
        index.ts                  (public surface)

  apps/
    web/                          (Vite + React)
      src/
        surfaces/
          home/                   (new landing — Start playing CTA + Sandbox link)
          learn/                  (the 8-level journey)
            LearnShell.tsx
            LevelShell.tsx
            Level01.tsx .. Level08.tsx
          sandbox/                (today's Lab Arena, renamed)
        primitives/
          AgentFigure.tsx
          QuantityKnob.tsx
          SurplusBar.tsx
          PrivacyMeter.tsx
          UtilityCurve.tsx
          DealZone.tsx
          ConvergenceAnimation.tsx
          TransferLedgerVisual.tsx
          ProgressDots.tsx
          PredictReveal.tsx
        state/learnProgress.ts    (localStorage helpers)
        styles/

    mobile/                       (Expo + React Native + TypeScript)
      App.tsx
      src/
        screens/learn/Level01..08.tsx
        screens/sandbox/          (compact Sandbox subset)
        primitives/               (mirrors web/primitives shape)
        state/learnProgress.ts    (AsyncStorage helpers)
      app.json                    (Expo bundle ids: com.athenatheowl.proclab)
      eas.json                    (EAS Build config)
```

## Key design decisions

### One concept per screen
Each `LevelShell` renders exactly:
1. Top: `<ProgressDots />` showing 1..8.
2. Top-mid: one-sentence stakes line (why this matters).
3. Middle: the manipulable visual (figures + slider, curve + dragger,
   graph + toggle, etc.).
4. Bottom-left: one-sentence "your turn" prompt.
5. Bottom-right: "Continue" button (disabled until the level's
   completion condition is met).
6. Reveal panel slides in after completion with 1-2 insight sentences.

### Cross-platform primitive layout
Every primitive component file ships in both `apps/web/src/primitives/`
and `apps/mobile/src/primitives/` with the **same prop API**. The
implementation differs (HTML/SVG/Lottie-web vs RN-views/RN-SVG/
Lottie-RN), but consumers see identical typing.

Example:
```ts
type AgentFigureProps = {
  role: "buyer" | "supplier" | "packager" | "logistics" | "distributor" | "coordinator";
  mood: "neutral" | "happy" | "worried" | "walked-away";
  size?: "small" | "medium" | "large";
  onTap?: () => void;
};
```

### Shared engine
`packages/engine/src/index.ts` re-exports the public surface that today
lives in `web/src/model/`. Apps depend on `@lab/engine`:

```ts
// apps/web/src/surfaces/learn/Level02.tsx
import { algorithmResults, labTakeaway, makeScenario } from "@lab/engine";
```

This works in Vite (resolve.alias) and Metro (Expo's bundler) without
TypeScript project-reference gymnastics.

### Design tokens
A single CSS file `packages/engine/assets/tokens.css` defines:
- Colors: `--surplus-good`, `--surplus-lost`, `--walkaway-bad`,
  `--privacy-cost`, `--neutral-bg`, role-specific accent colors.
- Type scale: `--type-1` through `--type-6`.
- Spacing: `--space-1` through `--space-6` (4 / 8 / 12 / 16 / 24 / 32 px).
- Motion: `--motion-quick` (120ms), `--motion-mid` (240ms),
  `--motion-slow` (480ms).
- Border radius (lots of "round-friendly"): `--radius-pill` (999px),
  `--radius-card` (16px), `--radius-knob` (24px).

Mobile reads the same tokens via a TypeScript-typed mirror in
`packages/engine/src/tokens.ts` (the JS equivalent for RN's style
system).

### Round-friendly character system
- Body: filled circle for the head, rounded-rectangle torso, no limbs
  (or stubby limbs when needed for "walk-away"). All strokes are
  generous (3-4 px on a 64px figure).
- Per role: a single distinguishing prop (Buyer: shopping cart icon;
  Supplier: factory icon; Packager: box; Logistics: truck; Distributor:
  warehouse; Coordinator: clipboard).
- Per mood: subtle eye + mouth path swap. Neutral = straight line;
  Happy = arc up; Worried = wavy line; Walked-away = dashed silhouette
  shown 30% opacity.
- Animation clips (Lottie): each clip targets the same SVG paths so
  state transitions look continuous. Designed to be replayable
  on-demand.

### Predict-then-reveal pattern
A `<PredictReveal>` wrapper component takes a prediction prop and an
actual prop, renders an input UI (slider or radio), tracks user input,
then on submit shows whether they were within tolerance.

```tsx
<PredictReveal
  question="What will the surplus be at q=425?"
  predict="slider:0,2000"
  actual={1825}
  tolerance={150}
  onResolved={(correct, predicted) => /* ... */}
/>
```

### Sandbox link visibility
Per R-LEARN-007, the top nav of every screen contains:
- Home (logo)
- "Start playing" (primary CTA on home; disabled if already in /learn)
- "Sandbox →" (small text link, always present)

Mobile uses a Drawer or bottom-tab equivalent.

### Vercel + EAS deploy paths
- Web: Vercel build command `npm run build --workspace=apps/web`;
  output `apps/web/dist/`.
- Mobile: `eas build --platform all --profile internal` produces
  `.apk` (Android) and `.ipa` (iOS), distributed via TestFlight + Play
  Internal Testing for v1.

## Sub-systems

### Level progress state
A small typed state machine. `packages/engine/src/learnProgress.ts`
defines the shape; each app implements its own storage backend.

```ts
type LearnProgress = {
  highest_completed: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  completion_timestamps: Record<1..8, string | null>;
  last_seen_level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
};
```

Web persistence: `localStorage.proc-lab.learnProgress`.
Mobile persistence: `AsyncStorage` under the same key.

### Voice + lint
The existing `scripts/voice_lint.py` extended to scan
`apps/web/src/**/*.tsx`, `apps/web/src/**/*.ts`, and
`apps/mobile/src/**/*.{ts,tsx}`. Same regexes; same allowlist mechanism.

### Tests
- Web: vitest stays in `apps/web/`. Test files move with their source
  files. The `tests/factory/` Python tests stay at the repo root.
- Mobile: `jest-expo` for RN-specific tests of primitives. Engine
  itself is tested in `packages/engine/`.

## Cross-spec dependencies

- **Depends on spec 0001** (lab visual identity) — preserved as Sandbox.
- **Depends on spec 0004** (operational refinements) — α / ε / decoys
  appear in levels 4-7 via the existing engine.
- **Depends on spec 0005** (multi-party) — level 6 uses
  `deriveParticipants` and `multiPartyLedger`.
- **Depends on spec 0006** (run reports) — level 8 / Sandbox unchanged.
- **Depends on spec 0008** (data bridges) — level 6 reuses
  `SourceGraph` cytoscape component.
- **Composes with spec 0009** (factory) — unaffected; the factory still
  targets the lab repo at its new monorepo paths.
