# traceability

| Requirement | Decision | Implementation | Tests |
|---|---|---|---|
| R-LAB-005 | [DEC-LAB-005](../../decisions/DEC-LAB-005-visible-so-what-before-controls.md) | `web/src/App.tsx`, `web/src/model/simulation.ts` | `web/src/App.test.tsx`, `web/src/model/simulation.test.ts` |
| R-LAB-006 | [DEC-LAB-006](../../decisions/DEC-LAB-006-canonical-scenario-presets-plus-editable-knobs.md) | `web/src/data/scenarios.ts`, `web/src/App.tsx`, `web/src/model/types.ts` | `web/src/App.test.tsx` |
| R-LAB-007 | [DEC-LAB-007](../../decisions/DEC-LAB-007-canonical-agent-archetypes-with-behavior-knobs.md) | `web/src/data/agents.ts`, `web/src/App.tsx`, `web/src/model/types.ts` | `web/src/App.test.tsx` |
| R-LAB-008 | [DEC-LAB-008](../../decisions/DEC-LAB-008-mechanism-comparison-without-crowning-admm.md) | `web/src/model/simulation.ts`, `web/src/App.tsx` | `web/src/model/simulation.test.ts` |
| R-LAB-009 | [DEC-LAB-009](../../decisions/DEC-LAB-009-information-vs-privacy-on-the-same-instance.md) | `web/src/model/simulation.ts`, `web/src/App.tsx` | `web/src/model/simulation.test.ts` |
| R-SPEC-002 | (allowlisted, backfill pending) | `scripts/spec_check.py`, `specs/0002-lab-authoring-workbench/*` | `tests/test_spec_contract.py` |
