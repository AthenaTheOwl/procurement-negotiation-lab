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

## Standard gates

- `python -m uv run pytest tests/factory/`
- `python -m uv run pytest`
- `npx.cmd tsc --noEmit`
- `npm.cmd test -- --run`
- `python scripts/spec_check.py`
- Browser QA not applicable to this CLI-only spec.
