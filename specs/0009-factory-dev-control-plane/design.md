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

src/procurement_lab/
  run_evidence.py    emitter for the cross-repo Event + Run schemas

scripts/
  validate_run_evidence.py  walks ops/event-ledger + ops/run-records

ops/
  event-ledger/      append-only JSONL ledger per run-id
  run-records/       final Run record per run-id

apps/web/src/surfaces/factory/
  factoryConsoleData.ts  static replay fixture + normalization
  FactoryConsole.tsx     read-only console view at #/factory
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
- The Factory console is a static replay surface. It reads a checked-in fixture
  and SDK `RunReport` data in the browser, rather than wiring a live
  orchestration backend into the hosted app.
- Run-evidence emission is additive to the existing SQLite event store.
  The pipeline writes the cross-repo Event + Run records to
  `ops/event-ledger/` and `ops/run-records/` on every run; the schema is
  the source of truth for what gets recorded, the local SQLite store
  stays the source of truth for resume. Schema-conformance is enforced
  by `scripts/validate_run_evidence.py` on every push.
- Run-evidence discipline (DEC-FACTORY-008) extends the validator past
  schema-only conformance. For Runs whose `status == "done"` the
  validator enforces required-for-done fields plus four cross-checks
  binding the Run record to the per-run event ledger
  (pipeline.start hash equality, populated-fields set equality, and
  gate_results_summary scan equality). The cross-checks fire only on
  done Runs so the checkpoint-pause flow is unaffected.
- Portable URI scheme (DEC-FACTORY-010, amending DEC-CDCP-014) replaces
  the per-operator `<abs-path>@<sha>` form of `sandbox_image_ref`,
  `inputs[].ref`, and `workspace_id` with the
  `repo://<repo>@<sha>/<path>` and `artifact://<repo>/<id>` URIs the
  athena-site grammar defines. `workspace_id` becomes the bare repo
  name (an identifier, not a file path). The validator and replay
  command resolve URIs via a shared `resolve_uri` helper and accept
  both URI and legacy forms during the migration window.
- The sandbox_image_ref off-by-one bug (PARENT-of-sample SHA was
  always recorded because `git rev-parse HEAD` ran before the
  regeneration commit landed) is fixed by Option A: two-pass emit.
  The pipeline writes `repo://procurement-negotiation-lab@PENDING/`;
  `scripts/finalize_sandbox_ref.py` rewrites the placeholder to the
  actual sample-containing SHA after that commit lands. The helper
  is idempotent so re-running it on a finalized record is a noop.

## Data flow

1. `--expand-spec` reads `tasks.md`, groups unchecked tasks by pass, and writes
   review-gated YAML under `ops/factory-tasks/`.
2. `--run-many` loads several task YAMLs and sends them through `router.py`.
3. The router runs each task through the existing pipeline and returns a stable
   `RouterResult`.
4. The pipeline emits per-run `trace_id`, worker `thread_id`, worker `run_id`,
   artifacts, and review events.
5. MCP clients can inspect the same state through `mcp_server.py`.
6. The web Factory console normalizes a small replay fixture into task rows,
   checkpoint interrupts, artifact refs, event counts, and an SDK run-report
   summary. The fixture has no browser-side write path and starts no workers.
