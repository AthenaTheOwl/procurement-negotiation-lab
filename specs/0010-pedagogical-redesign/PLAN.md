# spec 0010 — pedagogical redesign + mobile (planning draft)

> Direction confirmed: round-friendly characters · native iOS + Android
> apps alongside the web · generic role naming (no Cinder/Northstar) ·
> Sandbox one click from home for repeat visitors · open time budget.
> This single doc captures the full direction; the 6-doc ledger
> (`requirements / design / tasks / acceptance / research / traceability`)
> mirrors specs 0001-0009 and lives next to this file.

## 1. Diagnosis: what's actually wrong

The current Vercel app fails on three counts a Brilliant/Duolingo-style
learner would feel immediately:

1. **Density.** A first-time visitor who clicks "Lab arena" sees 11+ section
   headers on a single scroll: preset grid, problem sliders, agent picker,
   reliability sliders, behavioral knobs, α slider, ε slider, info-mode
   dropdown, algorithm comparison table, oracle-gap bar chart, ε-frontier
   panel, info-sweep panel, CBT ledger, decoy audit, multi-party ledger,
   CSV import, bridges, run report. The "Tutorial" surface has 6 cards in
   a grid; the Arc has 8 steps each with a thesis paragraph.
2. **Text-first.** Every concept is introduced via paragraphs. There are no
   diagrams. Bar charts are the closest thing to visuals, and they live
   downstream of the abstract knobs.
3. **No progression.** Everything is accessible at once. Nothing tells the
   user *where to start*, *what they're learning*, or *whether they've
   gotten it*. The "Play the case" surface has a notion of beats, but the
   beats are also text-heavy and reveal more text.

A reader who isn't already a mechanism design fluent person — which is
most of the audience — bounces.

## 2. Design principles (first principles from learning apps)

Patterns from Brilliant, Duolingo, Memrise, Jackbox, plus light influence
from examor (active recall):

1. **One concept per screen.** Every screen has *one* claim, *one*
   interaction, *one* outcome.
2. **Visual before symbolic.** Show two figures negotiating before the
   word "utility." Show a coordination gap as a money bar before the term
   "oracle gap." Introduce α, ε, etc. only after the geometric intuition
   is in place.
3. **Manipulable diagrams.** No static images. Every diagram has a slider,
   toggle, or drag affordance, and updates live.
4. **Build complexity gradually.** Two parties → one knob → settle → split
   surplus → information mode → mechanism choice → multi-party → audit →
   author your own.
5. **Instant feedback.** Drag the slider and see the surplus bar change in
   the same frame. No "click to compute" buttons.
6. **Predict-then-reveal.** Before showing the right answer, ask the user
   to guess (radio buttons or a slider with a "lock in" button). Reveal
   shows correctness — Jackbox / Brilliant pattern.
7. **Progression with locks.** Levels gate on completion. The user can't
   jump from level 1 to "author your own utility formula" — that's
   level 8, reached only by passing 1-7.
8. **Author mode = graduation.** Today's Lab Arena is the graduation tier.
   Most users finish at level 7. The few who finish reach the existing
   sandbox, now reframed as "Sandbox" (a power-user mode).
9. **Stakes are clear at every step.** Each level opens with one sentence
   on *why this matters operationally* (CFO budget, customer launch,
   supplier walking), grounded in the current "Substrate crunch" story.
10. **Retention via small reviews.** Each new level opens with a 5-second
    "remember from last level…" recap, before introducing the new idea.

## 3. The new experience (level-by-level)

Numbers are wireframe-level, not final copy. Each level is 1-3 minutes.

### Level 1 — There is a gap

**Setup screen.** Two figures: Northstar buyer (you), Cinder supplier.
"You want 500 substrates by Q4. Cinder has 350 ready. Click *settle* and
see what happens."

**Interaction.** Big "Settle now" button.

**Reveal.** Both parties end up at 350 (the smaller number). A money-bar
above shows `coordination gap: $X` — value lost because the two plans
didn't meet.

