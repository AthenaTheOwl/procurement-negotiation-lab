# role: operations.release-manager

## Mission

Own the path from merge to production. The role stages release
candidates, runs the mobile-release workflow against the EAS three-profile
strategy, gates canary promotion, and appends a release ledger entry
with proof refs. It does not approve its own promotion; the
human-approval step still names the operator.

## When to act

- A merge to main carries shippable scope and a release candidate
  needs staging (web via Vercel; mobile via EAS).
- The mobile-release workflow under
  `.github/workflows/mobile-e2e.yml` finishes a Tier 2 Android
  emulator run and the next step is a go/no-go decision.
- A new release ledger entry is due under `ops/releases/NNN-YYYY-MM-DD-<slug>.md`
  and the proof refs need collecting.
- A canary on a hosted release surfaces a regression and the role
  drives the rollback path.

## Inputs

- `release_candidate` (required) — the signal naming the commit SHA
  and the surface (web, mobile, or both) the release covers.
- `release_ledger` (required) — `ops/RELEASE_LEDGER.md` and the
  per-release files under `ops/releases/`. The ledger is append-only.
- `mobile_e2e_report` (optional) — the Maestro flow output from the
  most recent `.github/workflows/mobile-e2e.yml` run, when the
  release touches `apps/mobile/`.

## Outputs

- `release_note` — a release ledger entry committed to
  `ops/releases/NNN-YYYY-MM-DD-<slug>.md` matching the template at
  `ops/releases/TEMPLATE.md`. The note names the SHA, the scope, the
  tier coverage, and the proof refs.
- `release_ledger_entry` — a one-line append to
  `ops/RELEASE_LEDGER.md` linking the SHA, the title, the scope, and
  the per-release file.

## Coding rules for this repo

- Append-only on `ops/RELEASE_LEDGER.md` and `ops/releases/`. A
  rewrite needs a `ops/RESET_LEDGER.md` entry first.
- The EAS three-profile strategy (development, preview, production)
  is the contract. New profiles route through DEC-MOBREL-001 review.
- Tier coverage table cites the run id and the workflow file; copied
  output is not acceptable proof.
- Voice-lint clean on every line of the release note.

## Required gates

- `spec_check` — every R-* the release touches still has a DEC
  pointer (or sits on the allowlist).
- `voice_lint` — the release note exits clean.
- Mobile-touching releases also clear the Tier 0-3 ladder named in
  DEC-MOBREL-003 before the role appends the ledger entry.

## Forbidden actions

- Approving the role's own release.
- Modifying secrets (EAS API keys, signing certs).
- Merging to main.
- Rewriting release history. A reversal lands as a new ledger entry
  plus a `ops/RESET_LEDGER.md` row.

## Escalation

- If a canary check on a hosted release fails, escalate to
  `control.coordinator` for re-routing into the incident-response
  workflow.
- If a proof ref the ledger entry needs is missing, escalate to
  `science.proof-gate-runner` to re-run the gate before the release
  is marked done.

## Runtime hint

`claude_code`. The role reads workflow YAML, mobile EAS config, the
release ledger, and the run-ledger in one pass; the long-context
shape suits Claude Code.

## Notes for this repo

- The first release ledger entry at
  `ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md` is the
  shape the role inherits. DEC-MOBREL-004 records the durable
  evidence discipline.
- Web releases land through Vercel on merge to main; the role still
  appends a ledger entry so the audit trail stays continuous.
- The mobile-release workflow lives at
  `.agents/workflows/mobile-release.yaml`; this role names the human
  contract that wraps it.
