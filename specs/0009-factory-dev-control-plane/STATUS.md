# Spec 0009 - status snapshot

Snapshot, not a substitute for `requirements.md` + `traceability.md`. Update
this table whenever a requirement flips state. PARTIAL stays PARTIAL until
every acceptance bullet ships.

## R-FACTORY-* coverage

| ID | State | Decision | What landed | What's still open |
|---|---|---|---|---|
| R-FACTORY-001 | COVERED | [DEC-FACTORY-001](../../decisions/DEC-FACTORY-001-narrow-mcp-stdio-no-shell-tool.md) | `scripts/factory/mcp_server.py` serves `initialize`, `tools/list`, `tools/call`, `resources/list`, and `resources/read` with a four-tool fixed registry (`factory_status`, `factory_show`, `factory_expand_spec`, `factory_run_many_dry`). No shell-exec tool. | Hosted MCP entry point is not yet published; coding-agent clients still launch the stdio server locally. |
| R-FACTORY-002 | COVERED | [DEC-FACTORY-002](../../decisions/DEC-FACTORY-002-spec-tasks-expanded-into-review-gated-yaml.md) | `scripts/factory/spec_tasks.py` parses unchecked `tasks.md` entries, groups by pass, and writes review-gated task YAML under `ops/factory-tasks/`. The CLI carries `--expand-spec`. | None for the in-scope behavior. |
| R-FACTORY-003 | COVERED | [DEC-FACTORY-003](../../decisions/DEC-FACTORY-003-bounded-dual-review-conservative-aggregation.md) | `scripts/factory/pipeline.py` runs each reviewer in `review.reviewers` and aggregates conservatively (any reject rejects, any needs-patch patches, all-clean proceeds). One `review.done` event per reviewer. | None for the in-scope behavior. |
| R-FACTORY-004 | COVERED | [DEC-FACTORY-004](../../decisions/DEC-FACTORY-004-real-cli-ids-win-tagged-synthetic-fallback.md) | `scripts/factory/workers.py` parses thread, session, run, conversation, and model IDs from JSON, JSONL, and stderr. Real IDs win; synthetic IDs carry a `tagged:` prefix on fallback. | None for the in-scope behavior. |
| R-FACTORY-005 | COVERED | [DEC-FACTORY-005](../../decisions/DEC-FACTORY-005-optional-langgraph-router-threadpool-fallback.md) | `scripts/factory/router.py` exposes `route_tasks` with a LangGraph fan-out when the `factory` extra is installed and a ThreadPoolExecutor fallback otherwise. The CLI carries `--run-many`. | None for the in-scope behavior. |
| R-FACTORY-006 | COVERED | [DEC-FACTORY-006](../../decisions/DEC-FACTORY-006-static-replay-console-evidence.md) | `apps/web/src/surfaces/factory/` renders `#/factory` from static replay evidence with task state, artifact refs, checkpoint interrupts, event counts, and SDK `RunReport` summary. | Live orchestration backend, auth, and browser-side SQLite reads stay out of scope. |
| R-FACTORY-RUN-EVIDENCE-011 | COVERED | [DEC-FACTORY-009](../../decisions/DEC-FACTORY-009-factory-replay-command.md) | `scripts/replay_run.py` ships the documented CLI with strict input loading (Run record + ledger). Tmp scratch dir keeps committed evidence untouched. | None for the in-scope behavior. |
| R-FACTORY-RUN-EVIDENCE-012 | COVERED | [DEC-FACTORY-009](../../decisions/DEC-FACTORY-009-factory-replay-command.md) | HEAD verification compares the recorded `sandbox_image_ref` SHA against `git rev-parse HEAD` and exits 1 with a `git checkout` instruction on mismatch. | None for the in-scope behavior. |
| R-FACTORY-RUN-EVIDENCE-013 | COVERED | [DEC-FACTORY-009](../../decisions/DEC-FACTORY-009-factory-replay-command.md) | Per-replay ledger written to `ops/event-ledger/replay-<run-id>-<ISO-timestamp>.jsonl` with one `run.evidence.replayed` event carrying `replay_method == "equivalence"`. | None for the in-scope behavior. |
| R-FACTORY-RUN-EVIDENCE-014 | COVERED | [DEC-FACTORY-009](../../decisions/DEC-FACTORY-009-factory-replay-command.md) | Detailed comparison report at `ops/replay-records/<run-id>/<replay-event-id>.json` carries per-field comparison plus both Run summaries. Exit code matches `replay_equivalent`. | None for the in-scope behavior. |
| R-FACTORY-RUN-EVIDENCE-015 | COVERED | [DEC-FACTORY-010](../../decisions/DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration.md) | Emitter produces repo:// URIs for `workspace_id` (bare repo name), `inputs[].ref` (with worktree-HEAD SHA), and `sandbox_image_ref` (PENDING placeholder). | None for the in-scope behavior. |
| R-FACTORY-RUN-EVIDENCE-016 | COVERED | [DEC-FACTORY-010](../../decisions/DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration.md) | `scripts/validate_run_evidence.py::resolve_uri` maps `repo://` to local paths, returns `None` for `artifact://`, and falls through to `Path(uri)` for legacy or malformed input. | None for the in-scope behavior. |
| R-FACTORY-RUN-EVIDENCE-017 | COVERED | [DEC-FACTORY-010](../../decisions/DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration.md) | `scripts/replay_run.py` resolves URIs via the same helper, extracts SHA from the URI's `<sha>` group with a legacy `<path>@<sha>` fallback, and raises an actionable error on the PENDING placeholder. | None for the in-scope behavior. |
| R-FACTORY-RUN-EVIDENCE-018 | COVERED | [DEC-FACTORY-010](../../decisions/DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration.md) | `scripts/finalize_sandbox_ref.py` rewrites the PENDING placeholder to the sample-containing SHA; idempotent. Sample `run-7b662d3f68b1` carries the finalized URI. | None for the in-scope behavior. |
| R-FACTORY-RUN-EVIDENCE-023 | COVERED | [DEC-FACTORY-012](../../decisions/DEC-FACTORY-012-procurement-negotiation-lab-replay-determinism-test.md) | `tests/factory/test_replay_determinism.py` replays the canonical sample `RERUNS` times (default 3) at the recorded sandbox SHA and asserts the three canonical replay-equivalence hashes match. Teardown restores the original HEAD and removes per-replay artifacts. | None for the in-scope behavior. |
| R-FACTORY-RUN-EVIDENCE-024 | COVERED | [DEC-FACTORY-012](../../decisions/DEC-FACTORY-012-procurement-negotiation-lab-replay-determinism-test.md) | `.github/workflows/run-evidence-gates.yml` declares a `replay-determinism` job that runs the fixture under `uv` with `fetch-depth: 0` and `RERUNS=3`, uploading `artifacts/failbundles/` on failure. | None for the in-scope behavior. |
| R-FACTORY-RUN-EVIDENCE-025 | COVERED | [DEC-FACTORY-012](../../decisions/DEC-FACTORY-012-procurement-negotiation-lab-replay-determinism-test.md) | The fixture writes `artifacts/failbundles/determinism_failure.json` plus `trace_0.json` and `trace_1.json` when canonical hashes diverge; `.gitignore` carries `artifacts/failbundles/` so the bundle never ships as committed evidence. | None for the in-scope behavior. |
| R-SPEC-009 | COVERED | (allowlisted, backfill pending) | Spec registered in `specs/README.md`, listed in `scripts/spec_check.py`, traceability + run ledger updated. | Promote to a DEC-SPEC-009 once the cross-spec discipline cluster is backfilled. |

