---
id: DEC-MOBREL-001-eas-three-profile-strategy
spec: specs/0012-mobile-release-and-agentic-sdlc/
requirement: R-MOBREL-001
date: 2026-05-24
status: approved
reversible: true
decision: |
  Ship three EAS build profiles in `apps/mobile/eas.json` (development,
  preview, production) instead of one shared profile or a per-platform
  four-profile matrix. Development emits a debug APK with the Expo dev
  client and an iOS simulator binary. Preview emits an internal-channel
  release APK and an iOS simulator binary. Production emits an Android
  app bundle and a device IPA, with `autoIncrement` on the build number.
alternatives:
  - label: single shared profile for every build
    rejected_because: |
      A single profile forces every build to either ship the dev client
      (wrong for store submission) or strip it (wrong for local hot
      reload). It also collapses three audiences (engineer, internal
      tester, store reviewer) into one binary surface, which makes
      release blame impossible.
  - label: two profiles (dev and release)
    rejected_because: |
      Two profiles forces preview testers and store reviewers onto the
      same binary, so internal tester feedback contaminates the
      submission build. It also blocks an internal-channel APK distinct
      from the app-bundle store artifact, which the release ledger
      separates by design.
  - label: four profiles split per platform (android-dev, ios-dev, android-prod, ios-prod)
    rejected_because: |
      Per-platform profiles double the matrix and split shared config
      (channel, distribution, autoIncrement) that already lives at the
      profile root. EAS treats the platform split as a per-profile
      sub-key, so the four-profile fan-out is a duplicate model of the
      same data.
rationale: |
  Three profiles match the three audiences this repo serves: the
  engineer running a dev client locally, the internal tester pulling
  from an internal channel, and the store reviewer pulling the signed
  app-bundle or IPA. Each profile carries its own channel name, so the
  OTA update path stays separated by audience. The Android `buildType`
  split (`apk` for dev/preview, `app-bundle` for production) matches
  what each channel distributes. The iOS `simulator` flag
  follows the same split: dev/preview run on a simulator, production
  signs for a real device. `autoIncrement` lives only on production so
  internal builds do not eat store build numbers.
evidence:
  - kind: spec
    ref: specs/0012-mobile-release-and-agentic-sdlc/requirements.md
  - kind: doc
    ref: apps/mobile/eas.json
  - kind: doc
    ref: ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md
  - kind: doc
    ref: https://docs.expo.dev/eas/json/
rollback: |
  Collapse `apps/mobile/eas.json` back to a single `build.development`
  profile and remove `preview` and `production`. Drop the named channels
  and the `autoIncrement` flag. Update `ops/releases/` template entries
  to stop listing per-profile rows. The Maestro flows and the
  `mobile-e2e.yml` workflow continue to work against the dev profile
  APK; the only behavior lost is the audience-by-channel separation.
owner: platform
---

## decision

Ship three EAS build profiles in `apps/mobile/eas.json` (development,
preview, production) instead of one shared profile or a per-platform
four-profile matrix. Each profile pairs an audience (engineer, internal
tester, store reviewer) with a channel name and an artifact shape
(debug APK + simulator, release APK + simulator, app bundle + device
IPA).

## alternatives

- Single shared profile — collapses three audiences into one binary
  surface and makes release blame impossible.
- Two profiles (dev and release) — forces internal testers and store
  reviewers onto the same binary.
- Four profiles split per platform — duplicates shared config that
  already lives at the profile root.

## rationale

Three profiles match the three audiences this repo serves.
Each profile carries its own channel name, so the OTA update path stays
separated by audience. The Android `buildType` split and the iOS
`simulator` flag follow the same audience split. `autoIncrement` lives
only on production so internal builds do not eat store build numbers.

## evidence

- `specs/0012-mobile-release-and-agentic-sdlc/requirements.md` —
  R-MOBREL-001 acceptance text.
- `apps/mobile/eas.json` — the live profile set.
- `ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md` — the
  ledger entry that records the profile set as shipped.

## rollback

Collapse `apps/mobile/eas.json` back to a single `build.development`
profile and remove `preview` and `production`. Drop the named channels
and the `autoIncrement` flag. The Maestro flows and the
`mobile-e2e.yml` workflow keep running against the dev APK; the only
behavior lost is the audience-by-channel separation.
