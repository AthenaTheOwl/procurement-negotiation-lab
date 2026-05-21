# Agent instructions

This repo is a public learning lab. Preserve the boundary:

- do not add internal Amazon data, real PO numbers, internal vendor terms, or roadmap claims
- credit `https://github.com/amzn/FloPro` only as a public implementation reference
- keep hosted execution safe: no arbitrary Python execution from user formulas
- prefer runnable, visible demos over invisible sophistication
- every new algorithm must return the common trace schema and benchmark metrics
- if a user-visible concept, workflow, mechanism, or level does not fit an
  active spec, update or create the spec before implementation
- never treat `STATUS.md` as the only source of truth; requirements,
  traceability, tasks, acceptance, and CI must agree
- if a total/count registry changes (`TOTAL_LEVELS`, route maps, sandbox tabs),
  add a typed registry or a test that fails when the registry and renderer drift
- every new sandbox or learn surface needs engine-level tests when it contains
  math, component tests for interaction, and Playwright smoke for the rendered
  path

Before merging implementation changes, run:

```powershell
npm.cmd run verify
python scripts/spec_check.py
python scripts/voice_lint.py
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test --workspace=@lab/mobile -- --runInBand
npm.cmd run typecheck --workspace=@lab/mobile
python -m uv run pytest
python -m uv run ruff check .
python -m uv run mypy src
python -m uv run bandit -q -r src
python -m uv run pip-audit
```

Before calling production green, also run:

```powershell
SMOKE_URL=<local preview URL> npm.cmd run smoke --workspace=@lab/web
SMOKE_URL=https://procurement-negotiation-lab.vercel.app/ npm.cmd run smoke --workspace=@lab/web
```
