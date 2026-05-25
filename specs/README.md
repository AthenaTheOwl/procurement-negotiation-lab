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
- `0005-multi-party-portal/requirements.md`
- `0005-multi-party-portal/design.md`
- `0005-multi-party-portal/tasks.md`
- `0005-multi-party-portal/acceptance.md`
- `0005-multi-party-portal/research.md`
- `0005-multi-party-portal/traceability.md`
- `0006-run-reports-replay/requirements.md`
- `0006-run-reports-replay/design.md`
- `0006-run-reports-replay/tasks.md`
- `0006-run-reports-replay/acceptance.md`
- `0006-run-reports-replay/research.md`
- `0006-run-reports-replay/traceability.md`
- `0007-production-hardening/requirements.md`
- `0007-production-hardening/design.md`
- `0007-production-hardening/tasks.md`
- `0007-production-hardening/acceptance.md`
- `0007-production-hardening/research.md`
- `0007-production-hardening/traceability.md`
- `0008-data-bridges/requirements.md`
- `0008-data-bridges/design.md`
- `0008-data-bridges/tasks.md`
- `0008-data-bridges/acceptance.md`
- `0008-data-bridges/research.md`
- `0008-data-bridges/traceability.md`
- `0009-factory-dev-control-plane/requirements.md`
- `0009-factory-dev-control-plane/design.md`
- `0009-factory-dev-control-plane/tasks.md`
- `0009-factory-dev-control-plane/acceptance.md`
- `0009-factory-dev-control-plane/research.md`
- `0009-factory-dev-control-plane/traceability.md`
- `0010-pedagogical-redesign/PLAN.md`
- `0010-pedagogical-redesign/requirements.md`
- `0010-pedagogical-redesign/design.md`
- `0010-pedagogical-redesign/tasks.md`
- `0010-pedagogical-redesign/acceptance.md`
- `0010-pedagogical-redesign/research.md`
- `0010-pedagogical-redesign/traceability.md`
- `0010-pedagogical-redesign/character-system.md`
- `0010-pedagogical-redesign/tokens.css`
- `0010-pedagogical-redesign/levels/01.md` … `levels/08.md`

- `0011-coordination-sandbox-governance/requirements.md`
- `0011-coordination-sandbox-governance/design.md`
- `0011-coordination-sandbox-governance/tasks.md`
- `0011-coordination-sandbox-governance/acceptance.md`
- `0011-coordination-sandbox-governance/research.md`
- `0011-coordination-sandbox-governance/traceability.md`

- `0012-mobile-release-and-agentic-sdlc/requirements.md`
- `0012-mobile-release-and-agentic-sdlc/design.md`
- `0012-mobile-release-and-agentic-sdlc/tasks.md`
- `0012-mobile-release-and-agentic-sdlc/acceptance.md`
- `0012-mobile-release-and-agentic-sdlc/research.md`
- `0012-mobile-release-and-agentic-sdlc/traceability.md`

- `0013-cognitive-delivery-control-plane/requirements.md`
- `0013-cognitive-delivery-control-plane/design.md`
- `0013-cognitive-delivery-control-plane/tasks.md`
- `0013-cognitive-delivery-control-plane/acceptance.md`
- `0013-cognitive-delivery-control-plane/research.md`
- `0013-cognitive-delivery-control-plane/traceability.md`

- `0014-mechanism-design-sdk/requirements.md`
- `0014-mechanism-design-sdk/design.md`
- `0014-mechanism-design-sdk/tasks.md`
- `0014-mechanism-design-sdk/acceptance.md`
- `0014-mechanism-design-sdk/research.md`
- `0014-mechanism-design-sdk/traceability.md`

The development loop is:

1. Write or update requirements in testable language.
2. Update the design so each requirement has a named surface or module.
3. Implement only tasks traceable to the current spec.
4. Run proof gates: Python engine tests, frontend tests, type checks, and browser QA.
5. Update traceability and docs before committing.

If a requested change does not fit the active spec, update the spec first.
