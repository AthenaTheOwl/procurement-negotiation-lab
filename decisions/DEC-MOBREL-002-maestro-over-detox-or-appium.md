---
id: DEC-MOBREL-002-maestro-over-detox-or-appium
spec: specs/0012-mobile-release-and-agentic-sdlc/
requirement: R-MOBREL-003
date: 2026-05-24
status: approved
reversible: true
decision: |
  Use Maestro as the Tier 2 native E2E driver for `apps/mobile/`. Flows
  live as YAML files under `apps/mobile/.maestro/`, one per Level, and
  run against an installed APK on a hosted Android emulator or a local
  device. The CI workflow at `.github/workflows/mobile-e2e.yml` installs
  the Maestro CLI from `https://get.maestro.mobile.dev` and invokes
  `maestro test` against the flow set.
alternatives:
  - label: Detox
    rejected_because: |
      Detox lives inside the React Native build graph: it requires a
      grey-box test bridge linked into the binary and a native test
      target on iOS. That couples the test driver to RN version churn
      and to the Xcode toolchain on macOS runners. The Maestro path
      treats the APK as a black box and runs the same flows against
      the dev client, the preview APK, or a TestFlight build with no
      rebuild.
  - label: Appium
    rejected_because: |
      Appium needs a WebDriver server process, capability JSON per
      session, and per-platform driver installs (UiAutomator2,
      XCUITest). The hosted-runner setup cost dwarfs the value for a
      seven-flow suite, and the test syntax (Java/Python/JS clients)
      pulls the flows out of the mobile package and into a separate
      runtime.
  - label: hand-rolled Jest plus a UI automator
    rejected_because: |
      Jest is the Tier 0 unit driver in this repo. Reusing it as a
      Tier 2 driver blurs the tier table that R-MOBREL-002 names and
      hides actual device coverage behind a unit-test green.
rationale: |
  Maestro flows are declarative YAML: each step is `tapOn`, `assertVisible`,
  `inputText`, or a similar verb keyed on a `testID` or a literal text.
  That matches the testID conventions already wired into
  `apps/mobile/src/` (`home-surface`, `level-shell-<N>`, `level<N>-intro`,
  `level-reveal`, `level-continue`). The CLI installs in one curl line on
  Linux runners and runs against the same APK that EAS builds, so the
  Tier 2 layer stays separable from RN version churn and from the
  Xcode/macOS toolchain. The seven Level flows already shipped exercise
  the learning path R-MOBREL-003 names without any in-binary test bridge.
evidence:
  - kind: spec
    ref: specs/0012-mobile-release-and-agentic-sdlc/requirements.md
  - kind: doc
    ref: apps/mobile/.maestro/README.md
  - kind: doc
    ref: apps/mobile/.maestro/level-1-walkthrough.yaml
  - kind: doc
    ref: .github/workflows/mobile-e2e.yml
  - kind: doc
    ref: https://maestro.mobile.dev/
rollback: |
  Remove `apps/mobile/.maestro/` and drop the Maestro install + test
  steps from `.github/workflows/mobile-e2e.yml`. Port each YAML flow
  to a Detox `describe`/`it` block under `apps/mobile/e2e/`, add the
  Detox dev dependency, register the iOS test target in the Xcode
  project, and add a `detox build` plus `detox test` step to the
  workflow. The testID anchors in `apps/mobile/src/` stay valid; only
  the driver layer changes.
owner: platform
---

## decision

Use Maestro as the Tier 2 native E2E driver for `apps/mobile/`. Flows
live as YAML under `apps/mobile/.maestro/`, one per covered Level, and
run against an installed APK on a hosted Android emulator. The CI
workflow installs the Maestro CLI from `https://get.maestro.mobile.dev`
and invokes `maestro test` against the flow set.

## alternatives

- Detox — couples the test driver to RN version churn and the
  Xcode/macOS toolchain via a grey-box test bridge.
- Appium — needs a WebDriver server, capability JSON, and per-platform
  drivers; setup cost dwarfs the value for a seven-flow suite.
- Hand-rolled Jest plus a UI automator — blurs the Tier 0 / Tier 2 line
  that R-MOBREL-002 names.

## rationale

Maestro flows are declarative YAML keyed on `testID` or literal text,
which matches the testID conventions already wired into
`apps/mobile/src/`. The CLI installs in one curl line on Linux runners
and runs against the same APK EAS builds, so Tier 2 stays separable
from RN version churn and the Xcode/macOS toolchain.

## evidence

- `specs/0012-mobile-release-and-agentic-sdlc/requirements.md` —
  R-MOBREL-002 acceptance text.
- `apps/mobile/.maestro/README.md` — tier mapping and testID
  conventions.
- `apps/mobile/.maestro/level-1-walkthrough.yaml` — the worked flow.
- `.github/workflows/mobile-e2e.yml` — the CI invocation path.

## rollback

Remove `apps/mobile/.maestro/` and drop the Maestro install + test
steps from `mobile-e2e.yml`. Port each YAML flow to a Detox
`describe`/`it` block under `apps/mobile/e2e/`, add the Detox dev
dependency, register the iOS test target, and add a `detox build` plus
`detox test` step. The testID anchors stay valid; only the driver
layer changes.
