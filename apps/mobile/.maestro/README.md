# Maestro flows - apps/mobile

Maestro drives the Tier 2 native E2E layer for the mobile app. Each `.yaml`
file in this directory is one flow that runs against a real installed APK on
an Android emulator or a real device.

## What lives here

- `level-1-walkthrough.yaml` - Home to Level 1, Settle now, reveal, Continue.
- `level-3-walkthrough.yaml` - Level 3 information-stop picker and reveal.
- `level-6-walkthrough.yaml` - Level 6 capacity knob and split-rule toggle.
- `level-8-walkthrough.yaml` - Level 8 role chip, formula editor, parameter gate.
- `level-9-walkthrough.yaml` - Level 9 multi-week preset and optimum reveal.
- `level-10-walkthrough.yaml` - Level 10 menu pricing and certification.
- `level-11-walkthrough.yaml` - Level 11 mechanism gallery and final reveal.

The covered Tier 2 learning slice is Levels 1, 3, 6, 8, 9, 10, and 11. The
former stub file was removed once the real flows landed.

## Run a flow locally

You need:

1. An installed APK of the dev client or preview build on an Android emulator
   or attached device. `eas build --profile development --platform android`
   or `eas build --profile preview --platform android` will produce one.
2. The Maestro CLI. Install via `curl -Ls "https://get.maestro.mobile.dev" | bash`
   or follow `https://maestro.mobile.dev/getting-started/installing-maestro`.

From `apps/mobile/`:

```
npm run maestro:test
maestro test .maestro/level-1-walkthrough.yaml
```

The repo uses npm workspaces, so invoke as
`npm run maestro:test --workspace=@lab/mobile` from the repo root.

If a flow fails, Maestro writes screenshots and a trace under
`./maestro-debug-output/` (also picked up as a CI artifact).

## CI

`.github/workflows/mobile-e2e.yml` boots a hosted Android emulator via
`reactivecircus/android-emulator-runner`, builds the debug APK, installs it,
and runs the flows. On any failure the workflow uploads
`maestro-debug-output/` so failures are reviewable without re-running.

Trigger the hosted path from the repo root:

```
gh workflow run mobile-e2e.yml --ref main
gh run list --workflow=mobile-e2e.yml -L 1
gh run view <run-id> --log-failed
```

Record the run URL and outcome in `ops/releases/` before calling a native
mobile release green.

## testID conventions

The flows ride on `testID` props set in `apps/mobile/src/`:

- `home-surface`, `home-start-cta`, `home-restart-cta`, `home-sandbox-cta` -
  Home screen anchors.
- `level-shell-<N>` - each Level wraps its content in a LevelShell with a
  numbered shell id, so `level-shell-1` proves the route changed.
- `level-reveal` - the post-action explainer card on every Level.
- `level-continue` - the Continue button in every LevelShell.
- `level<N>-intro` - the IntroCard at the top of Level N.
- `level<N>-<widget>` - Level-specific widgets, named in the source file.

When you add a new widget that the E2E suite should reach, add a `testID`
prop with one of these patterns and reference it from the relevant flow.

## What's tier-mapped

| Tier | Tool       | Lives in                                 |
| ---- | ---------- | ---------------------------------------- |
| 0    | Jest       | `apps/mobile/__tests__/`                 |
| 1    | tsc + lint | `apps/mobile` typecheck + lint scripts   |
| 2    | Maestro    | `apps/mobile/.maestro/` (this directory) |
| 3    | TestFlight | manual; see `ops/releases/`              |