## What landed

- [DEC-FACTORY-001](../../decisions/DEC-FACTORY-001-narrow-mcp-stdio-no-shell-tool.md): narrow MCP stdio surface with a fixed tool set and no shell-exec tool.
- [DEC-FACTORY-002](../../decisions/DEC-FACTORY-002-spec-tasks-expanded-into-review-gated-yaml.md): unchecked `tasks.md` entries expand into review-gated YAML grouped by pass.
- [DEC-FACTORY-003](../../decisions/DEC-FACTORY-003-bounded-dual-review-conservative-aggregation.md): bounded dual review with conservative aggregation and one `review.done` event per reviewer.
- [DEC-FACTORY-004](../../decisions/DEC-FACTORY-004-real-cli-ids-win-tagged-synthetic-fallback.md): real CLI metadata IDs win over tagged synthetic fallbacks.
- [DEC-FACTORY-005](../../decisions/DEC-FACTORY-005-optional-langgraph-router-threadpool-fallback.md): optional LangGraph router with a ThreadPool fallback that keeps the default install dependency-free.
- [DEC-FACTORY-006](../../decisions/DEC-FACTORY-006-static-replay-console-evidence.md): web Factory console reads static replay evidence instead of wiring live orchestration into the hosted app.
- [DEC-FACTORY-007](../../decisions/DEC-FACTORY-007-factory-emits-conformant-run-evidence.md): factory emits a conformant Event ledger plus a final Run record on every pipeline run, with the six replay-equivalence fields populated where derivable.
- [DEC-FACTORY-008](../../decisions/DEC-FACTORY-008-factory-run-evidence-cross-checks.md): validator enforces required-for-done Run fields plus four cross-checks that bind each done Run to its per-run ledger.
- [DEC-FACTORY-009](../../decisions/DEC-FACTORY-009-factory-replay-command.md): factory ships `scripts/replay_run.py` for equivalence replay with strict HEAD verification, per-replay ledger, and detailed comparison report.
- [DEC-FACTORY-010](../../decisions/DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration.md): emitter migrates onto the portable repo:// + artifact:// URIs from DEC-CDCP-014; validator and replay resolve URIs and accept both URI and legacy forms; the sandbox_image_ref off-by-one bug is fixed via the two-pass emit (PENDING + finalize).
- [DEC-FACTORY-012](../../decisions/DEC-FACTORY-012-procurement-negotiation-lab-replay-determinism-test.md): replay-determinism test fixture at `tests/factory/test_replay_determinism.py` replays the canonical sample `RERUNS` times, canonicalizes the three replay-equivalence fields, SHA-256 hashes the canonical bytes, and fails with a failure bundle when hashes diverge; the `replay-determinism` job in `run-evidence-gates.yml` runs the fixture in CI.

