# traceability: pedagogical redesign + mobile

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-LEARN-001** 8-level guided journey | A2, C3, C4, D2, E2, F1 | Web levels 1-11 reachable; mobile levels 1-11 reachable after spec 0011 mobile coverage fix | done |
| **R-LEARN-002** gated progression | F3, F4, H2 | Locked routes, reset link, reload persistence | done |
| **R-LEARN-003** visual-first primitives | A3, C1, C2, D1, E1, G3, H3 | Levels use visual/interactive primitives and component tests | done |
| **R-LEARN-004** predict-then-reveal | A2, D1, D2, E2, I1 | Reveal interactions covered across learning levels | done |
| **R-LEARN-005** round-friendly character system | A3, C1, G3 | Role/mood figure system present; Lottie clip wiring remains outside verified gates | partial |
| **R-LEARN-006** generic story scaffolding | A2 | Learn surface uses role framing; voice_lint clean | done |
| **R-LEARN-007** Sandbox one click from home | C4, F2, F5 | Sandbox link appears on home/levels and routes to Sandbox | done |
| **R-MOBILE-001** native iOS + Android apps | G1, G2, G4, G5, G6, H1 | Expo project, app.json/eas.json, mobile levels, Jest/typecheck; native simulator/EAS artifacts not verified on Windows | partial |
| **R-MOBILE-002** cross-platform engine | B2, B4, G2 | `@lab/engine` shared by web and mobile | done |
| **R-MONO-001** monorepo restructure preserves behavior | B1, B3, B5, B6, J1 | npm workspaces, Vercel build, pytest, vitest, smoke | done |
| **R-SPEC-010** spec discipline | A1, A4, A5, S1, S2, S3 | Spec ledger and proof gates pass; strengthened by spec 0011 dynamic spec/workflow checks | done |

## Update protocol

Same as prior specs:

1. Set checkbox in `tasks.md` to `[x]`.
2. Note commit SHA in `ops/run-ledger.md` when using the factory.
3. Update the Status column above.
4. When all tasks for a requirement are done, mark the requirement done.
5. When all requirements are done, run the acceptance gates.

## Status snapshot

```text
Phase 0 - storyboards + tokens + character spec   done
Phase 1 - monorepo restructure                    done
Phase 2 - visual primitives + Level 1             done
Phase 3 - Levels 2-4                              done
Phase 4 - Levels 5-7                              done
Phase 5 - Level 8 + Sandbox + progress            done
Phase 6 - mobile scaffold                         done
Phase 7 - mobile Levels 2-8                       done
Phase 8 - polish                                  done
Phase 9 - deploy                                  done
Spec discipline                                   done; strengthened by spec 0011
```

## Cross-spec dependencies

- **Depends on spec 0001**: Sandbox preserves the lab visual identity.
- **Depends on spec 0004**: alpha / epsilon / decoys surface in levels 4-7.
- **Depends on spec 0005**: multi-party + Shapley split surfaced in level 6.
- **Depends on spec 0006**: run reports preserved in Sandbox + level 8 handoff.
- **Depends on spec 0008**: cytoscape `SourceGraph` reused in level 6.
- **Composes with spec 0009**: factory dev control plane unaffected.
- **Composes with spec 0011**: sandbox extensions and stricter guardrails.
