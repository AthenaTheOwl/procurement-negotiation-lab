# requirements: production hardening from MedRoute patterns

## Scope

Borrow the habits, not the domain, from `../cargo-health/medroute-main`.
The lab is currently a working public demo; this spec adds the discipline
that keeps it durable as it grows: schema-first validation, test data
factories, typed decision-event logs, deployed-app smoke tests, and a
spec checker that refuses missing traceability.

Not about turning the lab into "production software." The lab remains a
single-user learning demo. But the engineering habits that make small
public demos durable are worth importing — they prevent the demo from
silently breaking as features land.

## Requirements

### R-HARDEN-001: schema-first scenario validation (zod)

WHEN any scenario enters the system — built-in, imported, replayed —
THE SYSTEM SHALL validate it against a single canonical zod schema and
refuse malformed scenarios with a clear field-path error.

Acceptance:
- `web/src/model/scenarioSchema.ts` is the single source of truth for the
  LabScenario shape.
- All scenario load paths (built-in fixtures, import, replay) go through
  the schema.
- Invalid scenarios surface field-path errors, not stack traces.
- TypeScript type `LabScenario` is inferred from the zod schema (single
  source of truth).

### R-HARDEN-002: test data factories

WHEN a test needs a scenario or participant fixture, THE SYSTEM SHALL
provide named factory functions that produce schema-valid objects with
overrideable defaults.

Acceptance:
- `web/src/test/factories.ts` exports at least: `buildScenario`,
  `buildParticipant`, `buildRunReport`.
- Each factory accepts a partial override and merges into defaults.
- Each factory's output validates against the corresponding zod schema.
- Existing inline test fixtures are migrated to factory usage.

### R-HARDEN-003: typed decision-event log

WHEN a Lab run produces a result, THE SYSTEM SHALL emit a typed audit log
of decision events (scenario loaded, algorithm started, plan computed,
transfer computed, view switched, export issued, replay loaded).

Acceptance:
- `web/src/model/decisionEvent.ts` defines the event type union.
- Each event has: `timestamp`, `kind`, `payload`, `runId`.
- Events accumulate in `useReducer` state and are included in the run
  report.
- Test asserts that a canonical run sequence produces the expected event
  sequence.

### R-HARDEN-004: deployed-app smoke test (Playwright)

WHEN this spec ships, THE SYSTEM SHALL have a Playwright smoke test that
walks the deployed Vercel app end-to-end and asserts key UI elements
render without errors.

Acceptance:
- `web/e2e/smoke.spec.ts` (Playwright) exists.
- Smoke test targets the deployed URL (configurable via env var).
- Walks: load home → hero visible → click "Walk the arc" → arc step 1
  renders → advance to step 5 → algorithm comparison visible.
- Runs in CI on the schedule (weekly + manual dispatch).
- Failure opens a GitHub issue on the repo.

### R-HARDEN-005: spec_check refuses missing traceability

WHEN the spec_check script runs, IT SHALL refuse to pass if any active
spec has requirements without linked tasks or acceptance checks.

Acceptance:
- `scripts/spec_check.py` enumerates all R-* requirements across all
  active spec directories.
- For each R-*, asserts at least one task in `tasks.md` and one acceptance
  check in `acceptance.md` references it by ID.
- Failure surfaces specific R-* IDs that are missing coverage.
- CI runs `spec_check` on every PR.

### R-HARDEN-006: contract / observability test ring

WHEN a Lab feature involves multiple modules, THE SYSTEM SHALL have
integration tests (not just unit tests) that exercise the cross-module
contract.

Acceptance:
- At least 3 integration tests covering:
  - Scenario load → algorithm comparison → transfer ledger
  - Authored formula → mechanism run → result display
  - Run report export → replay → identical state
- Integration tests live in `web/src/integration/` (or equivalent).
- Each integration test asserts at the contract level (outputs of public
  module APIs), not the internal-state level.

### R-SPEC-007: spec discipline

Standard.

## Out of scope

- Real CDN / edge / observability infrastructure. Vercel's default
  monitoring suffices.
- Authentication / authorization. The lab is public.
- Database / server-side state. localStorage only.
- A/B testing or feature flags. The lab ships one configuration.
- LLM-based eval harness. Deterministic tests only.
