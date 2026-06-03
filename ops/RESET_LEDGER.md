# RESET_LEDGER

Every force-push, history rewrite, or production rollback against
this repo lands here. The entry appears in the same push that
performs the rewrite. Silent rewrites are forbidden.

## Format

Each entry has the shape:

```
## YYYY-MM-DD HH:MM TZ — <one-line cause>

- operator: <github handle or agent id>
- kind: force-push | history-rewrite | rollback
- ref: <branch or tag>
- from: <SHA>
- to: <SHA>
- cause: <one paragraph naming the trigger>
- recovery: <what the operator did to verify the new state>
```

## Entries

## 2026-06-03 00:00 ET - local-only Codex W0 branch abandonment

- operator: codex
- kind: history-rewrite
- ref: local codex/w0-cleanup-tranche-a only
- from: 9d3f5a9 (reported local-only object; absent from this clean checkout)
- to: 753bd0a800dbb5f5e1b8a3ada2268512408c7d88
- cause: Codex's first W0 branch was reported to contain stale legacy
  setup docs in local history. Claude verified procurement-lab
  origin/main was clean at 753bd0a and that no remote ref exposed the
  stale commit. This checkout could not resolve 9d3f5a9, so W0 work
  restarted from the clean main commit instead of rebasing the old
  branch.
- recovery: `git rev-parse HEAD` and `git rev-parse origin/main`
  both returned 753bd0a800dbb5f5e1b8a3ada2268512408c7d88 before the
  Codex W0 lane continued. The branch being pushed is
  `codex/w0-cleanup-tranche-a-clean`.
