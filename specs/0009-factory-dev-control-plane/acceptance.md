# acceptance: factory dev control plane

## R-FACTORY-001

- MCP initialize returns server info and tool/resource capabilities.
- `tools/list` exposes the factory tools.
- `factory_status` returns recorded tasks.
- No generic shell-command tool exists.
- Browser QA not required; this is CLI/dev infrastructure.

## R-FACTORY-002

- `--expand-spec specs/0009-factory-dev-control-plane` writes one YAML per
  unchecked pass.
- Generated YAML loads through `load_task`.
- Generated YAML contains checkpoints, dual review, and proof gates.

## R-FACTORY-003

- A task can specify `review.reviewers`.
- Dry-run pipeline records one `review.done` event per reviewer.
- Conservative aggregation is used: reject wins over patch, patch wins over
  clean.

## R-FACTORY-004

- JSON object metadata extraction works.
- JSONL nested metadata extraction works.
- Synthetic IDs remain tagged when real IDs are absent.

## R-FACTORY-005

- `--run-many` routes several task YAML files.
- Fallback routing works without LangGraph installed.
- Optional `factory` extra documents the LangGraph/MCP dependency path.

## R-FACTORY-006

- `#/factory` opens a Factory console route from the web app.
- The console shows task state, artifact refs, checkpoint/interrupt state,
  event counts, and a run-report summary.
- The console uses static replay data and the SDK `RunReport` type; the browser
  starts no agent worker and calls no backend.
- Vitest covers normalization and UI rendering.

## R-FACTORY-RUN-EVIDENCE-001

- A pipeline run produces exactly one `ops/event-ledger/<run-id>.jsonl`
  file.
- Every line is a JSON object conforming to
  `ops/schemas-cache/event.schema.json`.
- The ledger contains `pipeline.start`, at least one
  `gate.check.passed` or `gate.check.failed`, and a terminal
  `gate.run.evidence_recorded` event.

## R-FACTORY-RUN-EVIDENCE-002

- The same pipeline run produces exactly one
  `ops/run-records/<run-id>.json` file.
- The file conforms to `ops/schemas-cache/run.schema.json` including
  the six new replay-equivalence fields.
- The Run record's `status` matches the terminal pipeline state.

## R-FACTORY-RUN-EVIDENCE-003

- `prompt_snapshot_hash` is a 64-char lowercase hex string.
- `tool_schemas_snapshot_hash` is a 64-char lowercase hex string.
- Two pipeline runs with identical input produce byte-identical
  hashes (unit-tested via `canonicalize_prompt` /
  `canonicalize_tool_surface` stability).

## R-FACTORY-RUN-EVIDENCE-004

- For runs inside a git worktree, `sandbox_image_ref` is set as
  `<worktree-path>@<head-sha>` with a 40-char SHA suffix.
- For runs without a derivable worktree, the field is absent from
  the Run record (the schema treats absence as "not derivable").

## R-FACTORY-RUN-EVIDENCE-005

- `gate_results_summary.gates_passed` lists every gate that exited
  with `ok=True`.
- `gate_results_summary.gates_failed` lists every gate that exited
  with `ok=False`.
- `gate_results_summary.all_passed` is true iff `gates_failed` is
  empty.

## R-FACTORY-RUN-EVIDENCE-006

- `python scripts/validate_run_evidence.py` exits 0 on a clean repo.
- The validator exits non-zero when a Run record is malformed, an
  Event line is malformed, or a ledger carries a terminal event with
  no matching Run record.
- The validator runs in `.github/workflows/tests.yml` on every push
  to main and every PR.

## R-FACTORY-RUN-EVIDENCE-007

- A done Run that omits `prompt_snapshot_hash`,
  `tool_schemas_snapshot_hash`, `sandbox_image_ref`, or
  `gate_results_summary` fails validation with a message naming
  the run-id and the missing field.
- The validator does not apply the required-for-done check to a
  Run whose status is anything other than `done`.

## R-FACTORY-RUN-EVIDENCE-008

- A done Run whose ledger carries no `gate.run.evidence_recorded`
  event fails validation.
- A done Run whose ledger carries at least one
  `gate.run.evidence_recorded` event passes the terminal-event
  check.

## R-FACTORY-RUN-EVIDENCE-009

- A `prompt_snapshot_hash` mismatch between the Run record and the
  `pipeline.start` event fails validation.
- A `tool_schemas_snapshot_hash` mismatch between the Run record
  and the `pipeline.start` event fails validation.
- A `fields_populated` set on `gate.run.evidence_recorded` that
  drops or adds a field relative to the Run record fails
  validation.

## R-FACTORY-RUN-EVIDENCE-010

- A Run record whose `gate_results_summary.gates_passed` does not
  match the sorted list of `gate.check.passed` gate names from
  the ledger fails validation.
- A Run record whose `gate_results_summary.gates_failed` does not
  match the sorted list of `gate.check.failed` gate names from
  the ledger fails validation.
- A Run record whose `gate_results_summary.all_passed` disagrees
  with the ledger outcomes fails validation.

## Standard gates

- `python -m uv run pytest tests/factory/`
- `python -m uv run pytest`
- `npx.cmd tsc --noEmit`
- `npm.cmd test -- --run`
- `python scripts/spec_check.py`
- `python scripts/validate_run_evidence.py`
- Browser QA not applicable to this CLI-only spec.
