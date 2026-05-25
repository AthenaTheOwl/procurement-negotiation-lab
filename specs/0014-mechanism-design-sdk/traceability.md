# traceability: mechanism-design SDK

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-SDK-001** SDK package wraps the deterministic engine (owner_role: engineering.implementation) | A1, A5, B2, V1, V2 | Package exists, imports `procurement_lab`, wheel package list includes SDK | done |
| **R-SDK-002** public API covers scenarios, comparison, and participation (owner_role: engineering.implementation) | A2, A3, B3, V1, V2 | Public API exports scenario, solve/compare, and participation report helpers | done |
| **R-SDK-003** SDK demo and tests run without the app (owner_role: science.proof-gate-runner) | A4, A5, B1, B3, V1, V2 | Module demo prints JSON; pytest covers demo; docs include import example | done |

## Proof record

The final command outputs belong in the commit message and delivery report.
This traceability file records the requirement-to-task mapping.
