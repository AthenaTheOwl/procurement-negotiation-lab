---
id: DEC-SDK-001-library-boundary-wraps-engine-before-code-move
spec: specs/0014-mechanism-design-sdk/
requirement: R-SDK-001
date: 2026-05-25
status: approved
reversible: true
decision: |
  The mechanism-design SDK is a new Python package,
  `procurement_mechanism_sdk`, that wraps the existing deterministic
  `procurement_lab` engine before any code move. The deployed
  TypeScript simulator, web levels, mobile screens, and factory subsystem
  remain in place.
alternatives:
  - label: Move deterministic code into a renamed core package
    rejected_because: |
      Renaming or moving the existing package would create import churn
      across app compatibility code, tests, docs, and deployment paths for
      a packaging-only change.
  - label: Extract an npm workspace package first
    rejected_because: |
      The strongest deterministic ADMM, oracle, CBT, schema, and utility
      primitives are already in the Python package. The TypeScript engine
      is the deployed app engine and should not be disturbed for this SDK
      pass.
  - label: Copy engine code into the SDK
    rejected_because: |
      Copying would immediately create two mechanism implementations to
      keep in sync. The SDK should prove the boundary before any future
      extraction.
rationale: |
  A wrapper package gives library users a stable import surface while
  preserving the simulator's existing architecture. It also keeps tests
  anchored to the current deterministic engine, so SDK behavior cannot
  drift from the lab logic it exposes.
evidence:
  - kind: spec
    ref: specs/0014-mechanism-design-sdk/requirements.md
  - kind: doc
    ref: src/procurement_lab/algorithms/admm.py
  - kind: doc
    ref: src/procurement_lab/algorithms/oracle.py
  - kind: doc
    ref: src/procurement_lab/engine/cbt.py
  - kind: doc
    ref: packages/engine/src/index.ts
rollback: |
  Remove `src/procurement_mechanism_sdk`, delete the SDK tests and docs,
  and remove the added package/script entries from `pyproject.toml`.
  The existing `procurement_lab` engine and deployed app paths remain
  untouched.
owner: engineering
---

## decision

The mechanism-design SDK is a new Python package,
`procurement_mechanism_sdk`, that wraps the existing deterministic
`procurement_lab` engine before any code move. The deployed TypeScript
simulator, web levels, mobile screens, and factory subsystem remain in
place.

## alternatives

- Move deterministic code into a renamed core package - rejected because
  package renames would create import churn for a packaging-only change.
- Extract an npm workspace package first - rejected because the Python
  package already owns the deterministic ADMM, oracle, CBT, schema, and
  utility primitives.
- Copy engine code into the SDK - rejected because it would create two
  mechanism implementations to keep in sync.

## rationale

A wrapper package gives library users a stable import surface while
preserving the simulator's existing architecture. It also keeps tests
anchored to the current deterministic engine, so SDK behavior cannot drift
from the lab logic it exposes.

## evidence

- `specs/0014-mechanism-design-sdk/requirements.md` - R-SDK-001 package
  boundary.
- `src/procurement_lab/algorithms/admm.py` - existing deterministic ADMM.
- `src/procurement_lab/algorithms/oracle.py` - existing centralized oracle.
- `src/procurement_lab/engine/cbt.py` - existing cost-benefit transfer.
- `packages/engine/src/index.ts` - deployed app engine boundary left intact.

## rollback

Remove `src/procurement_mechanism_sdk`, delete the SDK tests and docs, and
remove the added package/script entries from `pyproject.toml`. The existing
`procurement_lab` engine and deployed app paths remain untouched.
