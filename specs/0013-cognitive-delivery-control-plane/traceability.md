# traceability: cognitive-delivery-control-plane

| Requirement | Design surface | Planned proof |
|---|---|---|
| R-CDCP-001 (owner_role: science.proof-gate-runner) | `scripts/spec_check.py` extension + `decisions/.spec-check-allowlist.yaml` | `python scripts/spec_check.py` walks every R-* across 13 specs and confirms one DEC reference or allowlist entry per ID |
| R-CDCP-002 (owner_role: science.proof-gate-runner) | `scripts/validate_decisions.py` + `ops/schemas-cache/decision.schema.json` | `python scripts/validate_decisions.py` validates each DEC file against the cross-repo schema |
| R-CDCP-003 (owner_role: learning.dream-orchestrator) | `dreams/README.md` + future `dreams/<week>/output.json` | first dream output lands with a `validate_dreams.py` gate in a later pass; this requirement reserves the contract |
| R-CDCP-004 (owner_role: operations.release-manager) | `ops/RELEASE_LEDGER.md` with the 20-commit backfill | manual review during commit; future automation may parse the ledger |
| R-CDCP-005 (owner_role: operations.release-manager) | `ops/RESET_LEDGER.md` with documented format header | reset entries land in the same push that performs the rewrite |
| R-CDCP-006 (owner_role: control.coordinator) | `.agents/AGENTS.md` with the four documented sections | agents read the file first; cross-repo charter names the rule |
| R-CDCP-007 (owner_role: learning.dream-orchestrator) | `.agents/skills/run-factory-task/SKILL.md` v0.1.0 | front-matter parses against `skill.schema.json`; future `validate_skills.py` lands when the second skill graduates |
| R-CDCP-008 (owner_role: science.proof-gate-runner) | `.github/workflows/tests.yml` adds the four new validators alongside `spec_check` and `voice_lint` | a failed gate fails the CI run on PR |
| R-CDCP-009 (owner_role: learning.dream-orchestrator) | `dreams/README.md` documents the human-gate rule + cross-repo schema default | dream outputs land with `human_review_required: true`; agent contract repeats the rule |
| R-CDCP-010 (owner_role: science.proof-gate-runner) | `scripts/validate_decisions.py`, `scripts/validate_roles.py`, `scripts/validate_tools.py`, `scripts/validate_policies.py` network-fetch paths + `ops/schemas-cache/` | schema bodies live in athena-site; this repo holds only cache copies |
