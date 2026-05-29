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

### R-FACTORY-RUN-EVIDENCE-007: required-for-done Run-level fields

WHEN a Run record carries `status == "done"`, THE SYSTEM SHALL
require that `prompt_snapshot_hash`, `tool_schemas_snapshot_hash`,
`sandbox_image_ref`, and `gate_results_summary` are all present and
non-empty. The validator at `scripts/validate_run_evidence.py`
exits non-zero on any missing or empty field.

Acceptance:
- A done Run that omits any of the four fields fails validation
  with a message naming the run-id and the specific field.
- A non-done Run (failed, cancelled, running, needs_review) is not
  subject to the required-for-done check.

### R-FACTORY-RUN-EVIDENCE-008: terminal evidence event for done Runs

WHEN a Run record carries `status == "done"`, THE SYSTEM SHALL
require at least one `gate.run.evidence_recorded` event in the
matching per-run ledger. The validator fails when no such event is
present.

Acceptance:
- A done Run without a `gate.run.evidence_recorded` event in its
  ledger fails validation with a message naming the run-id.
- A done Run whose ledger carries at least one such event passes
  the terminal-event check.

### R-FACTORY-RUN-EVIDENCE-009: pipeline.start hash + populated-fields cross-checks

WHEN a Run record carries `status == "done"`, THE SYSTEM SHALL
verify three cross-checks against the matching ledger:

1. `Run.prompt_snapshot_hash` equals the `pipeline.start` event's
   `payload.prompt_snapshot_hash`.
2. `Run.tool_schemas_snapshot_hash` equals the `pipeline.start`
   event's `payload.tool_schemas_snapshot_hash`.
3. The `gate.run.evidence_recorded` event's
   `payload.fields_populated`, treated as a sorted set, equals the
   set of replay-equivalence fields the Run record carries.

Acceptance:
- A hash mismatch between Run and pipeline.start fails validation.
- A `fields_populated` set that drops or adds a field relative to
  the Run record fails validation.

### R-FACTORY-RUN-EVIDENCE-010: gate-results-summary scan cross-check

WHEN a Run record carries `status == "done"`, THE SYSTEM SHALL
verify that `Run.gate_results_summary` matches the scan of
`gate.check.passed` and `gate.check.failed` events in the matching
ledger:

- `gates_passed` equals the sorted list of `gate_name` values from
  `gate.check.passed` events for the run.
- `gates_failed` equals the sorted list of `gate_name` values from
  `gate.check.failed` events for the run.
- `all_passed` is `True` iff `gates_failed` is empty.

Acceptance:
- A Run record that claims a gate the ledger did not record fails
  validation.
- A Run record whose `all_passed` disagrees with the ledger
  outcomes fails validation.

### R-FACTORY-RUN-EVIDENCE-011: factory ships an equivalence replay command

WHEN a developer wants to re-execute a recorded factory run, THE SYSTEM
SHALL expose `scripts/replay_run.py` with the CLI form
`python scripts/replay_run.py --run-id run-<id>`. The script loads the
recorded Run record at `ops/run-records/<run-id>.json` and its matching
ledger at `ops/event-ledger/<run-id>.jsonl` and re-runs the factory
entry that produced the original sample (`python -m scripts.factory.run
--task <recorded-task-path> --dry-run`).

Acceptance:
- The script accepts `--run-id` as a required argument and exits 1 when
  the recorded Run record file is missing or the ledger file is missing.
- The script re-runs the factory under `--dry-run` against the task path
  recorded in `Run.inputs[]` (entry with `kind == "task"`) and captures
  output into a tmp scratch directory so the committed evidence dirs
  stay untouched.

### R-FACTORY-RUN-EVIDENCE-012: replay command performs strict HEAD verification

WHEN the replay command runs, THE SYSTEM SHALL extract the SHA suffix
from the recorded `Run.sandbox_image_ref` (format `<worktree>@<sha>`)
and compare it to the current git HEAD. On mismatch the script exits 1
with the exact `git checkout <sha>` command the caller needs to run
first.

Acceptance:
- HEAD equal to recorded SHA passes the gate.
- HEAD different from recorded SHA exits 1 with a message naming both
  SHAs and the checkout instruction.
- A `Run.sandbox_image_ref` that is missing or not in `<worktree>@<sha>`
  form exits 1 with a clear error.

### R-FACTORY-RUN-EVIDENCE-013: replay emits a typed run.evidence.replayed event