**Insight (one sentence).** *Locally optimal plans on each side can
collectively leave money on the table.*

**No knobs yet.** No α, no ε, no info mode. Just the gap.

### Level 2 — Close the gap

**Setup.** Same two figures. Above them, a single slider: "Negotiated
quantity." Below, a money-bar that *grows* and *shrinks* as you drag.

**Interaction.** Drag to find the maximum surplus.

**Reveal.** When you hit the optimum, a green checkmark and a moving
ribbon. Below: "the joint optimum is at q = 425. You found it."

**Insight.** *There's a sweet spot where the joint value is maximized. It
isn't always the average.*

### Level 3 — Information moves the sweet spot

**Setup.** Same two-figure layout. A new slider: "Information shared"
(private → risk-only → forecast band → full disclosure).

**Interaction.** Drag the info slider. Watch two things move:
- The achievable maximum surplus (rises).
- A "privacy exposed" meter (also rises).

**Reveal.** "Full info gets you to the math optimum. But Cinder can see
your launch deadline now. You traded leverage for value."

**Insight.** *More information shrinks the gap. But information has a
price.*

### Level 4 — Splitting the surplus

**Setup.** Two utility curves drawn side by side. Each has a horizontal
"outside option" line (their walkaway threshold). A vertical slider
between them: "Buyer's share of the surplus."

**Interaction.** Drag the share. Watch both parties' total-utility
markers move.

**Reveal.** Two zones light up:
- **Deal zone** (green): both markers above their outside option.
- **Walkaway zone** (red): at least one party would refuse.

**Insight.** *A deal needs both parties no worse off than their
walkaway. Otherwise the plan stays on paper.*

### Level 5 — How the rule changes the dance

**Setup.** Same scenario, three side-by-side mini-animations:
- **Centralized oracle** (one planner sets q directly)
- **CPP/ADMM** (planner & supplier exchange price/quantity signals over
  rounds; small grid of arrows showing convergence)
- **VCG with transfers** (planner pays supplier a transfer to internalize
  the externality)

**Interaction.** Press "Run" on each. Watch the convergence animations.

**Reveal.** A 3-column table:
- Final surplus
- Info exposed
- Rounds to convergence

**Insight.** *Different mechanisms reach different deals with different
privacy/welfare/runtime tradeoffs.*

### Level 6 — A third party

**Setup.** The two figures become a graph (cytoscape — already in the
codebase via spec 0008). A third node appears: a packager. Edges show
capacity dependencies.

**Interaction.** Drag the packager's capacity slider. Watch the buyer's
achievable q drop.

**Reveal.** The CBT ledger expands from 2 rows to 3. Buttons for split
rule: proportional / equal / **Shapley**. Each toggle redraws the
transfer arrows.

**Insight.** *Multi-party adds fairness questions: who shares how much
of the surplus? Shapley values are one answered question.*

### Level 7 — Audit the inputs

**Setup.** A toggle: "Are participants honest?" Above the toggle, a
small chart of the decoy outcomes from `decoys.ts`.

**Interaction.** Flip the toggle. Watch the predicted-vs-actual lines
diverge when dishonesty is on.

**Reveal.** "Audit mode catches the gap between what Cinder said and
what they did under decoys."

**Insight.** *Mechanism design solves the negotiation when inputs are
honest. Audit catches dishonest inputs. Both layers matter.*

### Level 8 — Author your own

**Setup.** "You've seen the lab's defaults. Now build a participant from
scratch."

**Interaction.** A simplified version of the existing
`ParticipantBuilder` + formula editor. Pick a role, edit a utility
formula, see it solve in real time.

**Reveal.** "Open the Sandbox to combine everything you've seen with
your own math."

**Graduation.** A button: "Open the full Sandbox" → today's Lab Arena,
renamed.

## 4. Visual primitives we'll need

Reusable React components. Most are net-new; some can reuse logic from
the existing engine.

