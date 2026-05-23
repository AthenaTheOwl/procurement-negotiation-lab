# Mobile release ledger

This directory is durable evidence for `R-MOBREL-004`. Each entry records what
was built or prepared, which proof tier ran, what failed, and what rollback path
exists. Entries stay in git so release state survives chat history.

## Add an entry

1. Copy `TEMPLATE.md` to `NNN-YYYY-MM-DD-short-name.md`.
2. Fill in date, version, commit, scope, proof tiers, requirement coverage,
   native build status, CI run evidence, and open items.
3. If a hosted run fails, keep the failed run URL and failure mode in the
   entry. Do not replace it with a clean story after a later fix.
4. Commit the ledger entry with the release or proof change it records.

## Status words

- `pass` - the proof ran and passed.
- `partial` - infrastructure exists or a narrower subset passed.
- `open` - not run, not configured, or blocked.
- `failed` - run attempted and failed; record the failing stage.