WHEN the replay command finishes a comparison pass, THE SYSTEM SHALL
append a `run.evidence.replayed` event to a NEW per-replay ledger at
`ops/event-ledger/replay-<run-id>-<ISO-timestamp>.jsonl`. The event
payload conforms to the typed schema added in Round 2 (required
`run_id`, `packet_ref`, `replay_equivalent`; optional `replay_method`)
and the script always populates `replay_method` as `"equivalence"`.

Acceptance:
- The per-replay ledger filename carries the run-id plus the replay
  timestamp; multiple replays of the same run never collide.
- The event's `payload.replay_method` is `"equivalence"`.
- The event's `payload.packet_ref` is the relative path of the matching
  replay report under `ops/replay-records/`.

### R-FACTORY-RUN-EVIDENCE-014: replay writes a detailed comparison report

WHEN the replay command finishes a comparison pass, THE SYSTEM SHALL
write a detailed report at
`ops/replay-records/<run-id>/<replay-event-id>.json` carrying the
per-field comparison for `prompt_snapshot_hash`,
`tool_schemas_snapshot_hash`, and `gate_results_summary`. The report
also records both the recorded and fresh Run summaries plus the recorded
and current head SHAs.

Acceptance:
- The report's `replay_equivalent` is `True` iff all three field
  comparisons report `equal: True`.
- The exit code is `0` on equivalent and `1` on any divergence.
- The report's filename is the replay event_id, so the
  `run.evidence.replayed` event in the per-replay ledger can be joined
  to the report file 1:1.

### R-FACTORY-RUN-EVIDENCE-015: factory emits portable repo:// URIs

WHEN the factory emits a Run record, THE SYSTEM SHALL produce
``workspace_id``, ``inputs[].ref``, and ``sandbox_image_ref`` in the
portable URI scheme defined in athena-site DEC-CDCP-014:

- ``workspace_id`` is the bare repo name
  (``procurement-negotiation-lab``); it is a workspace identifier,
  not a file path.
- Each ``inputs[].ref`` is a
  ``repo://procurement-negotiation-lab@<sha>/<rel-path>`` URI when a
  worktree HEAD SHA is derivable, with a fallback to the raw spec
  path otherwise.
- ``sandbox_image_ref`` is a
  ``repo://procurement-negotiation-lab@<sha>/`` URI; the emitter
  writes ``@PENDING/`` and ``scripts/finalize_sandbox_ref.py``
  rewrites it to the sample-containing SHA after that commit lands.

Acceptance:
- A fresh Run record's ``workspace_id`` equals
  ``procurement-negotiation-lab``.
- A fresh Run record's ``inputs[].ref`` matches
  ``^repo://procurement-negotiation-lab@[a-f0-9]{40}/.+`` when a
  worktree HEAD is available.
- A fresh Run record's ``sandbox_image_ref`` equals
  ``repo://procurement-negotiation-lab@PENDING/`` until the finalize
  helper runs; after finalize it matches
  ``^repo://procurement-negotiation-lab@[a-f0-9]{40}/$``.

### R-FACTORY-RUN-EVIDENCE-016: validator resolves repo:// URIs to local paths

WHEN the validator processes a ref string carrying a repo:// or
artifact:// URI, THE SYSTEM SHALL resolve it via a ``resolve_uri``
helper. The helper maps
``repo://<repo>@<sha>/<path>`` to
``<portfolio_root>/<repo>/<path>``, returns ``None`` for
``artifact://<repo>/<id>``, and returns ``Path(uri)`` for legacy
local paths or malformed URIs (interop clause from DEC-CDCP-014).

Acceptance:
- ``resolve_uri('repo://procurement-negotiation-lab@<sha>/ops/x.yaml',
  portfolio_root)`` returns
  ``<portfolio_root>/procurement-negotiation-lab/ops/x.yaml``.
- ``resolve_uri('artifact://procurement-negotiation-lab/x')``
  returns ``None``.
- ``resolve_uri(<legacy-local-path>)`` returns ``Path(<legacy>)``.
- ``resolve_uri(<malformed-uri>)`` returns ``Path(<malformed>)``.

### R-FACTORY-RUN-EVIDENCE-017: replay resolves repo:// URIs and extracts SHA

WHEN the replay command verifies HEAD against a recorded
``sandbox_image_ref``, THE SYSTEM SHALL extract the 40-char SHA from
the repo:// URI's ``<sha>`` group before falling through to the
legacy ``<path>@<sha>`` parser. WHEN the recorded
``sandbox_image_ref`` is ``repo://procurement-negotiation-lab@PENDING/``,
the replay command SHALL exit 1 with an actionable message naming
``scripts/finalize_sandbox_ref.py`` so the operator knows which step
to run next.

