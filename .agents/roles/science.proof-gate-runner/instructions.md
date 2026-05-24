# role: science.proof-gate-runner

## Mission

Run the full proof-gate set against a patch that has cleared code
review, produce a `gate_run` test_report artifact, and sign off only
on a fully green pass. A red gate routes the run back to
`engineering.implementation` for a fix.

## When to act

- `engineering.code-reviewer` returns an `approved` verdict and the
  patch is ready for the gate sweep.
- A scheduled regression run sweeps the gates against main without a
  pending patch.
- A mobile-release pass requires the full Maestro flow against the
  Android emulator under `.github/workflows/mobile-e2e.yml`.

## Inputs

- `patch` (required) — the approved diff.
- `review_verdict` (required) — must equal `approved` to start a
  sign-off run; `changes_requested` rejects the run as out of order.

## Gate set

Six python gates:

- `python scripts/spec_check.py`
- `python scripts/voice_lint.py`
- `python scripts/validate_decisions.py`
- `python scripts/validate_roles.py`
- `python scripts/validate_tools.py`
- `python scripts/validate_policies.py`

Python test + lint + security:

- `python -m uv run pytest`
- `python -m uv run ruff check .`
- `python -m uv run mypy src`
- `python -m uv run bandit -q -r src`
- `python -m uv run pip-audit`

JS workspace:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test --workspace=@lab/mobile -- --runInBand`
- `npm run typecheck --workspace=@lab/mobile`

When in scope:

- Maestro flow against the Android emulator
  (`apps/mobile/.maestro/level-1-walkthrough.yaml` at minimum).
- Playwright smoke against the local preview server or the hosted
  Vercel URL (`SMOKE_URL=...`).

## Outputs

- `gate_run` — the test_report artifact naming each gate, exit code,
  and the captured stdout/stderr; stored under
  `ops/factory-artifacts/<task-id>/<round>-gate-<name>.txt` per gate
  when the factory invokes the role.
- `sign_off` — a trace event in `ops/event-log/YYYY-MM-DD.jsonl`
  with `gates_passed: true` or `gates_passed: false` plus a list of
  failing gates.

## Forbidden actions

- Modifying secrets.
- Merging to main.
- Applying its own patch.
- Triggering a production deploy.

## Escalation

A failed gate routes the run back to `engineering.implementation`
with the failing-gate name and the captured output. The role does
not attempt to fix the gate itself; gate fixes flow through the
implementer + reviewer pair.

## Runtime hint

`custom_python`. The gate runner is a small Python wrapper around
the repo's shell invocations; LLM runtimes are overkill here.

## Notes for this repo

- The `mobile.maestro_run` tool requires an active Android emulator.
  The `mobile-e2e-requires-emulator` policy reflects that constraint:
  the gate runs only when the emulator is healthy.
- The Playwright smoke against the hosted Vercel URL runs on a
  weekly schedule plus manual dispatch
  (`.github/workflows/smoke.yml`); the gate runner picks it up only
  for release-pass runs.
- The factory subsystem already invokes the gate runner as the
  default gate stage. A standalone invocation (outside the factory)
  uses the same gate set.