| Component | Purpose | Built from |
|---|---|---|
| `<AgentFigure />` | Single character (buyer, supplier, packager, etc.) with role, name, mood | new (SVG) |
| `<QuantityKnob />` | Big slider with units + min/max | new |
| `<SurplusBar />` | Color-changing horizontal bar | new |
| `<PrivacyMeter />` | Small upward meter with tick marks | new |
| `<UtilityCurve />` | Per-party utility curve with outside-option line | new (SVG / lightweight charting) |
| `<ConvergenceAnimation />` | Small grid showing iterative price/quantity exchange | new |
| `<DealZone />` | Two-axis chart with green/red zones | new |
| `<TransferLedgerVisual />` | Multi-party CBT ledger as arrows on the cytoscape graph | reuse `SourceGraph.tsx` + new overlay |
| `<LevelShell />` | Header + scenario beat + interaction + reveal + continue | new |
| `<ProgressDots />` | Top-of-screen progress indicator 1/8…8/8 | new |
| `<PredictReveal />` | "What do you think will happen?" → guess → reveal | new (Jackbox pattern) |

CSS-side: a small design-system pass. Type scale, color tokens for the
"surplus-good / walkaway-bad / privacy-cost" semantic colors, motion
tokens for the reveal animation. Currently styles.css is one flat file;
the redesign earns a small split.

## 5. What stays, what gets replaced

**Stays unchanged (the engine is fine — only the surface is broken):**
- `web/src/model/simulation.ts` — the joint-utility / oracle / ADMM /
  VCG / mechanism comparison