Acceptance:
- The replay command extracts a SHA from
  ``repo://procurement-negotiation-lab@<sha>/`` and matches it
  against ``git rev-parse HEAD``.
- The replay command extracts a SHA from a legacy
  ``<worktree-path>@<sha>`` ref and matches it against
  ``git rev-parse HEAD``.
- The replay command exits 1 with a ``finalize_sandbox_ref`` hint
  when ``sandbox_image_ref`` is ``repo://...@PENDING/``.
- ``Run.inputs[].ref`` in repo:// form resolves to a local path
  before the factory subprocess is invoked.

### R-FACTORY-RUN-EVIDENCE-018: sandbox_image_ref off-by-one fix

WHEN the factory writes a Run record, THE SYSTEM SHALL set
``sandbox_image_ref`` to
``repo://procurement-negotiation-lab@PENDING/``. WHEN the
sample-containing commit lands, THE SYSTEM SHALL provide
``scripts/finalize_sandbox_ref.py --run-id <id> [--sha <sha>]`` to
rewrite the placeholder to the final URI. The helper SHALL be
idempotent: a record whose ``sandbox_image_ref`` is already
finalized is left untouched.

Acceptance:
- A fresh dry-run Run record carries
  ``sandbox_image_ref == 'repo://procurement-negotiation-lab@PENDING/'``.
- ``scripts/finalize_sandbox_ref.py --run-id <id> --sha <40-char-sha>``
  rewrites the placeholder to
  ``repo://procurement-negotiation-lab@<sha>/``.
- Running the helper a second time on the same record produces no
  diff and exits 0.
- The replay HEAD-strict check is satisfiable on first emit (no
  manual SHA backfill required).

### R-FACTORY-RUN-EVIDENCE-019: CI workflow enforces run-evidence gate chain

WHEN code lands on `main` or in a pull request, THE SYSTEM SHALL run
a CI workflow at `.github/workflows/run-evidence-gates.yml` that
triggers on every `pull_request` event and every `push` to `main`.
The workflow runs on `ubuntu-latest` under Python 3.11 and produces
a red build whenever any contract gate fails.

Acceptance:
- The file `.github/workflows/run-evidence-gates.yml` exists and
  carries `on: pull_request` and `on: push: branches: [main]`
  triggers.
- The workflow runs on `ubuntu-latest` and sets up Python 3.11.
- The workflow is referenced from `scripts/spec_check.py`'s
  `REQUIRED_WORKFLOW_PROOFS` so a missing or renamed workflow file
  fails spec-check.

### R-FACTORY-RUN-EVIDENCE-020: CI enforces the DEC-CDCP-015 product gates

WHEN the `run-evidence-gates` workflow runs, THE SYSTEM SHALL execute
the product-side gates locked by athena-site DEC-CDCP-015:

1. `packet-generation-from-canonical-sample`: check out
   `trace-to-eval-harness` as a sibling at
   `${{ github.workspace }}/trace-to-eval-harness`, pip-install it,
   and run `python -m trace_to_eval evidence from-cdcp-events
   ops/event-ledger/run-7b662d3f68b1.jsonl --out /tmp/packet.json
   --portfolio-root ${{ github.workspace }}`. Exit 0 required.
2. `packet-validation`: `python -m trace_to_eval evidence validate
   /tmp/packet.json`. Exit 0 required.
3. `replay-smoke`: see R-FACTORY-RUN-EVIDENCE-021.

Acceptance:
- The workflow's step list includes a `Packet generation from
  canonical sample` step, a `Packet validation` step, and a
  `Replay smoke (canonical sample)` step.
- The sibling checkout uses `actions/checkout@v4` with
  `repository: AthenaTheOwl/trace-to-eval-harness` and
  `path: trace-to-eval-harness`.
- The packet generation step passes
  `--portfolio-root "${{ github.workspace }}"` so trace-to-eval can
  resolve sibling `repo://` URIs.

### R-FACTORY-RUN-EVIDENCE-021: CI replay smoke checks out recorded sandbox SHA

WHEN the `run-evidence-gates` workflow reaches the replay-smoke gate,
THE SYSTEM SHALL:

1. Save the HEAD-finalized canonical Run record at
   `ops/run-records/run-7b662d3f68b1.json` to `/tmp/run-record-finalized.json`.
