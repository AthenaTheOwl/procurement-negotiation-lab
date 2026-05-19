# traceability: pedagogical redesign + mobile

| Requirement | Tasks | Acceptance checks | Status |
|---|---|---|---|
| **R-LEARN-001** 8-level guided journey | A2, C3, C4, D2, E2, F1 | Pass C/D/E/F: levels reachable; one concept per screen; 15-20 min completion | not started |
| **R-LEARN-002** gated progression | F3, F4, H2 | Pass F: locked routes; reset link; reload preserves state | not started |
| **R-LEARN-003** visual-first primitives | A3, C1, C2, D1, E1, G3, H3 | Pass C/D/E/G: every level has a visual primitive; no >2-sentence paragraph in interaction area | not started |
| **R-LEARN-004** predict-then-reveal | A2, D1, D2, E2, I1 | Pass D/E: at least 5 levels include the pattern; reveal shows correctness | not started |
| **R-LEARN-005** round-friendly character system | A3, C1, G3 | Pass C/G: 6 roles × 4 moods on web + mobile; 4 Lottie motion clips wired | not started |
| **R-LEARN-006** generic story scaffolding | A2 | Pass A: voice_lint and grep find zero Cinder/Northstar/substrate-crunch strings in learn surface | not started |
| **R-LEARN-007** Sandbox one click from home | C4, F2, F5 | Pass C/F: Sandbox link on every screen; routes to today's Lab Arena | not started |
| **R-MOBILE-001** native iOS + Android apps | G1, G2, G4, G5, G6, H1 | Pass G/H/J: expo project boots; all 8 levels reachable; EAS Build produces .apk + .ipa | not started |
| **R-MOBILE-002** cross-platform engine | B2, B4, G2 | Pass B/G: `@lab/engine` shared; one bug fix benefits both apps | not started |
| **R-MONO-001** monorepo restructure preserves behavior | B1, B3, B5, B6, J1 | Pass B/J: vitest 160/160 + pytest 92 unchanged; Vercel preview clean | not started |
| **R-SPEC-010** spec discipline | A1, A4, A5, S1, S2, S3 | All phase gate sweeps pass; spec_check enforces R-* IDs | in progress |

## Update protocol

Same as prior specs:
1. Set checkbox in `tasks.md` to `[x]`.
2. Note commit SHA in `ops/run-ledger.md`.
3. Update Status column above.
4. When all tasks for a requirement done, mark requirement done.
5. When all requirements done, spec is ready for acceptance run.

## Status snapshot

```
Phase 0 — storyboards + tokens + character spec   in progress
Phase 1 — monorepo restructure                    not started
Phase 2 — visual primitives + Level 1             not started
Phase 3 — Levels 2-4                              not started
Phase 4 — Levels 5-7                              not started
Phase 5 — Level 8 + Sandbox + progress            not started
Phase 6 — mobile scaffold                         not started
Phase 7 — mobile Levels 2-8                       not started
Phase 8 — polish                                  not started
Phase 9 — deploy                                  not started
Spec discipline                                   in progress (this file)
```

## Cross-spec dependencies

- **Depends on spec 0001**: Sandbox preserves the lab visual identity.
- **Depends on spec 0004**: α / ε / decoys surface in levels 4-7.
- **Depends on spec 0005**: multi-party + Shapley split surfaced in
  level 6.
- **Depends on spec 0006**: run reports preserved in Sandbox + level 8
  graduation handoff.
- **Depends on spec 0008**: cytoscape `SourceGraph` reused in level 6.
- **Composes with spec 0009**: factory dev control plane unaffected.
