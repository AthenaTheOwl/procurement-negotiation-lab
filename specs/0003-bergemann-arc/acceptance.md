# acceptance: bergemann arc + so-what pass

A pass is accepted when every check below passes. Order matches build order
in `tasks.md`.

## Pass A — Hero

| Check | Verification |
|---|---|
| Hero contains "mechanism design" | `npm.cmd run test -- --run` AppTest assertion |
| Hero shows live $ figure | render component with default scenario; assert headline contains `$` and at least one digit |
| Bergemann link present | DOM query for `linkedin.com/pulse/how-mechanism-design` |
| Primary CTA opens Arc | click handler dispatches `setSurface('arc')` |
| Headline number derives from `labTakeaway` | unit test asserts `Hero` reads `labTakeaway(scenario).coordinationGap` |
| Browser QA screenshot | `ops/qa-evidence/0003-pass-a-hero.png` saved |

## Pass C — TS formula engine

| Check | Verification |
|---|---|
| `compileFormula('q * 2').evaluate({q:7})` returns 14 | `formula.test.ts` |
| `compileFormula('min(q, demand)').evaluate({q:50, demand:60})` returns 50 | `formula.test.ts` |
| `compileFormula('clip(q, 0, 10)').evaluate({q:25})` returns 10 | `formula.test.ts` |
| `compileFormula("__import__('os')")` raises | `formula.test.ts` |
| `compileFormula('os.system("rm")')` raises | `formula.test.ts` |
| `compileFormula('lambda q: q+1')` raises | `formula.test.ts` |
| Oversized formula raises | string length 2001 chars |
| Unknown variable at evaluate raises | `compileFormula('q+xyz').evaluate({q:1})` raises |
| Whitelisted functions only | `compileFormula('eval("1+1")')` raises with "function not allowed" |
| Coverage on `web/src/model/formula.ts` | ≥ 90 % line coverage |

## Pass B — Arc surface

| Check | Verification |
|---|---|
| Arc surface accessible from nav | AppTest renders `arc` surface; finds 8 step indicators |
| Forward/back navigation works | AppTest steps through 1→2→1; widget state intact |
| Step 1 displays gap on default scenario | DOM contains `$` figure ≥ 0 |
| Step 2 privacy slider responds | change event triggers re-render; utility values change |
| Step 5 shows 4 algorithms side-by-side | DOM contains `admm`, `alternating`, `price-only`, `consensus` |
| Step 6 formula editor reruns simulation | type a valid formula, hit submit, result panel updates |
| Step 6 invalid formula shows error | type `__import__`, error replaces result panel |
| Step 7 case A converges | `algorithmResults` for `joint-exists-admm-converges` shows admm `convergence: 'converged'` within 30 iter |
| Step 7 case B shows ADMM oscillating | `algorithmResults` for `joint-exists-admm-oscillates` shows admm `convergence: 'oscillating'` while alternating-best-response converges |
| Step 7 case C surfaces infeasible | `transferLedger` for `joint-does-not-exist` returns `feasible: false` with non-empty `note` |
| Step 8 split-rule toggle changes ledger | toggle proportional ↔ equal; transfer values change |
| All step components render without console errors | Vitest captures console output |
| Browser QA screenshots | one per step, saved in `ops/qa-evidence/0003-pass-b-step{1..8}.png` |

## Pass D — Deploy

| Check | Verification |
|---|---|
| GitHub repo exists | `gh repo view AthenaTheOwl/procurement-negotiation-lab --json visibility` returns `public` |
| Vercel URL responds 200 | `curl -I <vercel-url>` |
| New hero visible at deployed URL | manual browser check + screenshot |
| Door N° 17 in `doors.json` | grep `\"n\": \"17\"` succeeds |
| Manifest entry exists | grep repo name in `portfolio-manifest.yml` |
| Profile README updated | grep `procurement-negotiation-lab` |
| Next audit run shows door 17 ✅ | `gh workflow run portfolio-audit.yml` then check `ops/portfolio-health.md` |

## Discipline gates (per pass)

Every pass must run all of these and produce all-clean output before commit:

```
npm.cmd run build                     no errors
npm.cmd run test -- --run              all tests pass
python -m uv run pytest                all tests pass (Python ref engine)
python -m uv run ruff check .          all checks passed
python -m uv run mypy src              no issues
python -m uv run bandit -q -r src      no issues
python -m uv run pip-audit             no known vulnerabilities
```

Update `ops/proof_gates.json` with the pass name and timestamp on success.
Append a row to `ops/run-ledger.md` capturing the commit SHA, the gates
that passed, and any deferred follow-ups.

## Definition of done

The pass is **done** when:

- All checks in this file pass.
- `traceability.md` is updated to show every R-ARC-* requirement linked to
  satisfying tasks and acceptance checks.
- The Vercel URL is live and the new hero is visible.
- Door N° 17 is registered in athena-site and shows ✅ on the next audit.
- A short demo (60-90 seconds) walks through hero → step 1 → step 5 →
  step 6 → step 7 → step 8 without errors. Recording optional but recommended.
