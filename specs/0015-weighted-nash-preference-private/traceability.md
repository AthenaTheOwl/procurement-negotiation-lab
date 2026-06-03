# traceability: weighted-Nash preference-private bargaining

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-NASH-001** weighted-Nash bargaining solver (owner_role: science.proof-gate-runner) | A4, A6, C1, D2 | weighted_nash.py solver returns Nash-product maximizer; tests/test_weighted_nash.py green | planned |
| **R-NASH-002** disagreement-point (BATNA) model (owner_role: science.proof-gate-runner) | A4, A5, A6 | Party schema accepts BATNA; allocations below BATNA excluded; participation report flags violations | planned |
| **R-NASH-003** bargaining-power weights (owner_role: science.proof-gate-runner) | A1, A4, A7 | Weights scale Nash product; equal weights reduce to symmetric Nash; documented in algorithms.md | planned |
| **R-NASH-004** preference-private iteration protocol (owner_role: science.proof-gate-runner) | A2, A3, A4 | privacy.py invoked when information_mode=private; messages match protocol spec; deterministic given seed | planned |
| **R-NASH-005** leakage measurement (owner_role: science.proof-gate-runner) | A2, A3, A6, D4 | Per-run leakage report with epsilon + round count + message log hash; property test R-PROP-006 green | planned |
| **R-NASH-006** leakage-report schema (owner_role: engineering.implementation) | A3, A6 | LeakageReport Pydantic model + JSON Schema mirror; run-evidence emitter validates | planned |
| **R-NASH-007** multi-party generalization (owner_role: engineering.implementation) | C1, C2, C3 | Solver accepts N=2..10; no NotImplementedError at N>2; SDK demo + property battery cover N=3,5 | partial: centralized oracle, weighted-Nash plaintext/bounded, SDK compare, and CLI demo cover N=3; ADMM, mobile, and N=5 property rows pending |
| **R-NASH-008** cryptographic MPC second mechanism (owner_role: science.proof-gate-runner) | D1, D2, D3, D4, E1, E2, E3 | MPC mechanism returns same allocation as plaintext within tolerance; leakage report records negligible-function parameter | planned |
| **R-NASH-009** mechanism selector exposed in SDK (owner_role: engineering.implementation) | A5, E1 | compare_mechanisms accepts new identifiers; CLI demo exposes --mechanism; allocation schema stable across mechanisms | planned |
| **R-NASH-010** per-run record references mechanism + leakage (owner_role: engineering.implementation) | A3, A6 | run record carries mechanism_id + leakage_report_ref; mechanism.bargaining.completed event present; replay-determinism gate covers all mechanisms | planned |

## Proof record

Spec 0015 ships with the W2 and W5 task waves named in `tasks.md`. The
acceptance gates in `acceptance.md` together with the property battery
in spec 0017 (R-PROP-002..006, R-PROP-008, R-PROP-011) provide the
proof surface. DEC-NASH-001 / DEC-NASH-002 / DEC-MPC-001 carry the
systems-thinking fields and are referenced from the run-record
emitter via the DEC-FACTORY-007 chain.
The W4 SDK proof is
`python -m uv run pytest tests/test_weighted_nash.py tests/test_mechanism_sdk.py -q`
plus
`python -m uv run python -m procurement_mechanism_sdk.demo --sample multi_party --mechanism weighted_nash_bounded`.
