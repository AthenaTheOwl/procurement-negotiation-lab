---
id: memory-001-hosted-mobile-gradle-brittleness
target_kind: memory_update
target_path: .agents/AGENTS.md
week: 2026-W21
mode: memory_consolidation
human_review_required: true
evidence:
  - kind: commit
    ref: 93d5190
  - kind: commit
    ref: 646d989
  - kind: doc
    ref: ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md
  - kind: doc
    ref: .github/workflows/mobile-e2e.yml
---

## proposal

Add a short paragraph to `.agents/AGENTS.md` under the "Domain
decisions" section that records the hosted Android emulator + Gradle
native build path as a brittle surface. Suggested text:

> Hosted mobile Tier 2 (`reactivecircus/android-emulator-runner@v2`
> + `expo prebuild` + `./gradlew assembleDebug`) is brittle. The
> `apps/mobile/eas.json` profile set is stable, but the prebuild
> assets and the `expo-module-gradle-plugin` resolution on a fresh
> hosted runner have failed back-to-back in the W21 commits
> `93d5190` and `646d989`. Any change that touches `apps/mobile/`
> should budget time for a Gradle-side surprise and check
> `ops/releases/` for the latest failure mode before assuming
> Tier 2 will run end-to-end.

## why it earns its keep

The next agent that touches `apps/mobile/` will either re-discover
the Gradle blocker the hard way or read this note and budget the
right amount of time. Both W21 mobile commits ended on a CI failure
that the agent could not have predicted from the spec alone; the
memory carries the prediction forward.

## evidence

- `93d5190 fix mobile prebuild assets and record first e2e failure`
  — first failure mode: prebuild missing assets.
- `646d989 record hosted mobile e2e gradle blocker` — second
  failure mode: `expo-module-gradle-plugin` resolution.
- `ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md` —
  records both failures with run URLs.
- `.github/workflows/mobile-e2e.yml` — the workflow whose Gradle
  step both failures hit.

## promotion path

A `single-change` workflow run that edits `.agents/AGENTS.md` to
add the paragraph. Owner: `engineering.implementation`. Gates:
`voice_lint` on the edited file, `spec_check.py`, and the standard
push gates. No code change.

## risks if promoted blindly

- The Gradle blocker might resolve in W22 (the EAS team ships
  plugin fixes regularly). A stale "brittle" note erodes trust in
  the memory file. Mitigation: the operator promoting this should
  check the latest `mobile-e2e.yml` run before merging.
- The note targets `.agents/AGENTS.md`, which the agent reads first.
  An overlong note dilutes signal. Keep it to one paragraph.
