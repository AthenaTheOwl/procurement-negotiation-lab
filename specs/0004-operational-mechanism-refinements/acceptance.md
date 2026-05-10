# acceptance: operational mechanism refinements

A pass is accepted when every check below passes. Order matches build order.

## Pass A — α clipping (R-OPS-001)

| Check | Verification |
|---|---|
| α slider visible on Lab Arena | DOM contains element with `data-testid="alpha-slider"` or equivalent |
| α default = 1.0 | unit test asserts default |
| Lowering α reduces transfer magnitudes | `vcgTransfer(scenario, agent, 0.5)` equals 0.5 × `vcgTransfer(scenario, agent, 1.0)` |
| α = 0 → no-worse-off fails when realized < outside | unit test on canonical scenario |
| Transfer ledger updates live on α change | AppTest: change slider, ledger row values change without page reload |
| Arc Step 3 contains the α slider and explanation paragraph | AppTest: navigate to step 3, assert slider exists |
| α value present in run-report export | (when run-report ships) JSON includes `alpha` field |

## Pass B — Reliability multipliers (R-OPS-002)

| Check | Verification |
|---|---|
| Reliability slider per agent card | DOM contains one slider per agent |
| Default = 1.0 | unit test |
| Effective capacity = stated × reliability | `effectiveCapacity(agent)` unit test |
| Mechanism plan output uses effective capacity | end-to-end test: reliability=0.5 → final quantity ≤ 0.5 × stated capacity |
| Reliability = 0 → infeasible flagged | `transferLedger.feasible` returns false |
| Both stated and effective values displayed when reliability < 1 | AppTest |
| Arc Step 2 has the explanatory paragraph | AppTest finds the paragraph text |

## Pass C — ε-frontier (R-OPS-003)

| Check | Verification |
|---|---|
| ε slider visible on Lab Arena | DOM presence |
| Default ε = 0 returns top-1 | `frontier(scenario, algo, 0).plans.length === 1` |
| ε > 0 returns K ≤ 5 plans | `frontier(scenario, algo, 0.05).plans.length` between 1 and 5 |
| All returned plans within ε of optimal | for each plan, `(optimal - plan.global_utility) / optimal ≤ epsilon` |
| Click a plan → transfer ledger recomputes | AppTest: click second plan, assert transfer values change |
| Arc Step 7 has the ε slider + paragraph | AppTest |

## Pass D — Decoy demand (R-OPS-004)

| Check | Verification |
|---|---|
| Audit Mode toggle visible | DOM presence on Lab Arena |
| Decoy library has ≥ 5 decoys | `decoys.length >= 5` |
| Each decoy has expectedResponse + catchesMisreportKind | unit test |
| Audit panel renders match/mismatch table | AppTest |
| Each decoy's expectedResponse fires on canonical match | unit test per decoy |
| Each decoy's expectedResponse rejects canonical mismatch | unit test per decoy |
| Arc Step 6 has "test against decoys" button | AppTest |
| docs/decoy-library.md exists with each decoy described | file presence + grep |

## Discipline gates (per pass)

```
npm.cmd run build                    no errors
npm.cmd run test -- --run             all tests pass
python -m uv run pytest               all tests pass
python -m uv run ruff check .         all checks passed
python -m uv run mypy src             no issues
python -m uv run bandit -q -r src     no issues
python -m uv run pip-audit            no known vulnerabilities
```

Append `ops/run-ledger.md` per pass with commit SHA + which gates passed.

## Definition of done

This spec is **done** when:

- All check tables above pass.
- `traceability.md` shows every R-OPS-* requirement linked to satisfying
  tasks and acceptance checks.
- The Lab Arena has visible, live-updating sliders for α, reliability (per
  agent), ε; plus an Audit Mode toggle and decoy panel.
- The Arc has the small additions noted in tasks (steps 2, 3, 6, 7).
- The deployed Vercel app shows the new controls without errors.
- Browser QA evidence saved in `ops/qa-evidence/0004-pass-{A,B,C,D}.png`.
