# tasks: factory dev control plane

## Pass A - MCP surface

- [x] **A1**: Add `scripts/factory/mcp_server.py`. *(R-FACTORY-001)*
- [x] **A2**: Expose status, show, expand-spec, and dry-run route tools.
  *(R-FACTORY-001)*
- [x] **A3**: Add MCP server tests. *(R-FACTORY-001)*

## Pass B - spec task expansion

- [x] **B1**: Add `scripts/factory/spec_tasks.py`. *(R-FACTORY-002)*
- [x] **B2**: Wire `--expand-spec` into the CLI. *(R-FACTORY-002)*
- [x] **B3**: Add expansion tests. *(R-FACTORY-002)*

## Pass C - dual review and metadata

- [x] **C1**: Add `review.reviewers` task YAML support. *(R-FACTORY-003)*
- [x] **C2**: Run bounded multi-review in the pipeline. *(R-FACTORY-003)*
- [x] **C3**: Add JSON/JSONL CLI metadata parsing. *(R-FACTORY-004)*
- [x] **C4**: Add tests for dual review and metadata parsing. *(R-FACTORY-003, R-FACTORY-004)*

## Pass D - routing

- [x] **D1**: Add `scripts/factory/router.py`. *(R-FACTORY-005)*
- [x] **D2**: Wire `--run-many` into the CLI. *(R-FACTORY-005)*
- [x] **D3**: Add optional `factory` dependencies for LangGraph and MCP SDK.
  *(R-FACTORY-005)*
- [x] **D4**: Add fallback routing tests. *(R-FACTORY-005)*

## Spec discipline

- [x] **S1**: Register the spec in `specs/README.md`. *(R-SPEC-009)*
- [x] **S2**: Add this spec to `scripts/spec_check.py`. *(R-SPEC-009)*
- [x] **S3**: Update traceability and run ledger. *(R-SPEC-009)*
