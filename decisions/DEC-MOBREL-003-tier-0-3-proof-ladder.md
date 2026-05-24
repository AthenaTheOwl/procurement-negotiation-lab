---
id: DEC-MOBREL-003-tier-0-3-proof-ladder
spec: specs/0012-mobile-release-and-agentic-sdlc/
requirement: R-MOBREL-002
date: 2026-05-24
status: approved
reversible: true
decision: |
  Stratify mobile proof into four tiers and require each PR to record
  which tier ran. Tier 0 is unit logic (Jest + component tests). Tier 1
  is lint + TypeScript typecheck. Tier 2 is native binary E2E on the
  Android emulator (Maestro) plus iOS simulator/device when budget
  allows. Tier 3 is TestFlight / Play beta smoke before a production
  promotion. The release ledger entry for every promotion records the
  per-tier status (pass / failed / open).
alternatives:
  - label: single test gate (everything green or red)
    rejected_because: |
      A single gate flattens cost: a Jest unit run is seconds, a hosted
      Android emulator run is minutes, a TestFlight promotion is hours
      and dollars. Forcing every PR through the most expensive gate
      blocks fast iteration, and dropping the most expensive gate hides
      real device regressions behind unit green.
  - label: two tiers (CI green and production green)
    rejected_because: |
      Two tiers conflates Tier 0/1 (logic and types) with Tier 2
      (native binary on a real OS image), which is the failure mode the
      spec calls out: a PR claims native green because Jest passed.
      The hosted emulator path already proved this gap: the Gradle
      assembleDebug failure recorded in commit 93d5190 was invisible to
      the Jest + lint gates.
  - label: tier the proof but skip the per-PR tier tag
    rejected_because: |
      Without a per-PR tier tag the ledger cannot tell whether a merge
      exercised Tier 2 or only Tier 0/1. The acceptance bullet "A PR
      cannot claim native mobile green unless the tier it ran is
      recorded" makes the tier tag a gate, not a label.
rationale: |
  The four tiers match the cost curve of native release work. Tier 0
  and Tier 1 run on every PR via `frontend.yml` and finish in under a
  minute. Tier 2 runs on PR-path changes to `apps/mobile/**` and on
  manual dispatch via `mobile-e2e.yml`, takes ten to thirty minutes,
  and proves the binary boots on a real OS image. Tier 3 is a manual
  promotion through TestFlight / Play that takes hours but proves the
  store signing path. Recording the tier per PR keeps the ledger
  honest: a PR that only ran Tier 0/1 cannot claim a Tier 2 green it
  did not earn.
evidence:
  - kind: spec
    ref: specs/0012-mobile-release-and-agentic-sdlc/requirements.md
  - kind: doc
    ref: specs/0012-mobile-release-and-agentic-sdlc/STATUS.md
  - kind: doc
    ref: apps/mobile/.maestro/README.md
  - kind: doc
    ref: ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md
rollback: |
  Collapse the tier ladder back to a two-row table (CI green / store
  green) in `apps/mobile/.maestro/README.md` and the
  `ops/releases/TEMPLATE.md`. Drop the per-PR tier tag requirement
  from `R-MOBREL-002`. The underlying jobs (Jest, lint, Maestro,
  TestFlight) keep running; only the per-tier recording goes away.
owner: platform
---

## decision

Stratify mobile proof into four tiers (0: unit logic, 1: lint +
typecheck, 2: native binary E2E, 3: TestFlight / Play beta) and
require each PR to record which tier ran. The release ledger entry
for every promotion records the per-tier status.

## alternatives

- Single test gate — flattens cost across seconds, minutes, and hours
  of work; hides real device regressions behind unit green.
- Two tiers (CI green / production green) — conflates Tier 0/1 with
  Tier 2, which is the failure mode the spec calls out.
- Tier the proof but skip the per-PR tier tag — the ledger cannot tell
  whether a merge exercised Tier 2.

## rationale

The four tiers match the cost curve of native release work. Tier 0/1
run on every PR via `frontend.yml`. Tier 2 runs on PR-path changes to
`apps/mobile/**` and on manual dispatch via `mobile-e2e.yml` and proves
the binary boots on a real OS image. Tier 3 is a manual TestFlight /
Play promotion that proves the store signing path. Recording the tier
per PR keeps the ledger honest.

## evidence

- `specs/0012-mobile-release-and-agentic-sdlc/requirements.md` —
  R-MOBREL-002 acceptance text.
- `specs/0012-mobile-release-and-agentic-sdlc/STATUS.md` — the
  coverage table.
- `apps/mobile/.maestro/README.md` — the tier-mapped table at the
  bottom.
- `ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md` — the
  worked per-tier status entry.

## rollback

Collapse the tier ladder back to two rows (CI green / store green) in
the Maestro README and the release ledger template. Drop the per-PR
tier tag requirement. The underlying jobs keep running; only the
per-tier recording goes away.