2. Extract the 40-char sandbox SHA from the Run record's
   `sandbox_image_ref` repo:// URI via `jq -r .sandbox_image_ref ...`
   piped through a `sed -E 's|^repo://[^@]+@([a-f0-9]{40})/.*|\1|'`
   regex; a missing or malformed SHA exits the gate red.
3. Run `git checkout <sandbox-sha>` against the
   procurement-negotiation-lab worktree (requires `fetch-depth: 0`
   on the initial checkout).
4. Restore the finalized Run record into the worktree by copying
   `/tmp/run-record-finalized.json` back to
   `ops/run-records/run-7b662d3f68b1.json` (the recorded SHA is the
   PENDING-emit commit per the DEC-FACTORY-010 two-pass flow).
5. Run `python scripts/replay_run.py --run-id run-7b662d3f68b1`.
   Exit 0 (replay_equivalent: true) required.

Acceptance:
- The workflow's checkout step carries `fetch-depth: 0`.
- The Extract sandbox SHA step exits non-zero when the extraction
  regex does not match a 40-char hex SHA.
- The Restore finalized Run record step runs after the recorded-SHA
  checkout and before the replay step.
- The replay step's success criterion is `replay_equivalent: true`
  (exit 0 from `scripts/replay_run.py`).

### R-FACTORY-RUN-EVIDENCE-022: no continue-on-error on contract gates

WHEN any step in `.github/workflows/run-evidence-gates.yml`
implements a contract gate locked by DEC-CDCP-015, THE SYSTEM SHALL
require that step to be blocking: no `continue-on-error: true`,
no `if: ${{ failure() }}` informational-only shape, no path filter
that hides a real failure, and no `--no-verify` bypass anywhere in
the workflow.

Acceptance:
- The workflow file does not carry the literal
  `continue-on-error: true` on any step.
- The workflow file does not carry `if: ${{ failure() }}` on any
  contract gate step.
- The workflow file does not carry a `paths:` or `paths-ignore:`
  filter on its triggers (the gates run on every pull_request and
  every push to main without exception).
- No step invokes `git commit --no-verify` or any equivalent bypass.

### R-FACTORY-RUN-EVIDENCE-023: replay-determinism test fixture exists

WHEN the procurement-negotiation-lab repo carries a canonical
sample Run record at `ops/run-records/run-7b662d3f68b1.json`,
THE SYSTEM SHALL ship a replay-determinism test fixture at
`tests/factory/test_replay_determinism.py` that replays the
canonical sample `RERUNS` times (default 3, override via the
`RERUNS` env var) at the recorded sandbox SHA and asserts that
the three replay-equivalence fields hash to the same value on
every replay.

Acceptance:
- The file `tests/factory/test_replay_determinism.py` exists and
  declares a single test
  `test_canonical_sample_replay_is_deterministic`.
- The fixture extracts the sandbox SHA from the canonical Run
  record's `sandbox_image_ref`, checks the recorded SHA out,
  restores the finalized Run record into the worktree, and runs
  `scripts/replay_run.py --run-id run-7b662d3f68b1` `RERUNS`
  times via `subprocess.run`.
- The canonical-field whitelist is exactly
  `recomputed_prompt_snapshot_hash`,
  `recomputed_tool_schemas_snapshot_hash`, and
  `recomputed_gate_results_summary`; the gate-results summary
  canonicalization sorts `gates_passed` and `gates_failed` and
  coerces `all_passed` to bool.
- Canonical bytes are produced via
  `json.dumps(..., sort_keys=True, separators=(",", ":"))`
  and hashed via SHA-256.
- Teardown restores the original HEAD (branch name preferred over
  detached SHA) and removes the replay artifacts the test
  created under `ops/replay-records/<run-id>/` and
  `ops/event-ledger/replay-*.jsonl`.

### R-FACTORY-RUN-EVIDENCE-024: CI runs the determinism fixture

WHEN the `run-evidence-gates` workflow runs, THE SYSTEM SHALL
execute a dedicated `replay-determinism` job that runs the
fixture under `fetch-depth: 0`, `RERUNS=3`, and the project's
`uv` setup, and uploads `artifacts/failbundles/` as a workflow
artifact when the test step fails.

Acceptance:
- `.github/workflows/run-evidence-gates.yml` declares a
  `replay-determinism` job.
- The job's checkout step carries `fetch-depth: 0` so the
  recorded sandbox SHA is reachable.
- The job runs `uv sync --python 3.11` then
  `uv run pytest tests/factory/test_replay_determinism.py -v
  --no-cov` with `RERUNS=3` in the environment.
