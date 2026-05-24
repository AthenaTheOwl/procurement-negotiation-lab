# tasks: cognitive-delivery-control-plane

## Spec ledger

- [x] `specs/0013-cognitive-delivery-control-plane/requirements.md`
  with R-CDCP-001..010.
- [x] `specs/0013-cognitive-delivery-control-plane/design.md`.
- [x] `specs/0013-cognitive-delivery-control-plane/tasks.md` (this file).
- [x] `specs/0013-cognitive-delivery-control-plane/acceptance.md`.
- [x] `specs/0013-cognitive-delivery-control-plane/research.md`.
- [x] `specs/0013-cognitive-delivery-control-plane/traceability.md`.
- [x] `specs/README.md` lists the new spec folder.

## Decisions directory

- [x] `decisions/README.md` documents the format and the add-a-decision
  flow.
- [x] `decisions/DEC-CDCP-001-install-cdcp-governance.md`.
- [x] `decisions/.spec-check-allowlist.yaml` lists every R-* defined
  in specs 0001-0012 (91 IDs) under `deferred:` with a one-line note
  each.

## Agent contract and skills

- [x] `.agents/AGENTS.md` with coding style, domain decisions, workflow
  conventions, and cross-repo links.
- [x] `.agents/skills/run-factory-task/SKILL.md` v0.1.0 graduating the
  existing `scripts/factory/` pattern.

## Operating-model records

- [x] `.agents/roles/control.coordinator/` (role.yaml, instructions.md,
  tools.yaml, output.schema.json, gates.yaml).
- [x] `.agents/roles/product.spec-writer/`.
- [x] `.agents/roles/engineering.implementation/`.
- [x] `.agents/roles/engineering.code-reviewer/`.
- [x] `.agents/roles/science.proof-gate-runner/`.
- [x] `.agents/roles/learning.dream-orchestrator/`.
- [x] `.agents/tools.yaml` central tool registry.
- [x] `.agents/policies/agent-tool-permissions-default-deny.yaml`.
- [x] `.agents/policies/voice-lint-blocks-publish.yaml`.
- [x] `.agents/policies/dream-candidates-require-human.yaml`.
- [x] `.agents/policies/spec-check-blocks-merge.yaml`.
- [x] `.agents/policies/factory-run-emits-events.yaml`.
- [x] `.agents/policies/mobile-e2e-requires-emulator.yaml`.
- [x] `.agents/state-machines/spec-lifecycle.yaml`.
- [x] `.agents/state-machines/run-lifecycle.yaml`.
- [x] `.agents/state-machines/release-lifecycle.yaml`.
- [x] `.agents/workflows/single-change.yaml`.
- [x] `.agents/workflows/weekly-dream.yaml`.
- [x] `.agents/workflows/incident-response.yaml`.
- [x] `.agents/workflows/mobile-release.yaml`.
- [x] `.agents/CATALOG.md` lists the 44 roles not yet installed.

## Dreams

- [x] `dreams/README.md` documents the eight dream modes and the
  human-gate rule.

## Ops ledgers

- [x] `ops/RELEASE_LEDGER.md` with backfilled entries for the 20 most
  recent commits through `646d989`.
- [x] `ops/RESET_LEDGER.md` with the documented format and "No resets
  recorded." entry.
- [x] `ops/event-log/2026-05-24.jsonl` seeded with `cdcp.installed`
  and `spec.created` events for spec 0013.

## Scripts

- [x] `scripts/validate_decisions.py` with the network + cache schema
  load and per-DEC validation.
- [x] `scripts/validate_roles.py` with the network + cache schema load
  and per-role validation.
- [x] `scripts/validate_tools.py` with the network + cache schema load
  and per-tool validation.
- [x] `scripts/validate_policies.py` with the network + cache schema
  load and per-policy validation.
- [x] `scripts/spec_check.py` extension that walks R-* IDs against
  DEC references with the allowlist exception and adds `CDCP` to the
  allowed prefix set.
- [x] `ops/schemas-cache/decision.schema.json` cached copy.
- [x] `ops/schemas-cache/role.schema.json` cached copy.
- [x] `ops/schemas-cache/tool.schema.json` cached copy.
- [x] `ops/schemas-cache/policy.schema.json` cached copy.

## CI workflow

- [x] `.github/workflows/tests.yml` adds `validate_decisions`,
  `validate_roles`, `validate_tools`, and `validate_policies` as steps
  alongside `spec_check` and `voice_lint`.

## Repo root

- [x] `README.md` carries a Governance section pointing at specs,
  decisions, dreams, agents, ledgers, and the athena-site charter.

## Verification

- [x] `python scripts/spec_check.py` exits 0 with 13 active specs.
- [x] `python scripts/voice_lint.py` exits 0 across the repo.
- [x] `python scripts/validate_decisions.py` exits 0 with 1 DEC file
  validated.
- [x] `python scripts/validate_roles.py` exits 0 with 6 role files
  validated.
- [x] `python scripts/validate_tools.py` exits 0 with the tool registry
  validated.
- [x] `python scripts/validate_policies.py` exits 0 with 6 policy files
  validated.
- [x] `npm run verify:js` runs the JS suite green.
