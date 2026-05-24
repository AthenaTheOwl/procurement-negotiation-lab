---
id: eval-001-eas-three-profile-shape-pin
target_kind: test_generation
target_path: apps/mobile/__tests__/eas-profile.test.ts
week: 2026-W21
mode: eval_generation
human_review_required: true
evidence:
  - kind: decision
    ref: decisions/DEC-MOBREL-001-eas-three-profile-strategy.md
  - kind: doc
    ref: apps/mobile/eas.json
  - kind: doc
    ref: specs/0012-mobile-release-and-agentic-sdlc/STATUS.md
  - kind: commit
    ref: 1749277
---

## proposal

Add a Jest test under `apps/mobile/__tests__/eas-profile.test.ts`
that loads `apps/mobile/eas.json` and asserts the three-profile
shape DEC-MOBREL-001 codified:

- `build.development` exists, has `developmentClient: true`, and
  emits a debug APK + iOS simulator binary.
- `build.preview` exists, has a `preview` channel, emits a release
  APK on the `internal` distribution, and an iOS simulator binary.
- `build.production` exists, has a `production` channel, emits an
  Android app bundle and an iOS device IPA, and `autoIncrement`
  is set.

The test reads the file via `fs.readFileSync` plus `JSON.parse`
(no Expo runtime needed) and walks the expected shape.

## why it earns its keep

DEC-MOBREL-001 is load-bearing for the release path: the channel
names route OTA updates, the buildType split routes Play Console
vs internal tester distribution, and the `autoIncrement` flag
keeps store build numbers monotonic. A one-line collapse of the
profile set (a refactor that "simplifies" eas.json) would silently
break all three release audiences. A snapshot-style test pins
the shape against accidental removal without coupling to any EAS
runtime detail.

## evidence

- `decisions/DEC-MOBREL-001-eas-three-profile-strategy.md` — the
  decision that names the three-profile shape and its rationale.
- `apps/mobile/eas.json` — the file under test.
- `specs/0012-mobile-release-and-agentic-sdlc/STATUS.md` — records
  R-MOBREL-001 as COVERED with this DEC as evidence.
- `1749277 dec: backfill R-MOBREL-001..005 decisions for spec 0012`
  — the W21 commit that closed the DEC ledger this test would pin.

## promotion path

A `single-change` workflow run that adds the test file and lists
it in the mobile workspace's Jest config glob. Owner:
`engineering.implementation`. Gates: the existing
`npm run test --workspace=@lab/mobile` runs the new file; the
`npm run typecheck --workspace=@lab/mobile` gate covers TypeScript
correctness of the test source.

## risks if promoted blindly

- A pinned snapshot can become noise if `eas.json` legitimately
  needs to evolve (a new channel, a new platform option). Mitigation:
  the test should assert the structural invariants (three profiles,
  named channels, buildType split), not a verbatim file snapshot.
- The test must not require the Expo CLI or an EAS account; reading
  the file as JSON is enough. Anything that needs EAS auth belongs
  in a separate integration suite.
