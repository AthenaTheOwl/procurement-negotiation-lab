# RELEASE_LEDGER

Every commit on main that represents shippable scope lands here with
date, SHA, title, scope, and proof refs. Backfilled entries cover
the 20 most recent pre-CDCP commits through `646d989`.

This ledger is distinct from `ops/run-ledger.md`. The run ledger
tracks per-task factory pipeline runs; this ledger tracks
commit-level releases.

## Format

Each entry has the shape:

```
## YYYY-MM-DD — <sha> <title>

- scope: <one or two sentences>
- proof:
  - <gate or test name> — <where the proof lives>
```

## Entries

## 2026-05-22 — 646d989 record hosted mobile e2e gradle blocker

- scope: doc-only commit recording the gradle assembleDebug failure
  observed in `.github/workflows/mobile-e2e.yml`; no source change.
- proof:
  - spec_check — passes against the 12-spec ledger
  - voice_lint — clean across documented globs

## 2026-05-22 — 93d5190 fix mobile prebuild assets and record first e2e failure

- scope: mobile prebuild asset adjustments under `apps/mobile/`; first
  end-to-end Maestro run on hosted CI surfaces a gradle blocker
  recorded in the next commit.
- proof:
  - npm run test --workspace=@lab/mobile -- --runInBand — passes
  - npm run typecheck --workspace=@lab/mobile — passes

## 2026-05-22 — 0b7fefd spec 0012 R-MOBREL-003/004 complete Maestro coverage + release ledger

- scope: full Maestro flow set under `apps/mobile/.maestro/` plus the
  spec 0012 release-ledger discipline write-up that closes
  R-MOBREL-003 and R-MOBREL-004.
- proof:
  - spec_check — passes
  - voice_lint — clean
  - Maestro flow files parse via `maestro test --validate`

## 2026-05-22 — 01e5c12 spec 0012 R-MOBREL-001/003 EAS profiles + first Maestro flow + CI workflow

- scope: EAS build profiles in `apps/mobile/eas.json`, the first
  Maestro flow `level-1-walkthrough.yaml`, and the
  `.github/workflows/mobile-e2e.yml` CI workflow.
- proof:
  - spec_check — passes
  - npm run test --workspace=@lab/mobile — passes

## 2026-05-22 — cdae633 fix make mobile lint gate pass

- scope: mobile lint config adjustments so `npm run lint` succeeds on
  the workspace as a whole.
- proof:
  - npm run lint — passes

## 2026-05-22 — e798332 spec 0012 mobile release discipline + agentic SDLC

- scope: spec 0012 ledger lands with R-MOBREL-001..005, R-SDLC-001..003,
  R-AIBRIEF-001; defines the EAS + Maestro release path and the agentic
  SDLC discipline that the ai-field-brief sibling repo split inherits.
- proof:
  - spec_check — passes against 12 active specs
  - voice_lint — clean

## 2026-05-22 — 7d20f86 mirror level intro-card scaffolding to mobile (L1-L11)

- scope: per-level intro-card scaffolding in `apps/mobile/src/screens/`
  parity with the web app for levels 1 through 11.
- proof:
  - npm run test --workspace=@lab/mobile — passes
  - npm run typecheck --workspace=@lab/mobile — passes

## 2026-05-21 — 4d56ab8 fix explanation gaps across every learning surface

- scope: copy fixes across PLAY, LAB, TUTORIAL surfaces under
  `apps/web/src/` filling in explanation gaps for control purposes.
- proof:
  - voice_lint — clean
  - npm run test — passes
  - npm run build — produces dist output

## 2026-05-21 — 16b03a9 fix Level 6 explanation gap: name what each control does and why

- scope: Level 6 sandbox copy fix: each control names what it does
  and why a learner would change it.
- proof:
  - voice_lint — clean
  - npm run test — passes

## 2026-05-21 — 4899159 ux explain sandbox controls and packager capacity

- scope: sandbox UX pass; control labels and packager-capacity tooltips
  under `apps/web/src/surfaces/sandbox/`.
- proof:
  - npm run test — passes
  - npm run build — produces dist output

## 2026-05-21 — b37b3db guardrails codify sandbox specs and proof gates

- scope: spec 0011 ledger lands with R-SANDBOX-001..005 and
  R-GUARD-001..004; codifies sandbox specs and the proof gates that
  the workspace runs.
- proof:
  - spec_check — passes against 11 active specs
  - voice_lint — clean

## 2026-05-21 — a2b32bb sandbox add convergence and transfer pricing workbenches

- scope: per-product convergence playground and transfer-pricing
  workbench under `apps/web/src/surfaces/sandbox/`.
- proof:
  - npm run test — passes
  - npm run build — produces dist output

## 2026-05-21 — ac131e6 docs record phase 10 verification results

- scope: doc-only record of phase 10 verification results from spec
  0010.
- proof:
  - voice_lint — clean
  - spec_check — passes

## 2026-05-21 — cc8799a fix harden phase 10 negotiation and sandbox polish

- scope: phase 10 negotiation surface hardening and sandbox polish
  fixes; affects `apps/web/src/surfaces/negotiate/` and
  `apps/web/src/surfaces/sandbox/`.
- proof:
  - npm run test — passes (160+ tests across the web workspace)
  - npm run build — produces dist output

## 2026-05-20 — f760436 phase 10 fix Negotiate UX, add Level 11 mechanism catalog, replace Sandbox with multi-SKU BuyPlanStudio

- scope: phase 10 deep pass: Negotiate UX fix, Level 11 mechanism
  catalog added, Sandbox replaced with the multi-SKU BuyPlanStudio
  flow under `apps/web/src/surfaces/buyplan/`.
- proof:
  - npm run test — passes
  - npm run build — produces dist output
  - Browser QA — Levels 1-11 walkthrough verified

## 2026-05-20 — efcfb39 feat add model studio menu-authoring level

- scope: Model Studio menu-authoring level under
  `apps/web/src/surfaces/studio/`; integrates with the existing
  scenario JSON schema.
- proof:
  - npm run test — passes
  - npm run build — produces dist output

## 2026-05-19 — 9a24e86 fix Level 5 Run-again replay; fix Level 8 unknown-variable errors

- scope: Level 5 replay bug fix and Level 8 unknown-variable error
  handling fix.
- proof:
  - npm run test — passes
  - Browser QA — Levels 5 and 8 re-verified

## 2026-05-19 — e42faa6 fix make spec 0010 verification reproducible

- scope: verification script adjustments so spec 0010 verification
  reproduces across runners.
- proof:
  - spec_check — passes
  - npm run test — passes
  - python -m uv run pytest — passes

## 2026-05-19 — 2a82423 spec/0010 phase 8 Level 9 multi-period + RAG bridge + chip-map bridge + save/share + streak + negotiate surface

- scope: phase 8 deep pass for spec 0010: Level 9 multi-period
  scenario, RAG bridge wiring, chip-map bridge integration, save/share
  flow, streak tracker, and the negotiate surface.
- proof:
  - npm run test — passes
  - npm run build — produces dist output
  - spec_check — passes

## 2026-05-19 — cb6a759 web tsconfig types[] to exclude mobile's @types/react-native

- scope: `apps/web/tsconfig.json` adjustment to exclude mobile React
  Native types from the web typecheck.
- proof:
  - npx tsc --noEmit — passes for the web workspace
  - npm run build — produces dist output
