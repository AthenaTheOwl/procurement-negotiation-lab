# requirements: factory dev control plane

## Scope

Specs 0005-0008 added a local agent factory. This spec turns it into a small
managed development runtime: discoverable through MCP, able to expand specs
into tasks, able to run bounded dual review, able to correlate real CLI run
metadata, and able to route multiple tasks with an optional LangGraph-backed
parallel graph.

This is development infrastructure only. It must not change the public lab
runtime or hosted app behavior.

## Requirements

### R-FACTORY-001: MCP-compatible factory surface

WHEN a coding agent connects over stdio, THE SYSTEM SHALL expose a narrow
MCP-compatible JSON-RPC server for factory status, task details, spec expansion,
and dry-run multi-task routing.

Acceptance:
- `scripts/factory/mcp_server.py` handles `initialize`, `tools/list`,
  `tools/call`, `resources/list`, and `resources/read`.
- The server exposes no arbitrary shell-command tool.
- Tests cover initialize, tool discovery, status, and spec expansion.

### R-FACTORY-002: spec-to-task expansion

WHEN a spec has unchecked tasks, THE SYSTEM SHALL generate review-gated factory
task YAML files grouped by pass.

Acceptance:
- `scripts/factory/spec_tasks.py` parses unchecked `tasks.md` entries.
- The CLI supports `--expand-spec`.
- Generated tasks default to plan and diff checkpoints, dual review, and the
  standard proof gates.

### R-FACTORY-003: bounded dual review

WHEN a task requests multiple reviewers, THE SYSTEM SHALL run each reviewer and
aggregate conservatively: any reject rejects, any needs-patch patches, and only
all-clean proceeds.

Acceptance:
- Task YAML supports `review.reviewers: [...]`.
- Pipeline events include one `review.done` per reviewer.
- Tests cover the dual-review dry-run path.

### R-FACTORY-004: real CLI metadata parsing

WHEN a Claude/Codex CLI emits thread, run, session, conversation, or model
metadata in JSON/JSONL or stderr, THE SYSTEM SHALL capture the real IDs before
falling back to tagged synthetic IDs.

Acceptance:
- JSON object and JSONL metadata shapes are parsed.
- Nested `thread.id`, `session.id`, and `response.model` shapes are supported.
- Tests cover the parser.

### R-FACTORY-005: parallel task routing

WHEN multiple task YAMLs are supplied, THE SYSTEM SHALL run them through a
common router with bounded parallelism. If LangGraph is installed, use a
fan-out/fan-in graph; otherwise fall back to a ThreadPoolExecutor with the same
result shape.

Acceptance:
- `scripts/factory/router.py` exposes `route_tasks`.
- The CLI supports `--run-many`.
- The optional `factory` extra declares LangGraph and MCP SDK dependencies.
- Tests cover fallback routing.

### R-FACTORY-006: static factory console

WHEN a user opens the web app's Factory console, THE SYSTEM SHALL render a
read-only replay of factory task evidence without starting agents, reading the
local SQLite store, or calling a backend.

Acceptance:
- A web route or tab named "Factory console" is reachable from the app.
- The console shows task state, artifact refs, checkpoint/interrupt state, and
  a run-report summary.
- The console uses static sample evidence and the SDK `RunReport` type for
  report data.
- Tests cover data normalization and UI rendering.

### R-SPEC-009: spec discipline

Standard.
