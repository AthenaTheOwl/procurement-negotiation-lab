---
id: memory-002-factory-worktree-isolation-as-convention
target_kind: memory_update
target_path: .agents/AGENTS.md
week: 2026-W21
mode: memory_consolidation
human_review_required: true
evidence:
  - kind: commit
    ref: 7500aa7
  - kind: decision
    ref: decisions/DEC-FACTORY-001-narrow-mcp-stdio-no-shell-tool.md
  - kind: doc
    ref: scripts/factory/worktree.py
  - kind: doc
    ref: scripts/factory/pipeline.py
---

## proposal

Add a short paragraph to `.agents/AGENTS.md` under "Workflow
conventions" that promotes the factory's per-task git worktree
isolation pattern as the recommended pattern for any multi-step
agent run on this repo. Suggested text:

> Multi-step agent runs that touch shared files (decisions, specs,
> the event log) should use the factory's per-task git worktree
> pattern: one branch per task at `<repo>/../<repo>-task-<id>/`,
> created via `scripts/factory/worktree.py`. This isolates
> concurrent agent work and prevents two agents from racing on
> the same file. Short single-commit runs may skip the worktree;
> anything multi-step or multi-file should opt in.

## why it earns its keep

The W21 backfill commits (`3cd9314`, `1749277`, `7500aa7`) all ran
without a worktree because they were not factory tasks. Each one
touched `decisions/`, `ops/event-log/`, and at least one spec
ledger. Two of them running in parallel would have collided on the
event-log file. The worktree pattern is already implemented and
well-tested; promoting it to a workflow convention costs nothing
and prevents a known failure mode.

## evidence

- `7500aa7 dec: backfill R-FACTORY-* decisions for spec 0009 (5
  DECs)` — the W21 commit that landed the DECs documenting this
  pattern.
- `decisions/DEC-FACTORY-001-narrow-mcp-stdio-no-shell-tool.md`
  through `DEC-FACTORY-005` — the decisions that name the pattern.
- `scripts/factory/worktree.py` — the implementation
  (`create_worktree`, idempotent registration, branch-per-task).
- `scripts/factory/pipeline.py` — the `_resolve_worktree` callsite
  that uses it on every non-dry-run pipeline call.

## promotion path

A `single-change` workflow run that edits `.agents/AGENTS.md` to
add the paragraph. Owner: `engineering.implementation`. Gates:
`voice_lint`, `spec_check.py`, standard push gates.

## risks if promoted blindly

- The worktree pattern has overhead: a second working tree on disk,
  a branch per task, and a cleanup step. For a one-file edit it is
  worse than just editing in place. The convention must allow
  short runs to skip it.
- Operators unfamiliar with `git worktree` may find the sibling
  `<repo>-task-<id>/` directory confusing. The skill at
  `.agents/skills/run-factory-task/` already documents this; the
  AGENTS.md note should link to it.
