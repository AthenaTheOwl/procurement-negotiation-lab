# tasks: operational mechanism refinements

Tasks grouped by refinement. Each task lists the requirement it satisfies.
Build order: A → B → C → D (or any independent order; the four refinements
don't depend on each other). Discipline tasks (S*) run alongside.

## Pass A — α clipping (~2 hrs)

- [x] **A1**: Add `alpha?: number` to `LabScenario` in `web/src/model/types.ts`.
  Default 1.0. *(R-OPS-001)*
- [x] **A2**: Add `vcgTransfer(scenario, agentId, alpha)` to `simulation.ts`
  and route the cpp-vcg mechanism through it. *(R-OPS-001)*
- [x] **A3**: Update `transferLedger(scenario)` signature to accept an
  optional `{ alpha }` and pass through to vcgTransfer. *(R-OPS-001)*
- [x] **A4**: Lab Arena: add α slider on the mechanism config panel.
  Live-update the transfer ledger on change. *(R-OPS-001)*
- [x] **A5**: Arc Step 3: add a small α slider plus a one-paragraph
  explanation that α weakens dominant-strategy incentive compatibility
  while preserving anti-gaming pressure. *(R-OPS-001)*
- [x] **A6**: Unit tests in `simulation.test.ts` covering α=0, α=0.5,
  α=1.0; assert the no-worse-off check fails at α=0 when realized utility
  is below outside option. *(R-OPS-001)*

## Pass B — Reliability multipliers (~2 hrs)

- [x] **B1**: Add `reliability?: number` to `ParticipantSpec` (or whatever
  the React app's agent type is). Default 1.0. *(R-OPS-002)*
- [x] **B2**: Add `effectiveCapacity(agent)` helper to `simulation.ts`.
  Use it in every place the optimization currently reads capacity.
  *(R-OPS-002)*
- [x] **B3**: Lab Arena: each agent card gains a reliability slider.
  Live-update the displayed effective capacity and mechanism plan output.
  *(R-OPS-002)*
- [x] **B4**: Arc Step 2: add a brief paragraph framing reliability as an
  alternative to full disclosure — the planner uses behavioral history as
  a prior on stated capacity. *(R-OPS-002)*
- [x] **B5**: Unit tests: reliability=0.5 reduces effective capacity by
  half; reliability=0 yields zero capacity and mechanism flags infeasible.
  *(R-OPS-002)*

## Pass C — ε-frontier (~3 hrs)

- [x] **C1**: Add `Frontier` type to `types.ts`: `{ plans: AlgorithmRun[],
  epsilon: number, K: number }`. *(R-OPS-003)*
- [x] **C2**: Add `frontier(scenario, algorithm, epsilon, K)` to
  `simulation.ts`. Enumerate plans by descending global utility; keep
  within ε of optimal; cap at K=5. *(R-OPS-003)*
- [x] **C3**: Lab Arena: add ε slider plus a list of frontier plans. Click
  a plan → display its CBT transfer ledger and per-agent utility.
  *(R-OPS-003)*
- [x] **C4**: Arc Step 7: add a small ε slider plus a paragraph on the
  optimal-vs-robust tradeoff. *(R-OPS-003)*
- [x] **C5**: Unit tests: ε=0 returns top-1; ε=0.05 returns at most K=5
  plans, all within 5% of optimal; transfers recompute consistently per
  selected plan. *(R-OPS-003)*

## Pass D — Decoy demand (~3 hrs)

- [x] **D1**: Create `web/src/model/decoys.ts` with the 5 decoys listed in
  the design doc and the audit harness. *(R-OPS-004)*
- [x] **D2**: Lab Arena: add Audit Mode toggle and decoy results panel
  (table of decoy name × match/mismatch × explanation). *(R-OPS-004)*
- [x] **D3**: Arc Step 6: add a "test against decoys" button on the
  authored agent — runs the decoy harness against the user's authored
  agent and shows match/mismatch. *(R-OPS-004)*
- [x] **D4**: Unit tests in `decoys.test.ts`: each decoy's expectedResponse
  fires on the canonical match and rejects the canonical mismatch.
  *(R-OPS-004)*
- [x] **D5**: Document the decoy library in
  `docs/decoy-library.md`. *(R-OPS-004)*

## Spec discipline (S*)

- [x] **S1**: Register this spec in `specs/README.md`. *(R-SPEC-004)*
- [x] **S2**: Update `traceability.md` as tasks ship. *(R-SPEC-004)*
- [x] **S3**: Append `ops/run-ledger.md` rows per pass with commit SHA
  and test/build evidence. *(R-SPEC-004)*

## Build order (independent — pick the easiest first)

```
A (α clipping)          smallest model change; ships fastest
B (reliability)          additive; doesn't break other code
C (ε-frontier)           moderate; the K-enumeration is new but bounded
D (decoys)               largest; new file + new UI panel + 5 decoys
```

A or B in a single 2-hour session is achievable. C across one session.
D wants its own session for the decoy library quality.

## Discipline gates (per pass)

Every pass exits through these gates with green output:

```
npm.cmd run build
npm.cmd run test -- --run
python -m uv run pytest
python -m uv run ruff check .
python -m uv run mypy src
python -m uv run bandit -q -r src
python -m uv run pip-audit
```

Update `ops/proof_gates.json` with the pass name and timestamp on success.
Append `ops/run-ledger.md` with commit SHA + test evidence.

## Out of scope

- Multi-vendor mode (3+). Spec 0005.
- Vendor portal flow. Spec 0005.
- Pilot metrics dashboard. Spec 0006.
- Run report export (Codex's earlier recommendation). Separate spec.
- LLM-generated explanatory copy for the new controls.
