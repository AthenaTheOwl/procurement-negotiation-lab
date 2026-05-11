# traceability: multi-party portal and scenario authoring

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-PORTAL-001** N-party participant model | A1, A2, A3, A4, A5 | Pass A: 2-8 participants; no hardcoded indices; algorithms run for N=3, N=5; welfare = sum; 3 new scenarios | done (Pass A) |
| **R-PORTAL-002** per-party view | B1, B3, B4 | Pass B: view picker visible; toggle preserves state; coordinator vs buyer vs supplier renders distinct surfaces | done (Pass B) |
| **R-PORTAL-003** privacy enforcement | B1, B2, B5, B6 | Pass B: redaction in `views.ts`; buyer DOM contains 0 supplier-private fields; type-guard prevents access | done (Pass B) |
| **R-PORTAL-004** strategy library | C1, C2, C3, C4, C5 | Pass C: ≥ 8 strategies; all roles covered; each parses; one-click instantiation; doc exists | done (Pass C) |
| **R-PORTAL-005** scenario schema + versioning | D1, D2, D3, D4, D5, D6 | Pass D: zod schema; schemaVersion; migration; round-trip lossless; field-path errors; doc exists | done (Pass D) |
| **R-PORTAL-006** multi-party welfare + transfer | E1, E2, E3, E4, E5, E6 | Pass E: ledger N-party; proportional/equal/shapley split; per-participant no-worse-off; Shapley axioms hold | done (Pass E) |
| **R-SPEC-005** discipline | S1, S2, S3 | Spec entry; this file kept current; ledger appended | in progress |

## Update protocol

1. Set checkbox in `tasks.md` to `[x]`.
2. Note commit SHA in `ops/run-ledger.md`.
3. Update Status column above.
4. When all tasks for a requirement done, mark requirement done.
5. When all requirements done, spec is ready for acceptance run.

## Status snapshot

```
Pass A — data model + algorithms    done (deriveParticipants, multi-party ledger)
Pass B — views + privacy             done (views.ts, ViewPicker, ParticipantRoster)
Pass C — strategy library            done (10 strategies, 5 roles)
Pass D — schema + import/export      done (scenarioSchema.ts, parseScenario)
Pass E — multi-party transfers       done (shapleyTransfer.ts; prop/equal/shapley)
Spec discipline                      in progress (this file)
```

## Cross-spec dependencies

- **Depends on spec 0004**: α, reliability, ε, decoys all extend naturally
  to N parties under the new participant-list semantics.
- **Composes with future spec 0006** (run reports): reports must capture
  per-party views + chosen split rule + N-party trace.
- **Composes with future spec 0007** (production hardening): scenario
  schema from this spec is the foundation for schema-first validation.
- **Composes with future spec 0008** (data bridges): import path from this
  spec is the entry point for CSV → scenario conversion.
