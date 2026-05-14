# traceability: factory dev control plane

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-FACTORY-001** MCP-compatible factory surface | A1, A2, A3 | initialize, tools/list, status, spec expansion, no shell tool | done |
| **R-FACTORY-002** spec-to-task expansion | B1, B2, B3 | `--expand-spec`, generated YAML loads, gates/review/checkpoints present | done |
| **R-FACTORY-003** bounded dual review | C1, C2, C4 | `review.reviewers`, one review event per reviewer, conservative aggregation | done |
| **R-FACTORY-004** real CLI metadata parsing | C3, C4 | JSON and JSONL metadata parser tests | done |
| **R-FACTORY-005** parallel task routing | D1, D2, D3, D4 | `--run-many`, fallback routing, optional factory extra | done |
| **R-SPEC-009** spec discipline | S1, S2, S3 | registered spec, spec_check, run ledger | done |

## Status snapshot

```
Pass A - MCP surface          done
Pass B - spec expansion       done
Pass C - dual review/metadata done
Pass D - routing              done
Spec discipline               done
```
