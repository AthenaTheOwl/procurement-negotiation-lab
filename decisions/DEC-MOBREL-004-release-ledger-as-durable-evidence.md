---
id: DEC-MOBREL-004-release-ledger-as-durable-evidence
spec: specs/0012-mobile-release-and-agentic-sdlc/
requirement: R-MOBREL-004
date: 2026-05-24
status: approved
reversible: true
decision: |
  Record every mobile build or update promotion as one markdown file
  under `ops/releases/` keyed by a numbered prefix and an ISO date
  (`NNN-YYYY-MM-DD-<slug>.md`). Each entry carries the build ID,
  platform, profile, git SHA, runtime version, update group, tier
  table, native build status, CI run URL plus outcome, rollback path,
  and open items. The template lives at `ops/releases/TEMPLATE.md`.
alternatives:
  - label: rely on GitHub Releases
    rejected_because: |
      GitHub Releases is a remote object: its history is tied to a
      single host and a single repo. Moving the repo, archiving it, or
      losing the GitHub account drops the release history. A checked-in
      markdown ledger travels with the git history wherever the repo
      goes.
  - label: keep a single CHANGELOG.md
    rejected_because: |
      A CHANGELOG row holds a version and a one-line note. The release
      ledger entries hold a per-tier table, a build status per profile,
      a CI run URL with outcome, and a per-update rollback path. That
      payload does not compress to a one-line CHANGELOG row without
      losing the proof-link evidence the spec acceptance asks for.
  - label: no checked-in ledger; rely on chat / Slack history
    rejected_because: |
      The spec acceptance bullet says release evidence must survive
      the chat session. Chat history is ephemeral, search-bound, and
      tied to a single chat host. A markdown file in git survives all
      of those.
rationale: |
  A per-release markdown file under `ops/releases/` records what the
  spec acceptance asks for (build ID, platform, profile, SHA, runtime
  version, update group, tier table, rollback path) in a shape a future
  reader can grep without a GitHub login or a Slack workspace. The
  numbered prefix plus ISO date keys the ledger so a `ls
  ops/releases/` reads as a chronological history. Failed promotions
  get the same entry shape as successful ones, with the failing stage
  and the next remediation recorded as required by R-MOBREL-004.
evidence:
  - kind: spec
    ref: specs/0012-mobile-release-and-agentic-sdlc/requirements.md
  - kind: doc
    ref: ops/releases/README.md
  - kind: doc
    ref: ops/releases/TEMPLATE.md
  - kind: doc
    ref: ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md
rollback: |
  Remove `ops/releases/` and replace it with a one-shot script under
  `scripts/` that generates a GitHub Release per promotion (`gh release
  create ...`) keyed on the same payload. The release-ledger entries
  in `ops/RELEASE_LEDGER.md` continue to link to the GitHub Release
  URLs instead of local markdown files. The rest of the contract (tier
  table, build status per profile, rollback path) stays the same; only
  the storage backend changes.
owner: platform
---

## decision

Record every mobile build or update promotion as one markdown file
under `ops/releases/` keyed by a numbered prefix and an ISO date
(`NNN-YYYY-MM-DD-<slug>.md`). Each entry carries the build ID,
platform, profile, git SHA, runtime version, update group, tier table,
native build status, CI run URL plus outcome, rollback path, and open
items.

## alternatives

- GitHub Releases — ties history to a single host and account.
- CHANGELOG.md only — compresses out the per-tier table and the
  proof-link evidence the spec asks for.
- Chat / Slack history — ephemeral, fails the spec acceptance bullet
  about surviving the chat session.

## rationale

A per-release markdown file records the spec-required payload (build
ID, profile, SHA, runtime version, update group, tier table, rollback
path) in a shape a future reader can grep without a GitHub login or a
Slack workspace. The numbered prefix plus ISO date keys the ledger as
a chronological history. Failed promotions use the same entry shape,
with the failing stage and the next remediation recorded.

## evidence

- `specs/0012-mobile-release-and-agentic-sdlc/requirements.md` —
  R-MOBREL-004 acceptance text.
- `ops/releases/README.md` — the ledger contract.
- `ops/releases/TEMPLATE.md` — the per-entry shape.
- `ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md` — the
  first worked entry, including the recorded Gradle failure.

## rollback

Remove `ops/releases/` and replace it with a one-shot `gh release
create` script keyed on the same payload. Update
`ops/RELEASE_LEDGER.md` to link to GitHub Release URLs instead of
local markdown files. The rest of the contract stays the same; only
the storage backend changes.
