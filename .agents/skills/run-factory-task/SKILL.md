---
id: run-factory-task
version: 0.1.0
owner_guild: engineering
trigger:
  - "operator-initiated factory run"
  - "/factory run --task <yaml>"
  - "spec-to-task expansion via --expand-spec"
instructions_file: scripts/factory/README.md
scripts:
  - name: factory_run
    path: scripts/factory/run.py
    description: orchestrator-worker pipeline runner with checkpoint interrupts
  - name: spec_check
    path: scripts/spec_check.py
    description: structural check across spec ledgers and DEC coverage
  - name: voice_lint
    path: scripts/voice_lint.py
    description: voice rules the produced markdown must pass
evals: []
promotion_policy:
  requires:
    - human_approval
---

# skill: run-factory-task

This skill graduates the orchestrator-worker pattern that ships under
`scripts/factory/`. The factory is the de facto workspace manager
for this repo: it runs `plan -> implement -> review -> patch -> commit`
pipelines against per-task git worktrees, with checkpoint interrupts,
trace IDs, and SQLite-backed state.

## What it does

Drives one task through the factory pipeline:

1. Loads a task YAML from `ops/factory-tasks/` (or expands an active
   spec into one via `--expand-spec`).
2. Sets up a per-task worktree alongside the repo
   (`procurement-negotiation-lab-task-<id>/`).
3. Runs the planner worker (default: `claude_code`), then optionally
   pauses at the `plan_review` checkpoint.
4. Runs the implementer worker (default: `codex`) against the
   declared gates: pytest, npm test, tsc --noEmit, ruff, mypy,
   spec_check.
5. Runs the reviewer worker (default: `claude_code`); on findings,
   loops back to a bounded patch-and-rereview cycle.
6. Optionally pauses at `diff_review` and `pre_pr` checkpoints.
7. Commits to the worktree and (optionally) pushes + opens a draft PR
   via `gh`.

State lives in `ops/factory.db` (SQLite); artifact content lives in
`ops/factory-artifacts/<task-id>/<round>-<kind>.txt`. Per-run
`trace_id` correlates to Claude Code or Codex CLI run IDs.

## Trigger

- Operator-initiated factory run: `python -m scripts.factory.run
  --task ops/factory-tasks/<task>.yaml`.
- Spec-to-task expansion: `python -m scripts.factory.run --expand-spec
  specs/NNNN-* --target-repo .`.
- Multi-task routing via `--run-many` (optional LangGraph router with
  ThreadPoolExecutor fallback).

## Instructions

The full playbook lives at `scripts/factory/README.md`. Read it
top-to-bottom before starting. Key rules:

- One trace_id per `run_pipeline` invocation; resumes carry the same
  trace_id so the event stream stays groupable.
- Checkpoints pause the pipeline and write the relevant artifact
  (plan, diff, review) to `ops/factory-artifacts/<task-id>/`. The CLI
  exits with code 2 and prints the resume command.
- Dual review is bounded by `max_patch_rounds`. Gates are the referee.
- No background poller. No auto-merge. Stops at "draft PR opened" by
  default.
- The MCP surface (`python -m scripts.factory.mcp_server`) exposes
  read-first tools only; no arbitrary shell command tool.

## Scripts

- `scripts/factory/run.py` — pipeline entry point.
- `scripts/factory/spec_tasks.py` — spec-to-task expansion.
- `scripts/factory/router.py` — multi-task routing.
- `scripts/factory/mcp_server.py` — MCP-compatible stdio server.
- `scripts/spec_check.py` — structural spec + DEC coverage check.
- `scripts/voice_lint.py` — voice rules for produced markdown.

## Evals

None yet. A `passing_skill_eval` lands when a golden-case task YAML
runs end-to-end with deterministic stub workers and produces a
known-good artifact set. Until then, promotion past version 0.1.0 is
gated on `human_approval` per the promotion_policy field.

## Promotion policy

- v0.1.0 ships under `human_approval`.
- v0.2.0 onward requires `passing_skill_eval` in addition to
  `human_approval`.
- A breaking change to the task YAML schema, the checkpoint names,
  or the artifact path convention requires a major version bump.

## Open items

- Add a golden-case factory task that runs end-to-end against the
  stub workers and asserts the artifact set.
- Wire the factory event stream to `ops/event-log/YYYY-MM-DD.jsonl`
  alongside the existing SQLite event table.
- Decide whether the spec-to-task expander emits one factory task per
  R-* or per spec pass; current default is per pass.
