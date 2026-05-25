---
id: DEC-SDK-003-module-demo-before-app-integration
spec: specs/0014-mechanism-design-sdk/
requirement: R-SDK-003
date: 2026-05-25
status: approved
reversible: true
decision: |
  The SDK demo is a Python module command,
  `python -m procurement_mechanism_sdk.demo`, with a matching project
  script entry. It prints deterministic JSON and does not start the web
  app, Streamlit compatibility entrypoint, or mobile runtime.
alternatives:
  - label: Add a new web demo surface
    rejected_because: |
      The request is library extraction, not a new simulator route. A web
      surface would expand the blast radius and require browser QA for a
      packaging move.
  - label: Put the demo only in README snippets
    rejected_because: |
      Snippets can drift. A module command gives tests an executable proof
      that the SDK runs outside the app.
  - label: Require installed console scripts only
    rejected_because: |
      `python -m` works from a source checkout and is simpler for local
      verification before packaging or install steps.
rationale: |
  A module demo is the smallest app-less proof of reuse. It exercises the
  same public API a notebook or script would use and produces machine-readable
  output that tests can validate.
evidence:
  - kind: spec
    ref: specs/0014-mechanism-design-sdk/requirements.md
  - kind: doc
    ref: src/procurement_mechanism_sdk/demo.py
  - kind: doc
    ref: docs/mechanism-sdk.md
  - kind: doc
    ref: tests/test_mechanism_sdk.py
rollback: |
  Delete `src/procurement_mechanism_sdk/demo.py`, remove the project script
  entry from `pyproject.toml`, and keep the importable SDK API for direct
  library consumers.
owner: engineering
---

## decision

The SDK demo is a Python module command,
`python -m procurement_mechanism_sdk.demo`, with a matching project script
entry. It prints deterministic JSON and does not start the web app, Streamlit
compatibility entrypoint, or mobile runtime.

## alternatives

- Add a new web demo surface - rejected because this is library extraction,
  not a new simulator route.
- Put the demo only in README snippets - rejected because snippets can drift.
- Require installed console scripts only - rejected because `python -m` works
  from a source checkout.

## rationale

A module demo is the smallest app-less proof of reuse. It exercises the same
public API a notebook or script would use and produces machine-readable output
that tests can validate.

## evidence

- `specs/0014-mechanism-design-sdk/requirements.md` - R-SDK-003 demo and docs.
- `src/procurement_mechanism_sdk/demo.py` - module command implementation.
- `docs/mechanism-sdk.md` - app-less usage documentation.
- `tests/test_mechanism_sdk.py` - subprocess proof for the module demo.

## rollback

Delete `src/procurement_mechanism_sdk/demo.py`, remove the project script
entry from `pyproject.toml`, and keep the importable SDK API for direct library
consumers.
