# traceability: mobile release discipline + agentic SDLC

| Requirement | Design surface | Planned proof |
|---|---|---|
| R-MOBREL-001 | `apps/mobile/eas.json`, release docs | profile/channel review, EAS dry run when authenticated |
| R-MOBREL-002 | mobile proof ladder docs | PR template/status ledger uses proof tier |
| R-MOBREL-003 | native E2E flows | Maestro or equivalent E2E run artifact |
| R-MOBREL-004 | `docs/mobile-release-ledger.md` | ledger entry for every build/update promotion |
| R-MOBREL-005 | `.github/workflows/mobile-native.yml` / EAS workflow | manual/scheduled run with artifacts |
| R-SDLC-001 | spec delta policy | `scripts/spec_check.py`, traceability rows |
| R-SDLC-002 | review gates | PR review checklist / agent handoff |
| R-SDLC-003 | cross-repo parity table | cargo-health note + prompt-library workflow |
| R-AIBRIEF-001 | separate `ai-field-brief` repo | Phase 0 spec pack before code |

