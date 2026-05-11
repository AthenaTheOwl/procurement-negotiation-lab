# tasks: production hardening from MedRoute patterns

Build order: A → B → C → D → E → F. (A depends on 0005's scenarioSchema.)

## Pass A — Schema-first enforcement (~2 hrs)

- [ ] **A1**: Ensure `scenarioSchema.ts` (from spec 0005) is the single
  source of truth for `LabScenario`. Derive the type via `z.infer`.
  *(R-HARDEN-001)*
- [ ] **A2**: Route every scenario load path through
  `scenarioSchema.parse()`. *(R-HARDEN-001)*
- [ ] **A3**: Audit existing fixtures in `scenarios.ts`; each must parse
  on module load (or via a startup test). *(R-HARDEN-001)*
- [ ] **A4**: Invalid scenarios surface field-path errors. *(R-HARDEN-001)*

## Pass B — Test data factories (~2 hrs)

- [ ] **B1**: Create `web/src/test/factories.ts` with `buildScenario`,
  `buildParticipant`, `buildRunReport`. *(R-HARDEN-002)*
- [ ] **B2**: Each factory's output validates against its zod schema.
  *(R-HARDEN-002)*
- [ ] **B3**: Migrate existing inline test fixtures to factory usage
  (grep for inline `participants: [{`...). *(R-HARDEN-002)*
- [ ] **B4**: Factory tests: defaults produce valid; overrides merge
  correctly; output validates. *(R-HARDEN-002)*

## Pass C — Decision event log (~3 hrs)

- [ ] **C1**: Create `web/src/model/decisionEvent.ts` with the
  `DecisionEvent` union and a reducer slice. *(R-HARDEN-003)*
- [ ] **C2**: Emit events from scenario loading, algorithm runs, transfer
  computation, view switches, exports, replays. *(R-HARDEN-003)*
- [ ] **C3**: Bound the log at ~200 most recent events. *(R-HARDEN-003)*
- [ ] **C4**: Include the event log in the run report (extend
  spec 0006's RunReport type with `events: DecisionEvent[]`).
  *(R-HARDEN-003)*
- [ ] **C5**: Test: canonical sequence (load → run → export) produces the
  expected event sequence. *(R-HARDEN-003)*

## Pass D — Playwright smoke (~3 hrs)

- [ ] **D1**: Add Playwright to devDependencies. Configure
  `playwright.config.ts`. *(R-HARDEN-004)*
- [ ] **D2**: Create `web/e2e/smoke.spec.ts` covering: hero loads, "Walk
  the arc" click, arc step 1 visible, advance to step 5, mechanism
  comparison visible. *(R-HARDEN-004)*
- [ ] **D3**: Add `.github/workflows/smoke.yml` running smoke against
  the deployed URL on weekly schedule + workflow_dispatch.
  *(R-HARDEN-004)*
- [ ] **D4**: Smoke failure opens a GitHub issue (or integrates with the
  existing maintenance pipeline). *(R-HARDEN-004)*

## Pass E — spec_check enforcement (~2 hrs)

- [ ] **E1**: Update `scripts/spec_check.py` to enumerate R-* across all
  active spec directories. *(R-HARDEN-005)*
- [ ] **E2**: For each R-*, assert at least one task and one acceptance
  check reference it. *(R-HARDEN-005)*
- [ ] **E3**: Failure surfaces specific R-* IDs missing coverage.
  *(R-HARDEN-005)*
- [ ] **E4**: Add `.github/workflows/spec-check.yml` running on every PR.
  *(R-HARDEN-005)*
- [ ] **E5**: Backfill: if any current spec has uncovered R-*, either fix
  the spec or run spec_check in advisory mode initially. *(R-HARDEN-005)*

## Pass F — Integration tests (~3 hrs)

- [ ] **F1**: Create `web/src/integration/` directory. *(R-HARDEN-006)*
- [ ] **F2**: `scenario-to-ledger.test.ts` — load → run all 8 mechanisms
  → compute transfers → assert ledger structure. *(R-HARDEN-006)*
- [ ] **F3**: `formula-authoring.test.ts` — valid formula reruns; invalid
  surfaces field-path error. *(R-HARDEN-006)*
- [ ] **F4**: `report-roundtrip.test.ts` — export → clear → replay →
  identical state. *(R-HARDEN-006)*

## Spec discipline (S*)

- [ ] **S1**: Register in `specs/README.md`. *(R-SPEC-007)*
- [ ] **S2**: Update `traceability.md` as tasks ship. *(R-SPEC-007)*
- [ ] **S3**: Append `ops/run-ledger.md` per pass. *(R-SPEC-007)*

## Build order

```
A (schema enforcement)        depends on 0005's scenarioSchema
B (factories)                  parallel to A
C (decision events)            parallel; integrates with spec 0006
D (Playwright)                 independent; runs against live URL
E (spec_check)                 independent
F (integration tests)          depends on A, B
```

Estimated: ~15 hours total.

## Discipline gates

Standard set. spec_check itself becomes a discipline gate after Pass E.

## Out of scope

- Auth, DB, server state.
- A/B testing, feature flags.
- Performance optimization beyond what tests catch.
- Accessibility audit (separate spec if pursued).
- LLM-based test generation.
