# acceptance: coordination sandbox + execution discipline

## Pass A - convergence sandbox

| Check | Verification |
|---|---|
| Four simulated methods available | `CONVERGENCE_METHODS` engine test |
| Round log includes residual, demand gap, and messages | `ConvergencePlayground` test |
| Fallback menu renders Balanced option | Playwright smoke |
| Method map includes non-simulated alternatives | `CONVERGENCE_GUIDES` engine test |

## Pass B - transfer pricing sandbox

| Check | Verification |
|---|---|
| Positive surplus creates an acceptance interval | `transferPricing.test.ts` |
| Negative welfare blocks transfer | `transferPricing.test.ts` + UI test |
| Two-part tariff separates unit signal and fixed credit | `transferPricing.test.ts` |
| Transfer tab renders in Sandbox | Playwright smoke |

## Pass C - mobile route coverage

| Check | Verification |
|---|---|
| Mobile Level 11 exists | file presence |
| `TOTAL_LEVELS = 11` has a matching component registry entry | mobile typecheck |
| Completing Level 10 no longer routes to a blank Level 11 | `App.tsx` registry |
| Mobile tests still pass | `npm run test --workspace=@lab/mobile -- --runInBand` |

## Pass D - spec and workflow guardrails

| Check | Verification |
|---|---|
| Active specs are discovered dynamically | `python scripts/spec_check.py` |
| Every active spec has the six core files | `python scripts/spec_check.py` |
| Every R-* heading appears in traceability | `python scripts/spec_check.py` |
| Duplicate R-* IDs fail | `python scripts/spec_check.py` |
| `specs/README.md` lists every active spec | `python scripts/spec_check.py` |
| CI workflow proof commands are present | `python scripts/spec_check.py` |
| Local verification scripts are present in package.json | `python scripts/spec_check.py` |
| AGENTS.md lists the required local and production proof commands | `python scripts/spec_check.py` |

## Pass E - full proof gates

Standard set:

- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `npm.cmd run test --workspace=@lab/mobile -- --runInBand`
- `npm.cmd run typecheck --workspace=@lab/mobile`
- `python -m uv run pytest -q`
- `python -m uv run ruff check .`
- `python -m uv run mypy src`
- `python -m uv run bandit -q -r src`
- `python -m uv run pip-audit`
- `python scripts/voice_lint.py`
- `python scripts/spec_check.py`
- `SMOKE_URL=<local-preview> npm run smoke --workspace=@lab/web`
- after deploy: `SMOKE_URL=https://procurement-negotiation-lab.vercel.app/ npm run smoke --workspace=@lab/web`

## Pass F - control clarity

| Check | Verification |
|---|---|
| Lab Arena sliders explain what they change and what to watch | Code review + browser QA |
| Level 6 packager slider explains chokepoint purpose | `Level06.test.tsx` |
| Convergence input fields define tuning parameters | Code review + web vitest |
| Transfer-pricing input fields define pricing parameters | Code review + web vitest |

## Definition of done

- This spec is registered in `specs/README.md`.
- `scripts/spec_check.py` passes with this spec included.
- The new sandbox concepts are explorable in the deployed app.
- Mobile route coverage matches `TOTAL_LEVELS`.
- GitHub checks and Vercel deployment are green for the final commit.
