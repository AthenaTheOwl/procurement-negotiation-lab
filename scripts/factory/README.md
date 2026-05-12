# scripts/factory

A small in-repo orchestrator. Same conventions as `scripts/spec_check.py` —
runs as a Python script against this repo, not a separate package.

## What it does

Given a task spec YAML, run the pipeline:

```
plan(planner)
   → checkpoint? (plan_review)
implement(implementer)
   → gates: pytest / npm test / tsc / spec_check / ruff
review(reviewer)
   → if findings: patch(implementer) → re-gate → re-review (max N rounds)
   → checkpoint? (diff_review)
commit
   → checkpoint? (pre_pr)
push + (optional) draft PR via gh
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

## Checkpoints and approvals

A task YAML can list checkpoints where the pipeline pauses for human review:

```yaml
checkpoints:
  - plan_review     # pause after plan, before implement
  - diff_review     # pause after the first clean review, before commit
  - pre_pr          # pause after commit, before push + gh pr create
```

When the pipeline hits a configured checkpoint:

1. The relevant artifact (plan / diff / review) is written to
   `ops/factory-artifacts/<task-id>/<round>-<kind>.txt`.
2. The task row is set to `status=awaiting_approval`,
   `awaiting_checkpoint=<name>`, `current_step=await:<name>`.
3. An event `checkpoint.paused` is appended with the artifact ref.
4. The CLI exits with code 2 and prints the resume command.

To inspect and resume:

```bash
python -m scripts.factory.run --show <task-id>          # see awaiting checkpoint
python -m scripts.factory.run --artifacts <task-id>     # list stored artifacts
python -m scripts.factory.run --trace <task-id>         # event stream (per trace_id)

# approve and continue from the checkpoint
python -m scripts.factory.run --resume <task-id> --approve [--dry-run]

# or reject the task entirely
python -m scripts.factory.run --resume <task-id> --reject --comment "wrong scope"
```

Each `run_pipeline` invocation gets a fresh `trace_id` (uuid hex). Events
created during that run carry the same `trace_id` so `--trace` can group a
specific run, including resumes. The most recent trace is stored on the task
row as `trace_id`.

## Trace IDs and artifacts

The factory stores app-level state (decisions, IDs, routing) in SQLite and
artifact *content* on disk:

```
ops/factory.db                          # SQLite: tasks, events
ops/factory-artifacts/<task-id>/
  0-plan.txt                            # planner output
  0-implement-stdout.txt                # implementer stdout (per round)
  0-gate-typecheck.txt                  # full gate output per round
  0-review.txt                          # reviewer output
  1-review.txt                          # round-2 review after a patch
  ...
```

The SQLite events table stores opaque references (`{task_id, kind, round,
path, sha1, size}`) to each artifact — never the blob. This keeps the DB
small, makes diffs grep-able, and lets you delete `ops/factory.db` without
losing per-task content.

Worker invocations also capture `thread_id` and `run_id` metadata when the
CLI emits them (Claude / Codex `--output-format json` is probed, falling
back to regex extraction, falling back to a tagged synthetic UUID). These
flow into events and into the `last_thread_id` / `last_run_id` columns so
you can correlate a factory event with a real Claude Code or Codex Harness
run.

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