## What's open

Behaviors present in `scripts/factory/` that no R-FACTORY-* requirement
covers yet. Each waits for a future spec slice; none blocks the current
ledger.

- Hosted MCP server exposure. `scripts/factory/mcp_server.py` runs over
  stdio for local clients. A hosted variant (long-running socket, auth,
  multi-tenant routing) is out of scope for spec 0009 and deferred to a
  later spec.
- Per-task git worktree promotion to a workflow convention.
  `scripts/factory/worktree.py` ships the implementation and the W21
  dream memory promotion records the convention in `.agents/AGENTS.md`,
  but no R-FACTORY-* names the worktree as a contract surface.
- Real-CLI dry-run wiring. The router's dry-run path uses stub workers;
  routing a real Claude Code or Codex CLI through the multi-task fan-out
  has not been exercised end-to-end and has no R-FACTORY-* row.
- Factory event-log policy linkage. The pipeline emits events to
  `ops/event-log/YYYY-MM-DD.jsonl`; the `factory-run-emits-events`
  policy in `.agents/policies/` watches the gap but no R-FACTORY-*
  pins the event schema.
- MCP resource set is read-only and narrow. Resource discovery
  (`resources/list`) returns the factory store and the artifact tree;
  no R-FACTORY-* names which resources MUST be exposed.

## Next pass - proposed slice

1. Promote R-SPEC-009 to a real DEC-SPEC-009 once the cross-spec
   discipline backfill cluster lands.
2. Add R-FACTORY-007 for hosted MCP exposure when a hosted runtime is
   chosen.
3. Add an R-FACTORY-* row for the factory event-log schema once the
   event shapes stabilize across roles.

## Verification artifacts

- R-FACTORY-001 -> `scripts/factory/mcp_server.py`, `tests/factory/test_mcp_server.py`.
- R-FACTORY-002 -> `scripts/factory/spec_tasks.py`, `tests/factory/test_spec_tasks.py`.
- R-FACTORY-003 -> `scripts/factory/pipeline.py`, `tests/factory/test_pipeline.py`, `tests/factory/test_checkpoint_interrupts.py`.
- R-FACTORY-004 -> `scripts/factory/workers.py`, `tests/factory/test_workers.py`, `tests/factory/test_cli_metadata.py`.
- R-FACTORY-005 -> `scripts/factory/router.py`, `tests/factory/test_router.py`.
- R-FACTORY-006 -> `apps/web/src/surfaces/factory/`, `apps/web/src/App.tsx`.
- R-SPEC-009 -> `specs/0009-factory-dev-control-plane/`, `scripts/spec_check.py`, `ops/run-ledger.md`.
