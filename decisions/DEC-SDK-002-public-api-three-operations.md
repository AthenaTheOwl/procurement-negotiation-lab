---
id: DEC-SDK-002-public-api-three-operations
spec: specs/0014-mechanism-design-sdk/
requirement: R-SDK-002
date: 2026-05-25
status: approved
reversible: true
decision: |
  The SDK public API is limited to three operation groups: scenario
  construction, mechanism solving or comparison, and participation
  reporting. Existing engine Pydantic models remain the primary return
  objects, with thin dataclasses only for SDK aggregate reports.
alternatives:
  - label: Export every procurement_lab module directly
    rejected_because: |
      Re-exporting everything would make incidental internals look stable
      and would defeat the purpose of defining a small SDK surface.
  - label: Return only JSON dictionaries
    rejected_because: |
      Dictionary-only returns would discard the existing engine schemas and
      make tests less able to prove parity with deterministic primitives.
  - label: Start with a single demo helper
    rejected_because: |
      One helper would be demonstrable but not useful as a library surface.
      The SDK needs explicit scenario, solve/compare, and report entrypoints.
rationale: |
  The three operation groups match the smallest reusable workflow:
  build a scenario, run mechanisms, and inspect no-worse-off or oracle-gap
  outcomes. Keeping return types close to the engine schemas avoids a
  parallel model layer.
evidence:
  - kind: spec
    ref: specs/0014-mechanism-design-sdk/requirements.md
  - kind: doc
    ref: src/procurement_mechanism_sdk/api.py
  - kind: doc
    ref: tests/test_mechanism_sdk.py
rollback: |
  Remove the SDK aggregate dataclasses and public exports from
  `src/procurement_mechanism_sdk/__init__.py`, leaving only direct
  `procurement_lab` imports for callers that still need them.
owner: engineering
---

## decision

The SDK public API is limited to three operation groups: scenario
construction, mechanism solving or comparison, and participation reporting.
Existing engine Pydantic models remain the primary return objects, with thin
dataclasses only for SDK aggregate reports.

## alternatives

- Export every `procurement_lab` module directly - rejected because it would
  make incidental internals look stable.
- Return only JSON dictionaries - rejected because it would discard existing
  engine schemas.
- Start with a single demo helper - rejected because it would not be useful
  as a library surface.

## rationale

The three operation groups match the smallest reusable workflow: build a
scenario, run mechanisms, and inspect no-worse-off or oracle-gap outcomes.
Keeping return types close to the engine schemas avoids a parallel model layer.

## evidence

- `specs/0014-mechanism-design-sdk/requirements.md` - R-SDK-002 public API.
- `src/procurement_mechanism_sdk/api.py` - exported operation groups.
- `tests/test_mechanism_sdk.py` - API stability and parity checks.

## rollback

Remove the SDK aggregate dataclasses and public exports from
`src/procurement_mechanism_sdk/__init__.py`, leaving only direct
`procurement_lab` imports for callers that still need them.
