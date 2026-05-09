# traceability: bergemann arc + so-what pass

Each requirement maps to the tasks that satisfy it and the acceptance checks
that verify it. Updated as tasks ship.

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-ARC-001** claim-the-field hero | A1, A2, A3, A4, A5 | Pass A: hero contains "mechanism design"; live $ figure; Bergemann link; primary CTA opens Arc; browser QA screenshot | done |
| **R-ARC-002** guided arc surface | B1, B2, B3, B4, B5, B6, B7, B11 | Pass B: arc accessible; forward/back works; each step renders with explanation + widget + deep-link; no console errors | not started |
| **R-ARC-003** convergence-path comparison | B8 | Pass B: step 5 shows 4 algorithms side-by-side; metrics surface | not started |
| **R-ARC-004** authored utility formulas | C1, C2, C3, C4, B9 | Pass C: formula engine accepts/rejects per whitelist; ≥ 90 % coverage. Pass B step 6: editor reruns sim on valid formula, shows error on invalid | not started |
| **R-ARC-005** scenario authoring with knobs | B9 | Pass B step 6: ≥ 3 sliders; save-as-JSON copies valid spec; load-from-JSON reproduces run | not started |
| **R-ARC-006** joint-optimality demos | B10, B12, B13 | Pass B step 7: case A converges in ≤30 iter; case B ADMM oscillates while alt-BR converges; case C `feasible=false` with explanation | not started |
| **R-ARC-007** public deploy | D1, D2, D3, D4, D5, D6, D7 | Pass D: GitHub repo exists; Vercel URL 200; door 17 in doors.json + manifest + profile README; next audit ✅ | not started |
| **R-SPEC-003** traceability discipline | S1, S2, S3 | Spec entry in specs/README; this file kept current; ops/run-ledger.md per pass | in progress (Pass A ledger added) |

## Update protocol

When a task ships:

1. Set its checkbox in `tasks.md` to `[x]`.
2. Note the commit SHA in `ops/run-ledger.md`.
3. Update the Status column above to one of: not started · in progress · done.
4. When all tasks for a requirement are done, mark the requirement done.
5. When all requirements are done, the pass is ready for the acceptance run.

## Status snapshot

```
Pass A — hero               done
Pass C — TS formula         not started
Pass B — arc + steps        not started
Pass D — deploy             not started
Spec discipline             in progress (Pass A ledger added)
```
