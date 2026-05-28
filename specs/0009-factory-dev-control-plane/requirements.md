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

### R-FACTORY-RUN-EVIDENCE-001: append-only Event ledger per run

WHEN the factory pipeline starts a run, THE SYSTEM SHALL open
`ops/event-ledger/<run-id>.jsonl` and emit Event records conforming to
the cached `event.schema.json` for every state-machine boundary
(pipeline start, tool calls, gate checks, checkpoints, pipeline end).

Acceptance:
- Each line is a JSON object conforming to `event.schema.json`.
- Event types use dotted namespace form (for example
  `tool.call.started`, `gate.check.passed`, `checkpoint.paused`,
  `gate.run.evidence_recorded`).
- The validator gate confirms conformance on every push to main.

### R-FACTORY-RUN-EVIDENCE-002: Run record per completed run

WHEN the factory pipeline reaches any terminal state (done, failed,
blocked, rejected, awaiting_approval), THE SYSTEM SHALL write a Run
record to `ops/run-records/<run-id>.json` conforming to the amended
`run.schema.json` that carries the six replay-equivalence fields.

Acceptance:
- The file validates against `ops/schemas-cache/run.schema.json`.
- The file's `status` field is set from the terminal pipeline state.
- A final `gate.run.evidence_recorded` event lands on the ledger
  naming which of the six replay fields the record populated.

### R-FACTORY-RUN-EVIDENCE-003: always-populated prompt and tool hashes

WHEN the factory emits a Run record, THE SYSTEM SHALL populate
`prompt_snapshot_hash` and `tool_schemas_snapshot_hash` with
lowercase hex SHA-256 digests of the canonicalized prompt content
and the canonicalized list of available workers plus gates.

Acceptance:
- Both fields match `^[a-f0-9]{64}$`.
- Two runs with identical prompt and tool-surface inputs produce
  byte-identical hashes (stability across calls is unit-tested).

### R-FACTORY-RUN-EVIDENCE-004: worktree-pinned sandbox ref

WHEN the factory operates inside a git worktree, THE SYSTEM SHALL
populate `sandbox_image_ref` as `<worktree-path>@<head-sha>` so a
reviewer can reconstruct the exact tree the run executed against.
When no worktree exists, the field is omitted (the schema treats
absence as "not derivable").

Acceptance:
- For runs against a tmp git repo the field carries a 40-char SHA
  suffix.
- For runs without a derivable worktree the field is absent from the
  Run record (not present with an empty value).

### R-FACTORY-RUN-EVIDENCE-005: aggregated gate-results summary

WHEN the factory emits a Run record, THE SYSTEM SHALL compute
`gate_results_summary` by scanning the ledger's `gate.check.passed`
and `gate.check.failed` events and split gate names into
`gates_passed` / `gates_failed` with `all_passed` true iff
`gates_failed` is empty.

Acceptance:
- For a run that emitted one pass and one fail, the summary lists
  both names in their respective arrays and `all_passed` is false.
- For a run with no gate-check events, the field is omitted entirely.

### R-FACTORY-RUN-EVIDENCE-006: validator gate on every push to main

WHEN code lands on `main` or in a pull request, THE SYSTEM SHALL
exit non-zero if any Event ledger line or Run record on disk fails
schema validation, or if a ledger carries a terminal event with no
matching Run record on disk.

Acceptance:
- `scripts/validate_run_evidence.py` is wired into
  `.github/workflows/tests.yml`.
- `scripts/spec_check.py` lists the validator in
  `REQUIRED_WORKFLOW_PROOFS` for the tests workflow.

### R-SPEC-009: spec discipline

Standard.
