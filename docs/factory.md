# factory: a reusable agent-orchestration pattern

`scripts/factory/` is a small, in-repo orchestrator that turns a task
spec into a review-gated pipeline. It runs CLI workers
(`claude_code`, `codex`, `stub`, `gate`) through a fixed sequence,
pauses at named checkpoints, stores per-round artifacts on disk, and
records every state transition as an event with a trace ID. The whole
runtime is one Python package and a SQLite database.

The pattern is meant to be lifted into other repos.

## Control flow

```
plan (planner worker)
  -> checkpoint? (plan_review)
implement (implementer worker)
  -> gates (pytest / npm test / tsc / spec_check / ruff)
review (reviewer worker, optionally dual)
  -> findings? patch (implementer) -> re-gate -> re-review (bounded)
  -> checkpoint? (diff_review)
commit
  -> checkpoint? (pre_pr)
push, optional draft PR via gh
```

Each pipeline run gets a fresh `trace_id`. Every event during that run
carries the same trace ID so `--trace <task-id>` groups one run end to
end, including resumes after a checkpoint pause.

## Key files

- `scripts/factory/state.py` — SQLite schema, task and event rows,
  trace IDs, `last_thread_id` / `last_run_id` columns.
- `scripts/factory/pipeline.py` — the plan/implement/review/commit/push
  state machine and the bounded dual-review aggregation.
- `scripts/factory/workers.py` — CLI worker abstraction with real-ID
  parsing (Claude/Codex JSON, JSONL, stderr) and tagged synthetic
  fallback.
- `scripts/factory/worktree.py` — per-task git worktree isolation as
  a sibling directory (`<repo>-task-<id>/`).
- `scripts/factory/task.py` — task YAML schema and validation.
- `scripts/factory/artifacts.py` — artifact-as-ref store under
  `ops/factory-artifacts/<task-id>/`.
- `scripts/factory/router.py` — multi-task fan-out with LangGraph if
  the `factory` extra is installed, ThreadPoolExecutor otherwise.
- `scripts/factory/mcp_server.py` — narrow MCP stdio surface
  exposing `factory_status`, `factory_show`, `factory_expand_spec`,
  and `factory_run_many_dry`. No shell-exec tool.
- `scripts/factory/spec_tasks.py` — expands an active spec's unchecked
  `tasks.md` entries into review-gated factory task YAML.
- `scripts/factory/run.py` — CLI entry point.

## Artifact-as-ref pattern

The SQLite event table never stores blob content. Each artifact event
carries `{task_id, kind, round, path, sha1, size}` pointing at a file
under `ops/factory-artifacts/<task-id>/`:

```
0-plan.txt
0-implement-stdout.txt
0-gate-typecheck.txt
0-review.txt
1-review.txt           # round-2 review after a patch round
```

This keeps the DB small, lets `grep` find anything across rounds, and
lets you delete `ops/factory.db` without losing per-task content.

## Checkpoint-interrupt pattern

A task YAML can list checkpoints where the pipeline pauses:

```yaml
checkpoints:
  - plan_review     # pause after plan, before implement
  - diff_review     # pause after the first clean review, before commit
  - pre_pr          # pause after commit, before push + gh pr create
```

When the pipeline hits a configured checkpoint:

1. The relevant artifact is written to `ops/factory-artifacts/`.
2. The task row is set to `status=awaiting_approval`,
   `awaiting_checkpoint=<name>`, `current_step=await:<name>`.
3. An event `checkpoint.paused` is appended with the artifact ref.
4. The CLI exits with code 2 and prints the resume command.

Resume:

```bash
python -m scripts.factory.run --resume <task-id> --approve
python -m scripts.factory.run --resume <task-id> --reject --comment "..."
```

## Adopt in another repo

1. Copy `scripts/factory/` and its tests under `tests/factory/` into
   the target repo. The package has one runtime dependency
   (`pyyaml`) and one optional extra (`factory` for LangGraph).
2. Add `ops/factory.db` to `.gitignore`. Create
   `ops/factory-tasks/` for input YAML and let
   `ops/factory-artifacts/` populate on first run.
3. Wire the repo's gates into a task YAML's `gates:` list (typically
   `pytest`, `npm test`, `tsc --noEmit`, `python scripts/spec_check.py`,
   `ruff check .`).

The orchestrator does not assume a specific gate set; it runs whatever
command list the task YAML carries.

## Where the DECs live

- [DEC-FACTORY-001](../decisions/DEC-FACTORY-001-narrow-mcp-stdio-no-shell-tool.md) — narrow MCP stdio surface with a fixed tool set, no shell-exec.
- [DEC-FACTORY-002](../decisions/DEC-FACTORY-002-spec-tasks-expanded-into-review-gated-yaml.md) — unchecked `tasks.md` entries expand into review-gated YAML grouped by pass.
- [DEC-FACTORY-003](../decisions/DEC-FACTORY-003-bounded-dual-review-conservative-aggregation.md) — bounded dual review with conservative aggregation.
- [DEC-FACTORY-004](../decisions/DEC-FACTORY-004-real-cli-ids-win-tagged-synthetic-fallback.md) — real CLI metadata IDs win; synthetic fallback carries a `tagged:` prefix.
- [DEC-FACTORY-005](../decisions/DEC-FACTORY-005-optional-langgraph-router-threadpool-fallback.md) — optional LangGraph router with a ThreadPool fallback.

## Current limitations

- The MCP surface ships over stdio for local clients only. A hosted
  variant (long-running socket, auth, multi-tenant routing) is out of
  scope for this repo.
- The router's dry-run path uses stub workers; the real-CLI fan-out
  has not been exercised end to end.
- The factory event ledger and Run record schema are pinned by
  R-FACTORY-RUN-EVIDENCE-001..035; new task families still need their
  own task YAML and review gates.
- No auto-merge. The pipeline stops at "draft PR opened" by default.
- No background poller. You run `python -m scripts.factory.run` when
  you want it.

Use it on small, reversible tasks first.
