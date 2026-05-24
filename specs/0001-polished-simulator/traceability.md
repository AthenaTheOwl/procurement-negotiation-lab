# traceability

| Requirement | Decision | Implementation | Tests |
|---|---|---|---|
| R-PLAY-001 | [DEC-PLAY-001](../../decisions/DEC-PLAY-001-six-canonical-roles-fixed-set.md) | `apps/web/src/primitives/AgentFigure.tsx`, `apps/web/src/surfaces/learn/Level01.tsx` | `apps/web/src/primitives/AgentFigure.test.tsx`, `apps/web/src/surfaces/learn/Level01.test.tsx` |
| R-PLAY-002 | [DEC-PLAY-002](../../decisions/DEC-PLAY-002-one-decision-per-round-design.md) | `apps/web/src/primitives/LevelShell.tsx`, `apps/web/src/surfaces/learn/Level0*.tsx` | `apps/web/src/primitives/LevelShell.test.tsx` |
| R-PLAY-003 | [DEC-PLAY-003](../../decisions/DEC-PLAY-003-consequence-before-math.md) | `apps/web/src/primitives/LevelShell.tsx`, `apps/web/src/primitives/PredictReveal.tsx` | `apps/web/src/primitives/PredictReveal.test.tsx` |
| R-PLAY-004 | [DEC-PLAY-004](../../decisions/DEC-PLAY-004-teach-terms-in-context.md) | `packages/engine/src/data/glossary.ts`, `apps/web/src/surfaces/sandbox/SandboxApp.tsx` | `apps/web/src/App.test.tsx` |
| R-LAB-001 | (allowlisted) | `apps/web/src/App.tsx` | `apps/web/src/App.test.tsx` |
| R-LAB-002 | (allowlisted) | `packages/engine/src/model/simulation.ts`, `apps/web/src/App.tsx` | engine `simulation.test.ts` |
| R-LAB-003 | (allowlisted) | `packages/engine/src/model/simulation.ts`, `apps/web/src/App.tsx` | engine `simulation.test.ts` |
| R-LAB-004 | (allowlisted) | `packages/engine/src/model/simulation.ts`, `apps/web/src/App.tsx` | engine `simulation.test.ts` |
| R-STUDY-001 | [DEC-STUDY-001](../../decisions/DEC-STUDY-001-tutorial-as-plain-english-companion.md) | `apps/web/src/surfaces/sandbox/SandboxApp.tsx`, `docs/tutorial.md`, `packages/engine/src/data/glossary.ts` | `apps/web/src/surfaces/sandbox/SandboxApp.test.tsx` |
| R-SPEC-001 | (allowlisted) | `scripts/spec_check.py`, `specs/0001-polished-simulator/*` | `tests/test_spec_contract.py` |
