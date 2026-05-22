# Maestro flows — apps/mobile

Maestro drives the Tier 2 native E2E layer for the mobile app. Each `.yaml`
file in this directory is one flow that runs against a real installed APK on
an Android emulator (or a real device).

## What lives here

- `level-1-walkthrough.yaml` — Home → Level 1 → Settle now → reveal + Continue.
  This is the canonical "first flow" that proves the Tier 2 wiring end to end.
- `_stubs-future-levels.yaml` — TODOs for Levels 3, 6, 8, 9, 10, 11. Author
  one file per Level in the next pass; the stubs spell out which `testID`s to
  drive and what to assert.

## Run a flow locally

You need:

1. An installed APK of the dev client or preview build on an Android emulator
   or attached device. `eas build --profile development --platform android`
   or `eas build --profile preview --platform android` will produce one.
2. The Maestro CLI. Install via `curl -Ls "https://get.maestro.mobile.dev" | bash`
   or follow `https://maestro.mobile.dev/getting-started/installing-maestro`.

From `apps/mobile/`:

```
npm run maestro:test            # runs every .yaml flow in .maestro/
maestro test .maestro/level-1-walkthrough.yaml
```

The repo uses npm workspaces, so invoke as
`npm run maestro:test --workspace=@lab/mobile` from the repo root.

If the flow fails, Maestro writes screenshots and a trace under
`./maestro-debug-output/` (also picked up as a CI artifact).

## CI

`.github/workflows/mobile-e2e.yml` boots a hosted Android emulator via
`reactivecircus/android-emulator-runner`, builds the debug APK, installs it,
and runs the flows. On any failure the workflow uploads
`maestro-debug-output/` so failures are reviewable without re-running.

## testID conventions

The flows ride on `testID` props set in `apps/mobile/src/`:

- `home-surface`, `home-start-cta`, `home-restart-cta`, `home-sandbox-cta` —
  Home screen anchors.
- `level-shell-<N>` — each Level wraps its content in a LevelShell with a
  numbered shell id, so `level-shell-1` proves the route changed.
- `level-reveal` — the post-action explainer card on every Level.
- `level-continue` — the Continue button in every LevelShell.
- `level<N>-intro` — the IntroCard at the top of Level N.
- `level<N>-<widget>` — Level-specific widgets, named in the source file.

When you add a new widget that the E2E suite should reach, add a `testID`
prop with one of these patterns and reference it from the relevant flow.

## What's tier-mapped

| Tier | Tool          | Lives in                                  |
| ---- | ------------- | ----------------------------------------- |
| 0    | Jest          | `apps/mobile/__tests__/`                  |
| 1    | tsc + lint    | `pnpm --filter @lab/mobile typecheck`     |
| 2    | Maestro       | `apps/mobile/.maestro/` (this directory)  |
| 3    | TestFlight    | manual; see spec 0012 release ledger      |