- The job uploads `artifacts/failbundles/` via
  `actions/upload-artifact@v4` with `if-no-files-found: ignore`
  on step failure.
- The job carries no `continue-on-error: true` and no
  `if: ${{ failure() }}` informational shape on the test step.

### R-FACTORY-RUN-EVIDENCE-025: failure bundle on non-deterministic replay

WHEN the canonical-sample replay produces more than one unique
hash across `RERUNS` invocations, THE SYSTEM SHALL write a
failure bundle to `artifacts/failbundles/determinism_failure.json`
plus `artifacts/failbundles/trace_0.json` and
`artifacts/failbundles/trace_1.json`, then fail the test with
the bundle path in the assertion message.

Acceptance:
- The failure bundle JSON carries `canonical_sample_id`,
  `sandbox_sha`, `rerun_count`, `unique_hashes` (sorted),
  `first_mismatch_indices` (two-element list), `trace_paths`
  (repo-relative posix strings), and `hashes_per_rerun`.
- `trace_0.json` and `trace_1.json` carry the canonicalized
  three-field dictionaries for the first two diverging replays.
- The pytest assertion message names the failure bundle path
  relative to the repo root so CI logs can link to it.
- `artifacts/failbundles/` is listed in `.gitignore` so the
  bundle never ships as committed evidence.

### R-FACTORY-RUN-EVIDENCE-026: WorkerResult metadata addendum-6 contract keys

WHEN the factory runs any worker (real CLI, dry-run stub, or
fallback stub), THE SYSTEM SHALL populate
`WorkerResult.metadata` with the six addendum-6 contract keys:
`thread_id`, `run_id`, `model`, `duration_ms`, `tokens_input`, and
`tokens_output`. Missing IDs MUST synthesize as
`<label>-cli-<uuid12>` and `<label>-run-<uuid12>` so downstream
evidence emission never has to guard on a `None` ID.

Acceptance:
- `scripts/factory/workers.py::WorkerResult.metadata` carries the
  six keys on every successful and failed invocation, including the
  no-CLI-on-PATH branch.
- The dataclass signature stays `metadata: dict[str, Any]` so the
  change is a populated-keys contract, not a typed field set.
- Typed accessors `WorkerResult.model`, `WorkerResult.duration_ms`,
  `WorkerResult.tokens_input`, `WorkerResult.tokens_output` return
  `None` for missing keys and a concrete value when present.
- Tests
  `test_stub_worker_metadata_carries_addendum6_keys`,
  `test_worker_result_accessors_handle_missing_metadata`,
  `test_claude_worker_missing_cli_still_populates_thread_id`,
  `test_codex_worker_missing_cli_still_populates_thread_id`
  cover the contract.

### R-FACTORY-RUN-EVIDENCE-027: CLI workers prefer structured output

WHEN `ClaudeCodeWorker` or `CodexWorker` runs, THE SYSTEM SHALL
try `--output-format json` first so the real CLI emits a structured
payload the factory can parse for IDs and token counts. WHEN the
installed CLI rejects the flag (detected via stderr substring match
on `unknown option` / `unrecognized option` / `invalid option`
coupled with the literal `--output-format`), THE SYSTEM SHALL fall
back to the plain `--print` / `exec` form so older CLIs keep
working. `StubWorker` MUST accept a `seed` parameter so
synthesized IDs are deterministic for tests.

Acceptance:
- `ClaudeCodeWorker.run` issues `claude --print --output-format
  json "<prompt>"` first and falls back to `claude --print
  "<prompt>"` on a detected unsupported-flag stderr.
- `CodexWorker.run` issues `codex exec --output-format json
  "<prompt>"` first and falls back to `codex exec "<prompt>"` on
  the same stderr pattern.
- The token-count extractor parses both Anthropic
  (`input_tokens`/`output_tokens`) and OpenAI
  (`prompt_tokens`/`completion_tokens`) flavours under a top-level
  `usage` or nested `response.usage`/`message.usage` path.
- `StubWorker(seed="x")` produces identical `thread_id` and
  `run_id` across invocations.
- Tests
  `test_extract_json_ids_captures_anthropic_usage_block`,
  `test_extract_json_ids_captures_openai_usage_block`,
  `test_extract_json_ids_captures_nested_response_usage`,
  `test_looks_like_unsupported_flag_recognizes_common_phrasings`,
  `test_stub_worker_seeded_ids_are_deterministic` cover the
  contract.

