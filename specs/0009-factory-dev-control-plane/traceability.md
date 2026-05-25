# traceability: factory dev control plane

| Requirement | Tasks | Acceptance checks | Decision | Status |
|---|---|---|---|---|
| **R-FACTORY-001** MCP-compatible factory surface (owner_role: engineering.implementation) | A1, A2, A3 | initialize, tools/list, status, spec expansion, no shell tool | [DEC-FACTORY-001](../../decisions/DEC-FACTORY-001-narrow-mcp-stdio-no-shell-tool.md) | done |
| **R-FACTORY-002** spec-to-task expansion (owner_role: engineering.implementation) | B1, B2, B3 | `--expand-spec`, generated YAML loads, gates/review/checkpoints present | [DEC-FACTORY-002](../../decisions/DEC-FACTORY-002-spec-tasks-expanded-into-review-gated-yaml.md) | done |
| **R-FACTORY-003** bounded dual review (owner_role: engineering.code-reviewer) | C1, C2, C4 | `review.reviewers`, one review event per reviewer, conservative aggregation | [DEC-FACTORY-003](../../decisions/DEC-FACTORY-003-bounded-dual-review-conservative-aggregation.md) | done |
| **R-FACTORY-004** real CLI metadata parsing (owner_role: engineering.implementation) | C3, C4 | JSON and JSONL metadata parser tests | [DEC-FACTORY-004](../../decisions/DEC-FACTORY-004-real-cli-ids-win-tagged-synthetic-fallback.md) | done |
| **R-FACTORY-005** parallel task routing (owner_role: control.coordinator) | D1, D2, D3, D4 | `--run-many`, fallback routing, optional factory extra | [DEC-FACTORY-005](../../decisions/DEC-FACTORY-005-optional-langgraph-router-threadpool-fallback.md) | done |
| **R-FACTORY-006** static factory console (owner_role: control.coordinator) | E1, E2, E3, E4 | `#/factory`, static replay fixture, SDK `RunReport`, normalization + UI tests | [DEC-FACTORY-006](../../decisions/DEC-FACTORY-006-static-replay-console-evidence.md) | done |
| **R-SPEC-009** spec discipline (owner_role: product.spec-writer) | S1, S2, S3 | registered spec, spec_check, run ledger | (allowlisted) | done |

## Status snapshot

```
Pass A - MCP surface          done
Pass B - spec expansion       done
Pass C - dual review/metadata done
Pass D - routing              done
Pass E - factory console      done
Spec discipline               done
```
