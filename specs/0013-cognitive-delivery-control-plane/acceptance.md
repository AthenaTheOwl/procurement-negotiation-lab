# acceptance: cognitive-delivery-control-plane

## Gates

- `python scripts/spec_check.py` exits 0 with 13 active specs
  (`0001-polished-simulator` through `0013-cognitive-delivery-control-plane`).
- `python scripts/voice_lint.py` exits 0 across the repo.
- `python scripts/validate_decisions.py` exits 0 with the single DEC
  file `DEC-CDCP-001-install-cdcp-governance.md` validated.
- `python scripts/validate_roles.py` exits 0 with the six role files
  validated.
- `python scripts/validate_tools.py` exits 0 with the tool registry
  validated.
- `python scripts/validate_policies.py` exits 0 with the six policy
  files validated.
- `python -m uv run pytest` exits 0.
- `python -m uv run ruff check .` exits 0.
- `python -m uv run mypy src` exits 0.
- `npm.cmd run build` exits 0.
- `npm.cmd run test` exits 0.
- `npm.cmd run test --workspace=@lab/mobile -- --runInBand` exits 0.
- `npm.cmd run typecheck --workspace=@lab/mobile` exits 0.
- Browser QA: PLAY, LAB, and TUTORIAL render cleanly in a real browser
  before a checkpoint is called done.

## Done means

Spec 0013 is done when:

1. The CDCP scaffold (specs/0013, decisions/, dreams/, .agents/,
   ops/RELEASE_LEDGER.md, ops/RESET_LEDGER.md, ops/event-log/,
   ops/schemas-cache/, scripts/validate_*.py) lands as files under
   `e:\claude_code\random-apps\procurement-negotiation-lab`.
2. The four validator scripts walk their record sets and exit 0.
3. `scripts/spec_check.py` walks every R-* across 13 specs and
   confirms every one is either covered by a DEC, allowlisted in
   `decisions/.spec-check-allowlist.yaml`, or covered by the bootstrap
   exemption for R-CDCP-*.
4. The `.github/workflows/tests.yml` workflow adds the four new
   validator steps.
5. The root `README.md` carries a Governance section linking the
   governance artifacts and the athena-site charter.

## Explicit non-acceptance

- No backfill DECs for the 91 prior R-* IDs in this pass; the
  allowlist defers them and later passes land them cluster by cluster.
- No first dream output; the README documents the format and the gate
  for that artifact lands when the first weekly dream output lands.
- No new top-level npm or pip dependencies; the validators reuse the
  existing pyyaml and jsonschema installs.
- No changes to existing ops/ subdirectories (factory-artifacts/,
  factory-tasks/, factory.db, proof_gates.json, qa-evidence/, releases/,
  run-ledger.md). The factory subsystem keeps its working shape.
- No additional roles past the six baseline; `.agents/CATALOG.md` lists
  the 44 deferred roles.