### R-FACTORY-RUN-EVIDENCE-028: replay ledger filenames use microsecond resolution

WHEN `scripts/replay_run.py` writes a per-replay ledger filename,
THE SYSTEM SHALL use a microsecond-resolution timestamp so two
back-to-back replays inside the same wall-clock second never
collide on the filename. The format string MUST be
`f"{now:%Y-%m-%dT%H-%M-%S}.{now.microsecond:06d}Z"` built from a
single `datetime.now(UTC)` call so the seconds and microseconds
are atomic.

Acceptance:
- `scripts/replay_run.py::_now_iso_filename` returns a string
  matching the regex `^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{6}Z$`.
- Existing glob patterns in
  `tests/factory/test_replay_run.py` and
  `tests/factory/test_replay_determinism.py` use
  `replay-{run_id}-*.jsonl` so the format change is transparent.
- The committed pre-fix ledger filename
  `replay-run-16a7bf515611-2026-05-28T12-23-12Z.jsonl` remains
  valid (the glob accepts both shapes).
- Test `test_now_iso_filename_is_microsecond_resolution` locks the
  format contract and verifies five back-to-back calls separated
  by a 1 ms sleep never collide.

### R-FACTORY-RUN-EVIDENCE-029: chaos test suite covers required-for-done + cross-checks

WHEN `tests/factory/test_chaos_run_evidence.py` runs against the
canonical sample `run-7b662d3f68b1`, THE SYSTEM SHALL exercise at
least seven mutation classes (M1..M7) that each target one validator
branch in `scripts/validate_run_evidence.py`. Every mutation MUST be
applied on a temp-dir copy of the canonical sample so the committed
artifacts are never written to.

Acceptance:
- `tests/factory/test_chaos_run_evidence.py` defines one positive
  guard plus seven negative tests: M1 prompt hash mismatch, M2 tool
  schemas hash mismatch, M3 phantom gate in
  `gate_results_summary.gates_passed`, M4 missing terminal
  `gate.run.evidence_recorded` event, M5 `pipeline.start` payload
  missing `prompt_snapshot_hash`, M6 `fields_populated` claims an
  unpopulated field, M7 done Run missing `sandbox_image_ref`.
- Each negative test asserts `validate_run_evidence.main() != 0` and
  that stderr names the specific check (the field name or event
  type) that fired.
- The fixture redirects `EVENT_LEDGER_DIR` and `RUN_RECORDS_DIR` to
  a `tmp_path` copy of the canonical sample; the committed
  `ops/run-records/run-7b662d3f68b1.json` and
  `ops/event-ledger/run-7b662d3f68b1.jsonl` are read-only inputs.

### R-FACTORY-RUN-EVIDENCE-030: chaos suite catches typed-payload regressions

WHEN the `pipeline.start` event in a ledger drops a required
payload field (here `prompt_snapshot_hash`), THE SYSTEM SHALL fail
the chaos test M5 because the event-schema oneOf discriminator
flagged the missing field at schema-validation time. This protects
against a regression where Round 2's typed-payload contract is
silently weakened.

Acceptance:
- `test_M5_pipeline_start_missing_prompt_hash_is_caught` mutates the
  `pipeline.start` event's payload, re-runs the validator, asserts
  exit code is non-zero, and asserts stderr names
  `prompt_snapshot_hash`.
- The mutation lands on the temp-dir ledger copy only; the
  canonical sample is untouched.

### R-FACTORY-RUN-EVIDENCE-031: chaos suite runs on every PR + push to main

WHEN a pull request opens or a push lands on `main`, THE SYSTEM
SHALL run the chaos suite in CI as an independent
`chaos-validation` job inside
`.github/workflows/run-evidence-gates.yml`. The job MUST carry no
`continue-on-error: true` and MUST be registered in
`scripts/spec_check.py::REQUIRED_WORKFLOW_PROOFS` so a renamed or
deleted job fails spec-check.

Acceptance:
- `.github/workflows/run-evidence-gates.yml` declares a
  `chaos-validation` job that runs
  `uv run pytest tests/factory/test_chaos_run_evidence.py -v --no-cov`.
- `scripts/spec_check.py::REQUIRED_WORKFLOW_PROOFS` for that
  workflow file carries the tokens `chaos-validation` and
  `tests/factory/test_chaos_run_evidence.py`.
- The job carries no `continue-on-error: true` and no
  `if: ${{ failure() }}` informational shape.

### R-SPEC-009: spec discipline

Standard.
