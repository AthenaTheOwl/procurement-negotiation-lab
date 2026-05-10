# specs

This repo uses a lightweight spec-driven loop. The spec is not decorative; it is
the source of truth for what the demo must teach, what the app must render, and
which proof gates have to pass before a checkpoint is called done.

Current active specs:

- `0001-polished-simulator/requirements.md`
- `0001-polished-simulator/design.md`
- `0001-polished-simulator/tasks.md`
- `0001-polished-simulator/acceptance.md`
- `0001-polished-simulator/research.md`
- `0001-polished-simulator/traceability.md`
- `0002-lab-authoring-workbench/requirements.md`
- `0002-lab-authoring-workbench/design.md`
- `0002-lab-authoring-workbench/tasks.md`
- `0002-lab-authoring-workbench/acceptance.md`
- `0002-lab-authoring-workbench/research.md`
- `0002-lab-authoring-workbench/traceability.md`
- `0003-bergemann-arc/requirements.md`
- `0003-bergemann-arc/design.md`
- `0003-bergemann-arc/tasks.md`
- `0003-bergemann-arc/acceptance.md`
- `0003-bergemann-arc/research.md`
- `0003-bergemann-arc/traceability.md`
- `0004-operational-mechanism-refinements/requirements.md`
- `0004-operational-mechanism-refinements/design.md`
- `0004-operational-mechanism-refinements/tasks.md`
- `0004-operational-mechanism-refinements/acceptance.md`
- `0004-operational-mechanism-refinements/research.md`
- `0004-operational-mechanism-refinements/traceability.md`

The development loop is:

1. Write or update requirements in testable language.
2. Update the design so each requirement has a named surface or module.
3. Implement only tasks traceable to the current spec.
4. Run proof gates: Python engine tests, frontend tests, type checks, and browser QA.
5. Update traceability and docs before committing.

If a requested change does not fit the active spec, update the spec first.
