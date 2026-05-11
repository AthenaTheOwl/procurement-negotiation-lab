# scripts/factory

A small in-repo orchestrator. Same conventions as `scripts/spec_check.py` —
runs as a Python script against this repo, not a separate package.

## What it does

Given a task spec YAML, run the pipeline:

```
plan(planner)
   → human gate?
implement(implementer)
   → gates: pytest / npm test / tsc / spec_check / ruff
review(reviewer)
   → if findings: patch(implementer) → re-gate → re-review (max 3 rounds)
   → else: commit + push + (optional) draft PR via gh
```

Workers are CLIs invoked via `subprocess`. Three are wired:

| name          | command                              | default role             |
|---------------|--------------------------------------|--------------------------|
| `claude_code` | `claude --print "<prompt>"`          | plan + review            |
| `codex`       | `codex exec "<prompt>"`              | implement + patch        |
| `gate`        | a list of `cmd:` strings, exit 0     | tests / typecheck / lint |
| `stub`        | deterministic placeholder            | offline / dry-run        |

If the `claude` or `codex` CLI is not on PATH, the factory falls back to the
`stub` worker for that role and prints the prompt it would have sent. That
makes it possible to develop and test the orchestrator without API access.

State lives in `ops/factory.db` (SQLite). Per-task git worktrees live as
siblings of the repo: `procurement-negotiation-lab-task-<id>/`.

## Run it

```bash
# dry run — no agents required
python -m scripts.factory.run --task ops/factory-tasks/example-rename-fc-count.yaml --dry-run

# real run (requires `claude` and/or `codex` on PATH for the corresponding roles)
python -m scripts.factory.run --task ops/factory-tasks/example-rename-fc-count.yaml

# inspect state
python -m scripts.factory.run --status
python -m scripts.factory.run --show example-rename-fc-count
```

## Why in-repo and not a separate package

A separate orchestrator package makes sense once it manages tasks across
multiple repos. For now it lives next to `spec_check.py` because:

- It uses this repo's gates directly: `pytest`, `npm test`, `tsc --noEmit`,
  `python scripts/spec_check.py`. No abstraction needed.
- It lives alongside the spec ledger (`specs/<NNNN>-*/`, `ops/run-ledger.md`).
- Cross-repo orchestration can come later by promoting `scripts/factory/` to
  its own repo and pointing `target_repo` at a sibling path.

## What it deliberately doesn't do

- No multi-agent debate / argument loops. Gates are the referee.
- No background poller. You run `python -m scripts.factory.run` when you
  want it.
- No auto-merge. Stops at "draft PR opened" by default.
- No model routing per request. One task, one pipeline.

Use it on small, reversible tasks first.
