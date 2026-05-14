# design: factory dev control plane

## Architecture

```
scripts/factory/
  run.py             CLI: existing task/resume/status plus expand/run-many
  task.py            YAML schema, now supports review.reviewers
  pipeline.py        plan -> implement -> gate -> bounded multi-review
  workers.py         CLI worker metadata extraction
  spec_tasks.py      specs/<id>/tasks.md -> ops/factory-tasks/*.yaml
  router.py          optional LangGraph fan-out, ThreadPool fallback
  mcp_server.py      narrow MCP-compatible stdio JSON-RPC server
```

## Design choices

- MCP is read-first and deliberately narrow. It exposes factory status,
  task inspection, spec expansion, and dry-run routing. It does not expose a
  generic command execution tool.
- Dual review is bounded by `max_patch_rounds`; this imports the MedRoute
  "challenge, then proof gate" habit without creating an infinite debate loop.
- LangGraph is optional. The local factory works in a clean checkout without
  extra dependencies; installing `.[factory]` enables the LangGraph fan-out
  route.
- CLI metadata parsing is best-effort and conservative. Real IDs win, then
  tagged synthetic IDs keep trace tables non-null.

## Data flow

1. `--expand-spec` reads `tasks.md`, groups unchecked tasks by pass, and writes
   review-gated YAML under `ops/factory-tasks/`.
2. `--run-many` loads several task YAMLs and sends them through `router.py`.
3. The router runs each task through the existing pipeline and returns a stable
   `RouterResult`.
4. The pipeline emits per-run `trace_id`, worker `thread_id`, worker `run_id`,
   artifacts, and review events.
5. MCP clients can inspect the same state through `mcp_server.py`.
