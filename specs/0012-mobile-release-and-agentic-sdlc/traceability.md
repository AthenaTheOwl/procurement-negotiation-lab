# traceability: mobile release discipline + agentic SDLC

| Requirement | Design surface | Planned proof |
|---|---|---|
| R-MOBREL-001 | `apps/mobile/eas.json`, `.maestro/README.md`, `ops/releases/` | profile/channel review; EAS build when authenticated |
| R-MOBREL-002 | `ops/releases/` tier table | release entry records which proof tier actually ran |
| R-MOBREL-003 | `apps/mobile/.maestro/level-*-walkthrough.yaml` | Maestro Android emulator run artifact |
| R-MOBREL-004 | `ops/releases/README.md`, `ops/releases/TEMPLATE.md`, dated entries | checked-in release ledger entry for every build/update promotion |
| R-MOBREL-005 | `.github/workflows/mobile-e2e.yml`, `.github/workflows/frontend.yml` | manual/scheduled run with artifacts and concurrency cancellation |
| R-SDLC-001 | spec delta policy | `scripts/spec_check.py`, traceability rows |
| R-SDLC-002 | review gates | PR review checklist / agent handoff |
| R-SDLC-003 | cross-repo parity table | cargo-health note + prompt-library workflow |
| R-AIBRIEF-001 | separate `ai-field-brief` repo | `https://github.com/AthenaTheOwl/ai-field-brief` |