- `web/src/model/scenarioSchema.ts`, `scenarioMigrate.ts`
- `web/src/model/participants.ts`, `shapleyTransfer.ts`
- `web/src/model/runReport.ts`, `reportStorage.ts`
- `web/src/model/bridges/*` (CSV, chip-map, supplier-risk, provenance)
- `web/src/model/decoys.ts`, `formula.ts`
- `web/src/data/*` (scenarios, story, agents, strategies, glossary)
- The whole `scripts/factory/` agent factory (separate concern)
- All current tests (the redesign is additive; doesn't change behavior)

**Renamed (today's lab = graduation tier):**
- "Lab arena" (current main surface) → **"Sandbox"** — power-user mode,
  reached only from Level 8

**Replaced:**
- `web/src/App.tsx` — new entry experience. Today's surfaces become
  reachable from a "Sandbox" nav link, not the home page.
- `web/src/surfaces/ArcSurface.tsx` — collapses into the new
  `LevelShell` system. The 8 Arc steps become 7 levels + 1 graduation.
- `PlaySurface` (the beat-based decision game) — folded into Levels 1-4
  as the *story stakes* layer. The story content (substrate-crunch
  beats) stays, but the surface that renders them is the new `LevelShell`.
- `StudySurface` — gone. The tutorial cards become inline explanations
  within each level (one sentence each), not a separate tab.

**Net result on the home page:** a clear "Start playing" CTA. No tab bar
to choose between four surfaces. Sandbox is a small link in the corner
for visitors who already know what they're doing.

## 6. Implementation phases

Phasing matters because this is a several-evening lift and you'll want
to react after each phase before committing the next.

### Phase 0 — storyboard + design tokens (no React code)
Output: a single markdown doc per level (`specs/0010-*/levels/01.md`
through `08.md`) with the exact copy, interaction, reveal, and component
list per level. Plus a `styles/tokens.css` draft with the new color +
motion tokens.
**Done when:** all 8 level docs read in voice, no antithetical reversals
(voice_lint catches), each fits in ≤ 80 lines.

### Phase 1 — visual primitive library + Level 1
Build the small primitives: `<AgentFigure />`, `<QuantityKnob />`,
`<SurplusBar />`, `<LevelShell />`, `<ProgressDots />`. Wire them into a
single new route `/learn/1` that renders Level 1 end to end.
**Done when:** a fresh visitor can land on `/learn/1`, see the buyer
and supplier figures, click "Settle now," and see the gap revealed.
Lighthouse perf score for that page ≥ 90.

### Phase 2 — Levels 2-4 (gap, info, split)
Add `<UtilityCurve />` and `<PrivacyMeter />` and `<DealZone />`. Wire
levels 2, 3, 4 against existing simulation engine.
**Done when:** all four levels pass a Playwright smoke (already in the
factory) without a console error; voice_lint clean.

### Phase 3 — Levels 5-7 (mechanism, multi-party, audit)
Hook into `algorithmResults()`, the cytoscape `SourceGraph`, the decoy
audit, and the multi-party transfer ledger. Build
`<ConvergenceAnimation />` and `<TransferLedgerVisual />`.
**Done when:** all seven levels reachable end to end; user can click
through 1→7 without text overload.

### Phase 4 — Level 8 + Sandbox graduation
Level 8 is the simplified `ParticipantBuilder` + formula editor.
Sandbox link routes to today's `LabSurface` (re-titled, not rebuilt).
**Done when:** a path exists from Level 1 → Level 8 → Sandbox, and the
Sandbox still works exactly as it does today.

### Phase 5 — progression + persistence
LocalStorage-backed "completed levels" state. Lock levels until the
prior is done. Show progress dots. Add a "reset progress" link in the
footer.
**Done when:** reload-mid-progress preserves state; completing a level
unlocks the next; progress dots reflect current state.

### Phase 6 — polish (optional, if budget allows)
Reveal animations (framer-motion), subtle sound effects, achievement
badges, "share your run" via the existing `RunReportPanel` exported as
a level-8 result. Mobile responsiveness pass.

### Out of scope (for this spec)
- New scenarios beyond the existing 11
- New algorithms or mechanisms beyond what `simulation.ts` ships
- Server-side persistence (user accounts, leaderboards, etc.)
- Localization beyond English

## 7. Critical files

```
NEW:
  web/src/surfaces/learn/                          (whole new surface tree)
    LearnShell.tsx                                 (route shell + progress dots)
    LevelShell.tsx                                 (per-level layout)
    Level01.tsx through Level08.tsx
    primitives/                                    (the visual library)
      AgentFigure.tsx
      QuantityKnob.tsx
      SurplusBar.tsx
      PrivacyMeter.tsx
      UtilityCurve.tsx
      ConvergenceAnimation.tsx
      DealZone.tsx
      TransferLedgerVisual.tsx
      ProgressDots.tsx
      PredictReveal.tsx
  web/src/styles/tokens.css                        (new design tokens)
  web/src/styles/learn.css                         (level-specific styles)
  web/src/state/learnProgress.ts                   (localStorage helpers)

EDITED:
  web/src/App.tsx                                  (new home page CTA;
                                                    today's surfaces become
                                                    routes under /sandbox/)
  web/src/styles.css                               (extract tokens; reduce
                                                    monolithic file)

RENAMED / RELOCATED:
  web/src/surfaces/ArcSurface.tsx                  → kept on /sandbox/arc
                                                    as legacy view, not
                                                    surfaced from home
  Lab Arena (the section in App.tsx)               → /sandbox

DOCS:
  specs/0010-pedagogical-redesign/                 (this folder, expands to
                                                    full 6-doc ledger after
                                                    you approve direction)
  specs/0010-pedagogical-redesign/levels/*.md      (per-level storyboards)
```

## 8. Verification

Per phase, a clear acceptance check.

```
Phase 0:  All level docs exist, ≤ 80 lines each, voice_lint clean.
Phase 1:  /learn/1 renders. AgentFigure + QuantityKnob + SurplusBar work
          in tests. Lighthouse perf ≥ 90 on /learn/1.
Phase 2:  /learn/1 → /learn/4 click-through, no console errors.
Phase 3:  Full /learn/1 → /learn/7 reachable. Playwright smoke runs each.
Phase 4:  /learn/8 → /sandbox path works. Today's Lab Arena intact.
Phase 5:  localStorage progress survives reload; locks enforce ordering.
Phase 6:  Animations, mobile pass, optional badges.
```

End-to-end success for the user's friend: they land on
`procurement-negotiation-lab.vercel.app`, click "Start playing," and 15
minutes later they can articulate (in their own words) what a
coordination gap is, why VCG transfers exist, and the privacy/welfare
tradeoff — without having read a single paragraph of text longer than
two sentences.

## 9. Why this scope, not less / not more

- **Why not just simplify the Lab Arena?** The Lab is *the graduation
  tier*. Its density is correct for someone who already knows what α
  does. The wrong audience is hitting it as the entry point. Fix:
  reroute the entry, don't degrade the Lab.
- **Why not Brilliant-grade animations everywhere?** Reveal animations
  matter, but the bigger win is *single-concept screens* and *manipulable
  diagrams*. Animation is the polish layer (Phase 6), not the spine.
- **Why preserve the existing engine code?** It's correct, tested, and
  composes with specs 0005-0009. The redesign is a *surface* problem,
  not a model problem.
- **Why use the existing spec ledger pattern?** Specs 0001-0009 each
  shipped with a 6-doc ledger and a clear "done" definition. Spec 0010
  is the same shape — measurable, scoped, and verifiable.

## 10. Direction (confirmed)

1. **Visual style:** round, friendly characters. See §11 for the SVG +
   Lottie composition system. Built once, reused across web + mobile.
2. **Mobile:** native iOS + Android. Built with **Expo + React Native**
   (TypeScript, single codebase). Pulls the model from a shared
   `packages/engine` workspace so the web app and the mobile app share
   the simulation, scenarios, schemas, and persistence layer.
3. **Story:** **generic**. Drop "Northstar buyer" / "Cinder supplier"
   from the levels. Use role names (Buyer / Supplier / Packager /
   Logistics / Distributor / Coordinator). The Sandbox preserves the
   existing scenario data files for power-user named scenarios.
4. **Sandbox visibility:** **one click from home** for repeat visitors.
   A small persistent "Sandbox →" link sits in the top nav; the primary
   CTA stays "Start playing".
5. **Time budget:** open. The plan proceeds linearly through phases; no
   compressed cuts.

## 11. Character + animation system

Round-friendly characters that work identically on web and mobile.

**SVG composition** (web + mobile via `react-native-svg`):
- Per role: one base body silhouette + 4 mood variants (`neutral`,
  `happy`, `worried`, `walked-away`).
- Body parts as composable `<g>` groups: head, torso, props (e.g. a
  factory icon for `supplier`, a clipboard for `coordinator`).
- A single `<AgentFigure role="supplier" mood="worried" />` component
  resolves to the right SVG. Same component file in web + mobile.

**Lottie for transitions** (web via `lottie-web`, mobile via
`lottie-react-native`):
- 4 motion clips, each ~1 second: `wave-on-arrival`, `nod-yes`,
  `shake-no`, `walk-away`. Played during reveal moments.
- Lottie JSON files live in `packages/engine/assets/lottie/` so both
  apps load from the same source.

**Why not Framer Motion / Reanimated?** Both can do the same things,
but Lottie gives a clean designer handoff and the JSON files are
identical between web and mobile. The redesign deliberately *isn't*
designer-led — round characters can be hand-built with simple SVGs
and Lottie's free libraries (LottieFiles, IconScout) supply the
4 motion clips we need.

## 12. Monorepo restructure

The current repo has `web/` at the root. The redesign + mobile means
restructuring into npm workspaces. This is the **single largest
risk** of the spec, so it gets a dedicated phase and tested in
isolation before any pedagogy code lands.

**Target layout:**

```
procurement-negotiation-lab/                (repo root)
  package.json                              (workspaces root)
  pyproject.toml                            (unchanged — Python side)
  src/procurement_lab/                      (unchanged — Python engine)
  scripts/                                  (unchanged — factory, voice_lint, spec_check)
  specs/                                    (unchanged)
  tests/                                    (unchanged — Python pytest)
  ops/                                      (unchanged)
  docs/                                     (unchanged)

  packages/
    engine/                                 (shared TS engine — moved from web/src/model + web/src/data)
      package.json                          (name: @lab/engine)
      tsconfig.json
      src/
        model/                              (simulation, schemas, scenarios, etc.)
        data/                               (agents, strategies, story, glossary, arc, scenarios)
        bridges/                            (csv, chip-map, supplier-risk, provenance)
        assets/
          lottie/                           (4 motion clips)
        index.ts                            (re-exports the public surface)

  apps/
    web/                                    (Vite + React)
      package.json                          (depends on @lab/engine)
      vite.config.ts                        (alias for @lab/engine)
      tsconfig.json
      src/
        surfaces/learn/                     (the new pedagogical UX)
        surfaces/sandbox/                   (renamed current Lab Arena + Arc + Tutorial)
        primitives/                         (AgentFigure, QuantityKnob, SurplusBar, etc.)
        styles/

    mobile/                                 (Expo + React Native)
      package.json                          (depends on @lab/engine; expo, react-native, lottie-react-native, react-native-svg)
      app.json                              (Expo config; bundle ids)
      App.tsx                               (entry)
      src/
        screens/learn/                      (mobile-shaped Level 1..8)
        screens/sandbox/                    (compact sandbox; subset of web Sandbox)
        primitives/                         (mirrors web/primitives shape)
        styles/
      eas.json                              (EAS Build config for iOS+Android binaries)
```

**Why shared `packages/engine`:** the model is pure TypeScript; sharing
it means level 1's "surplus bar" runs against the same
`labTakeaway()` as the Sandbox runs in the web app and the mobile app.
One bug fix benefits all three surfaces.

**Tooling decisions:**
- **npm workspaces** (not pnpm) — repo already uses npm; lowest disruption.
- **TypeScript project references** — `apps/*/tsconfig.json` references
  `packages/engine/tsconfig.json`. Vite + Metro both honor this.
- **Vitest stays at `apps/web/`** — runs against web-side code.
  Engine tests move to `packages/engine/` and run with vitest there.
  Mobile gets `jest-expo` for RN-specific tests.
- **No formal CI restructure for v1** — keep existing GitHub workflows
  pointed at the root; they call the right scripts in apps/* via
  workspace-aware npm commands.

## 13. Implementation phases (revised for mobile + monorepo)

Phases are still sequential; total estimate is ~10-12 evenings of work
once Phase 0 is in.

### Phase 0 — storyboards + design tokens + character spec (no React code)
Output:
- 8 level storyboard docs in `specs/0010-pedagogical-redesign/levels/`
  (one per level, with copy + interactions + reveals + components)
- `packages/engine/assets/tokens.css` (design tokens — colors, spacing,
  motion). Web and mobile both consume.
- `specs/0010-pedagogical-redesign/character-system.md` (SVG composition
  spec — what each role looks like, what each mood does)
**Status:** delivered in *this* commit. See §15 for sub-deliverables.

### Phase 1 — monorepo restructure
Move `web/` to `apps/web/`. Extract `web/src/model/` and `web/src/data/`
to `packages/engine/`. Update all imports. Update vitest, tsc, vite.
**Done when:** `npm test -- --run` still 160/160 from the new path;
`npm run build` from `apps/web/` builds clean; deployed Vercel still
serves the lab (no functional change, just relocation).

### Phase 2 — visual primitive library + Level 1 (web only)
Build the small primitives: `<AgentFigure />`, `<QuantityKnob />`,
`<SurplusBar />`, `<LevelShell />`, `<ProgressDots />`. Wire them into
a single new route `/learn/1` rendering Level 1.
**Done when:** a visitor lands on `/learn/1`, sees two figures, clicks
Settle, sees the gap revealed. Lighthouse perf ≥ 90.

### Phase 3 — Levels 2-4 (web)
`<UtilityCurve />`, `<PrivacyMeter />`, `<DealZone />`. Levels 2-4
wired to existing engine. Predict-then-reveal pattern in each.
**Done when:** click-through 1→4 with no console errors;
voice_lint clean; Playwright smoke updated.

### Phase 4 — Levels 5-7 (web)
`<ConvergenceAnimation />`, `<TransferLedgerVisual />` (overlays on
cytoscape). Levels 5-7 wired against algorithm comparison + multi-party
ledger + decoy audit.
**Done when:** click-through 1→7 reachable; Playwright smoke covers it.

### Phase 5 — Level 8 + Sandbox rename + persistent progress
Level 8 = simplified ParticipantBuilder + formula editor.
Today's `LabSurface` becomes `/sandbox` (renamed). `Sandbox →` nav link
visible from level 2+ (and on the home page).
`localStorage`-backed `learnProgress.ts` locks levels until prior done.
**Done when:** path Level 1 → Level 8 → Sandbox works; reload preserves
state; Sandbox functionality unchanged from today.

### Phase 6 — mobile scaffold
Spin up `apps/mobile/` with Expo. Wire up navigation (expo-router or
react-navigation). Implement Level 1 on mobile to validate the
shared-engine pattern + react-native-svg AgentFigure + lottie-react-native
animations.
**Done when:** `expo start` runs the app on iOS Simulator + Android
Emulator. Level 1 functionally identical to the web version.

### Phase 7 — Levels 2-8 on mobile
Port the rest of the levels to the mobile app. Touch-friendly slider
ergonomics. Mobile-shaped layouts (single column, larger tap targets,
swipe between levels).
**Done when:** Level 1-8 reachable on mobile. EAS Build produces an
.apk and .ipa.

### Phase 8 — polish + cross-platform QA
Reveal animations, sound effects (optional), mobile responsiveness
double-check on web at 375px width, mobile orientation handling, dark
mode pass.

### Phase 9 — deploy
Web: redeploy Vercel from `apps/web/dist/`. Vercel config update.
Mobile: EAS Build → TestFlight (iOS) + Google Play Internal Testing
(Android). Not required to ship publicly for v1 — internal testing
distribution is the success bar.

### Out of scope (deliberately deferred to spec 0011 or later)
- User accounts / leaderboards / cross-device sync
- Localization
- New scenarios beyond the 11 in `data/scenarios.ts`
- New mechanisms beyond what `simulation.ts` ships
- AI-generated character variations
- Native iOS or Android *only* features (haptics, push, etc.)

## 14. Risk + rollback

The monorepo restructure (Phase 1) is the single largest risk. Mitigation:
- Phase 1 lives on its own feature branch (`spec/0010-phase-1-monorepo`)
- The PR includes a dry-run verification that `npm test -- --run` passes
  identically before and after the move
- The Vercel build path is the most exposed deploy surface; verify on a
  preview deploy before merging to main

If Phase 1 reveals an unfixable blocker (e.g. Vite + workspace alias
conflict), the fallback is to **keep `web/` at the root** and
co-locate `packages/engine` as a sibling, with relative imports. Less
clean but functional.

Mobile risk (Phase 6+):
- Expo SDK upgrades break things. We pin SDK + lock RN/Expo versions.
- Lottie + RN-SVG occasionally have peer-dependency snags. Both are
  mature; mitigated by using Expo's managed prebuild flow.

## 15. Phase 0 sub-deliverables (this commit)

This commit ships the following Phase 0 artifacts:

- `specs/0010-pedagogical-redesign/PLAN.md` (this file — updated for
  confirmed direction)
- `specs/0010-pedagogical-redesign/requirements.md`
- `specs/0010-pedagogical-redesign/design.md`
- `specs/0010-pedagogical-redesign/tasks.md`
- `specs/0010-pedagogical-redesign/acceptance.md`
- `specs/0010-pedagogical-redesign/research.md`
- `specs/0010-pedagogical-redesign/traceability.md`
- `specs/0010-pedagogical-redesign/character-system.md`
- `specs/0010-pedagogical-redesign/levels/01.md` through `08.md`
- `specs/0010-pedagogical-redesign/tokens.css` (proposed design tokens,
  staged here before being moved into `packages/engine/assets/`)
- `specs/README.md` updated to register spec 0010

No code changes yet. Phase 1 (monorepo restructure) lands on its own
branch in the next pass.
