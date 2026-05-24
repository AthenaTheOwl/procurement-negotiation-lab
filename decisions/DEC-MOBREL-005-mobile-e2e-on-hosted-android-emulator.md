---
id: DEC-MOBREL-005-mobile-e2e-on-hosted-android-emulator
spec: specs/0012-mobile-release-and-agentic-sdlc/
requirement: R-MOBREL-005
date: 2026-05-24
status: approved
reversible: true
decision: |
  Run Tier 2 native mobile E2E on a hosted GitHub Actions Ubuntu
  runner using `reactivecircus/android-emulator-runner@v2` with
  KVM acceleration on Android API 34 (`google_apis`, `x86_64`,
  `pixel_6`). The workflow at `.github/workflows/mobile-e2e.yml` runs
  `expo prebuild`, `./gradlew assembleDebug`, then boots the emulator
  and invokes `maestro test` against the installed APK. Triggers are
  PRs that touch `apps/mobile/**` and `workflow_dispatch`. Concurrency
  cancellation is on; Maestro debug output uploads on failure.
alternatives:
  - label: BrowserStack
    rejected_because: |
      BrowserStack pricing starts in the hundreds-of-dollars-per-month
      band for the device parallelism this repo would need on PRs,
      and it adds a per-test upload of the APK plus a per-run device
      lease. The hosted emulator path costs zero on the public-runner
      free tier for a workspace at this volume.
  - label: self-hosted runner with a persistent emulator
    rejected_because: |
      A self-hosted runner means a machine to provision, a KVM stack
      to patch, an emulator process to restart, and a security
      perimeter to maintain against PRs from forks. The hosted-runner
      path has none of that infra cost.
  - label: no hosted E2E (Tier 2 stays local-only)
    rejected_because: |
      Local-only Tier 2 leaves no proof that the binary boots on a
      machine the author does not own. The acceptance bullets for
      R-MOBREL-005 ask for native proof scheduled on workflow_dispatch
      and on PR branches, which a local-only path cannot satisfy.
rationale: |
  The hosted runner pattern (`reactivecircus/android-emulator-runner@v2`
  with KVM) is the documented hosted path for Android emulator runs and
  keeps the wall-clock time inside the GitHub Actions timeout. Triggers
  are narrowed to PRs that touch `apps/mobile/**` plus manual dispatch
  so the fast PR gate in `frontend.yml` stays under a minute on
  non-mobile PRs. Concurrency cancellation drops stale branch pushes
  before they eat a runner. The failed Maestro debug artifact uploads
  on failure so the next run does not need to re-run the emulator to
  see what broke. The gradle / prebuild blockers recorded in
  `93d5190` and `646d989` are open work tracked in the ledger, not a
  signal to abandon the path.
evidence:
  - kind: spec
    ref: specs/0012-mobile-release-and-agentic-sdlc/requirements.md
  - kind: doc
    ref: .github/workflows/mobile-e2e.yml
  - kind: doc
    ref: ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md
  - kind: doc
    ref: https://github.com/ReactiveCircus/android-emulator-runner
rollback: |
  Replace the `reactivecircus/android-emulator-runner@v2` step in
  `.github/workflows/mobile-e2e.yml` with a BrowserStack upload and
  test step (`browserstack/github-actions`). The Maestro flow set
  under `apps/mobile/.maestro/` continues to run unchanged; only the
  device-runtime backend changes. The EAS prebuild and gradle steps
  stay if BrowserStack consumes the same APK, or are replaced with an
  `eas build --profile preview` step if BrowserStack consumes an EAS
  artifact directly.
owner: platform
---

## decision

Run Tier 2 native mobile E2E on a hosted GitHub Actions Ubuntu runner
using `reactivecircus/android-emulator-runner@v2` with KVM acceleration
on Android API 34. The workflow runs `expo prebuild`, `./gradlew
assembleDebug`, boots the emulator, and invokes `maestro test` against
the installed APK. Triggers are PRs that touch `apps/mobile/**` and
`workflow_dispatch`; concurrency cancellation is on; Maestro debug
output uploads on failure.

## alternatives

- BrowserStack — paid plan needed for the parallelism this repo would
  draw; hosted emulator costs zero on the public-runner free tier.
- Self-hosted runner with a persistent emulator — infra to provision,
  patch, restart, and secure against fork PRs.
- No hosted E2E (Tier 2 stays local-only) — fails the spec acceptance
  bullet about native proof on workflow_dispatch.

## rationale

The hosted runner pattern with KVM keeps wall-clock time inside the
Actions timeout. Trigger narrowing keeps the fast PR gate under a
minute on non-mobile PRs. Concurrency cancellation drops stale pushes.
The failure-only debug artifact upload makes failed runs reviewable
without a re-run. The gradle / prebuild blockers recorded in commits
`93d5190` and `646d989` are tracked open work, not a signal to abandon
the path.

## evidence

- `specs/0012-mobile-release-and-agentic-sdlc/requirements.md` —
  R-MOBREL-005 acceptance text.
- `.github/workflows/mobile-e2e.yml` — the workflow.
- `ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md` — the
  ledger entry recording the run URLs and the Gradle failure.

## rollback

Replace the `reactivecircus/android-emulator-runner@v2` step with a
BrowserStack upload-and-test step. The Maestro flow set stays
unchanged; only the device-runtime backend changes. Keep the EAS
prebuild + gradle steps if BrowserStack consumes the same APK, or
swap them for `eas build --profile preview` if BrowserStack consumes
an EAS artifact directly.
