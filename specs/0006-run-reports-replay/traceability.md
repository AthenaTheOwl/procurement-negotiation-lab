# traceability: run reports, replay, and shareable evidence

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-REPORT-001** one-click JSON export (owner_role: engineering.implementation) | A1, A2, A4, B1, B2, B3, B4 | Pass A: schema-valid; Pass B: button + clipboard + toast | done |
| **R-REPORT-002** one-click markdown export (owner_role: engineering.implementation; owner_role_pending_graduation: documentation.changelog-author) | C1, C2, C3, C4 | Pass C: valid markdown; <80 lines; templates fire; idempotent | done |
| **R-REPORT-003** replay from JSON (owner_role: engineering.implementation) | A3, D3, D7 | Pass A: parseRunReport; Pass D: textarea + load + round-trip | done |
| **R-REPORT-004** run ledger in localStorage (owner_role: engineering.implementation) | D1, D2, D4, D5, D6 | Pass D: save/list/load/delete; cap at 20; auto-save | done |
| **R-REPORT-005** screenshot-safe summary (owner_role: engineering.implementation; owner_role_pending_graduation: design.flow-illustrator) | A2, E1, E2, E3, E4, E5 | Pass E: /report?id route; 1200×800 fits; read-only | done (ReportSurface; `?report=<id>` and `?json=<encoded>`; read-only) |
| **R-SPEC-006** discipline (owner_role: product.spec-writer) | S1, S2, S3 | Spec entry; this file; run-ledger | in progress |

## Update protocol

1. Set checkbox in `tasks.md` to `[x]`.
2. Note commit SHA in `ops/run-ledger.md`.
3. Update Status column.
4. When all tasks done for a requirement, mark done.
5. When all requirements done, spec ready for acceptance run.

## Status snapshot

```
Pass A — shape + schema       done (runReport.ts, runReportSchema.ts)
Pass B — JSON export          done (RunReportPanel + assembleReport + clipboard)
Pass C — markdown export      done (reportMarkdown.ts + 4 templates)
Pass D — replay + ledger      done (reportStorage.ts + parseRunReport + RunReportPanel)
Pass E — summary view         done (ReportSurface + ?report=<id> + ?json=<encoded>)
Spec discipline               in progress (this file)
```

## Cross-spec dependencies

- **Depends on spec 0004**: parameters (α, reliability, ε, audit) captured.
- **Composes with spec 0005**: when N-party ships, report extends to N
  participants; bump schema version to 0.6.1 or 0.7.0.
- **Composes with spec 0003** (arc): export button can also live in arc.
