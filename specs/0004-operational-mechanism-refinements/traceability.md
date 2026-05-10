# traceability: operational mechanism refinements

Each requirement maps to its satisfying tasks and acceptance checks.
Updated as tasks ship.

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-OPS-001** α clipping on CPP+VCG | A1, A2, A3, A4, A5, A6 | Pass A: α slider visible; default 1.0; reduces transfers proportionally; α=0 fails no-worse-off; live update; Arc Step 3 has slider+copy | not started |
| **R-OPS-002** reliability multipliers per participant | B1, B2, B3, B4, B5 | Pass B: per-agent slider; default 1.0; effective capacity = stated × reliability; mechanism uses effective; both values shown; Arc Step 2 has paragraph | not started |
| **R-OPS-003** ε-frontier (top-K near-optimal) | C1, C2, C3, C4, C5 | Pass C: ε slider; ε=0 returns top-1; ε>0 returns ≤ K=5 within ε of optimal; click recomputes transfer; Arc Step 7 has slider+copy | not started |
| **R-OPS-004** decoy demand scenarios | D1, D2, D3, D4, D5 | Pass D: Audit Mode toggle; ≥ 5 decoys; expectedResponse fires on match, rejects mismatch; audit panel renders table; Arc Step 6 has button; docs/decoy-library.md exists | not started |
| **R-SPEC-004** spec discipline | S1, S2, S3 | Spec entry in specs/README; this file kept current; ops/run-ledger.md per pass | in progress (this file landing as first artifact) |

## Update protocol

When a task ships:

1. Set its checkbox in `tasks.md` to `[x]`.
2. Note the commit SHA in `ops/run-ledger.md`.
3. Update the Status column above to one of: not started · in progress · done.
4. When all tasks for a requirement are done, mark the requirement done.
5. When all requirements are done, the spec is ready for the acceptance run.

## Status snapshot

```
Pass A — α clipping              not started
Pass B — reliability             not started
Pass C — ε-frontier              not started
Pass D — decoy demand            not started
Spec discipline                  in progress (this file)
```

## Cross-spec dependencies

- **Depends on spec 0003**: the Lab Arena, the Arc surface, and the
  underlying simulation engine all exist because 0003 shipped them.
  This spec adds onto those without breaking the 0003 acceptance checks.
- **Composes with future spec 0005** (multi-vendor + portal). 0005 will
  reuse the α and reliability machinery this spec builds.
- **Composes with future spec 0006** (pilot metrics dashboard). The decoy
  audit results from R-OPS-004 are a natural input to the dashboard.
