# tasks: multi-party portal and scenario authoring

Tasks grouped by pass. Build order: A → B → C → D → E.
(A first because every other pass depends on multi-party data model.)

## Pass A — Multi-party data model + algorithm extensions (~4 hrs)

- [ ] **A1**: Audit `simulation.ts` for hardcoded `participants[0]` /
  `[1]` accesses; refactor to role-based filter. *(R-PORTAL-001)*
- [ ] **A2**: Generalize each of the 8 mechanisms to iterate over all
  participants. ADMM consensus update averages over N, alternating BR
  rotates through N, etc. *(R-PORTAL-001)*
- [ ] **A3**: Update `LabScenario.participants` type bounds (min 2, max 8).
  Add Role enum if not present. *(R-PORTAL-001)*
- [ ] **A4**: Add 3 multi-party seed scenarios to `scenarios.ts`:
  3-supplier-shortage, 2-buyer-1-supplier-conflict, buyer-supplier-packager.
  *(R-PORTAL-001)*
- [ ] **A5**: Multi-party algorithm tests in `simulation.test.ts` — each
  mechanism produces a feasible plan for N=3 and N=5 cases. *(R-PORTAL-001)*

## Pass B — View projection + privacy enforcement (~3 hrs)

- [ ] **B1**: Create `web/src/model/views.ts` with
  `projectScenario(scenario, view)` returning a `ProjectedScenario`.
  *(R-PORTAL-002, R-PORTAL-003)*
- [ ] **B2**: Add `ProjectedParticipant | RedactedParticipant` type union.
  *(R-PORTAL-003)*
- [ ] **B3**: Create `BuyerView.tsx`, `SupplierView.tsx`,
  `CoordinatorView.tsx` view components. *(R-PORTAL-002)*
- [ ] **B4**: Lab Arena: add a view picker (buyer / supplier-N /
  coordinator). Persists view across scenario edits in `useReducer`.
  *(R-PORTAL-002)*
- [ ] **B5**: Privacy tests in `views.test.ts`: assert that for each view,
  the projected scenario does not contain fields outside that view's
  visibility. Negative test: try to read `supplier.production_cost` from
  buyer view; should be `null` sentinel. *(R-PORTAL-003)*
- [ ] **B6**: UI test: AppTest asserts that buyer view DOM contains no
  text matching `production_cost`, `holding_cost`, or supplier-private
  parameters. *(R-PORTAL-003)*

## Pass C — Strategy library (~3 hrs)

- [ ] **C1**: Create `web/src/data/strategies.ts` with at least 8 named
  strategies covering buyer, supplier, packager, coordinator, custom
  roles. *(R-PORTAL-004)*
- [ ] **C2**: Each strategy has: id, name, role, description, default
  formula, default parameters, optional `teachesSpecSection`.
  *(R-PORTAL-004)*
- [ ] **C3**: Lab Arena participant-add flow: dropdown of library
  strategies; one-click instantiates a new participant with that
  strategy's defaults. *(R-PORTAL-004)*
- [ ] **C4**: Document each strategy in `docs/strategy-library.md`.
  *(R-PORTAL-004)*
- [ ] **C5**: Unit tests: each strategy's defaultUtilityFormula parses
  cleanly with the safe formula DSL. *(R-PORTAL-004)*

## Pass D — Scenario schema + import/export (~3 hrs)

- [ ] **D1**: Create `web/src/model/scenarioSchema.ts` using zod (or
  equivalent). Define the canonical shape including
  `schemaVersion: "0.5.0"`. *(R-PORTAL-005)*
- [ ] **D2**: Implement migration map for older 0.3.0 (pre-0005) scenarios.
  *(R-PORTAL-005)*
- [ ] **D3**: Lab Arena: add "Import scenario" (paste JSON) and
  "Export scenario" (copy JSON to clipboard) controls. *(R-PORTAL-005)*
- [ ] **D4**: Validation errors surface with specific field paths.
  *(R-PORTAL-005)*
- [ ] **D5**: Round-trip test in `scenarioSchema.test.ts`: export → import
  yields identical scenario. *(R-PORTAL-005)*
- [ ] **D6**: Document schema in `docs/scenario-schema.md`. *(R-PORTAL-005)*

## Pass E — Multi-party transfers + Shapley (~3 hrs)

- [ ] **E1**: Generalize `transferLedger(scenario, {alpha, splitRule})` to
  participant list of any length. *(R-PORTAL-006)*
- [ ] **E2**: Add split rules: `proportional`, `equal`, `shapley`. *(R-PORTAL-006)*
- [ ] **E3**: Create `web/src/model/shapleyTransfer.ts` implementing
  iterative Shapley for N ≤ 5. *(R-PORTAL-006)*
- [ ] **E4**: Lab Arena: render one transfer row per participant; expose
  split-rule dropdown. *(R-PORTAL-006)*
- [ ] **E5**: Multi-party no-worse-off check is per-participant; surface
  flags in the ledger UI. *(R-PORTAL-006)*
- [ ] **E6**: Shapley tests in `shapleyTransfer.test.ts`: symmetry
  (identical participants get identical transfers), efficiency (sum =
  surplus), null-player (zero-contribution participant gets zero).
  *(R-PORTAL-006)*

## Spec discipline (S*)

- [ ] **S1**: Register this spec in `specs/README.md`. *(R-SPEC-005)*
- [ ] **S2**: Update `traceability.md` as tasks ship. *(R-SPEC-005)*
- [ ] **S3**: Append `ops/run-ledger.md` per pass. *(R-SPEC-005)*

## Build order

```
A (data model + algorithms)   foundation; everything else depends
B (views + privacy)            depends on A
C (strategy library)           parallel to B; depends on A
D (schema + import/export)     parallel; depends on A
E (multi-party transfers)      depends on A; nice to ship after B for UI integration
S* (discipline)                throughout
```

Estimated total: ~16 hours. Largest spec so far.

## Discipline gates (per pass)

Standard set: `npm.cmd run build`, `npm.cmd run test -- --run`,
`python -m uv run pytest`, ruff, mypy, bandit, pip-audit. Update
`ops/proof_gates.json` and append `ops/run-ledger.md`.

## Out of scope

- Run reports / replay. Spec 0006.
- Production hardening (test rings, factories). Spec 0007.
- Data bridges. Spec 0008.
- LLM-generated strategies.
- Real-time multi-user editing.
