# tasks: bergemann arc + so-what pass

Tasks are grouped by pass. Each task lists the requirement(s) it satisfies.
Build order: A → C → B → D. (C before B because the arc step 6 widget needs
the TS formula engine.)

## Pass A — Hero (~1.5 hrs)

- [x] **A1**: Create `web/src/components/Hero.tsx` rendering the three-slot
  layout (eyebrow, headline with live $ figure, subhead with Bergemann
  paraphrase, CTAs). Bind the headline number to
  `labTakeaway(scenarios[0]).coordinationGap`. *(R-ARC-001)*
- [x] **A2**: Add hero styles to `web/src/styles.css` matching the existing
  dark-mode palette. *(R-ARC-001)*
- [x] **A3**: Mount `<Hero />` above the existing nav in `web/src/App.tsx`.
  Wire CTAs: primary → set surface to `'arc'`; secondary → existing surfaces.
  *(R-ARC-001)*
- [x] **A4**: Add the Bergemann external link with `target="_blank"
  rel="noreferrer"`. *(R-ARC-001)*
- [x] **A5**: AppTest assertion: hero headline contains a `$` character; eyebrow
  contains "mechanism design"; the Bergemann link is present. *(R-ARC-001)*

## Pass C — TS formula engine (~2 hrs)

- [x] **C1**: Create `web/src/model/formula.ts` mirroring the Python AST
  whitelist at `src/procurement_lab/engine/formula.py`. Use `acorn` for
  parsing. Implement `compileFormula(source, allowedVars?)` and
  `compiled.evaluate(namespace)`. *(R-ARC-004)*
- [x] **C2**: Whitelist exactly these functions: `min`, `max`, `abs`, `sqrt`,
  `log`, `exp`, `clip`, `pow`. Match the Python implementation's safety
  guards (log requires positive arg, sqrt requires non-negative, pow exponent
  capped at ±10, division by zero raises). *(R-ARC-004)*
- [x] **C3**: Limits: max length 2000, max AST nodes 200, max call depth 5,
  reject identifiers containing `__` or starting with `_`. *(R-ARC-004)*
- [x] **C4**: Tests at `web/src/model/formula.test.ts` mirroring the Python
  test suite. Cover happy path (`q * 2`, `min(q, 100)`, `max(q, 0)`,
  `clip(q, 0, 10)`, conditional expressions) and refusal path (`__import__`,
  `os.system`, attribute access, comprehensions, lambdas, oversized
  expressions, unknown variables). *(R-ARC-004)*

## Pass B — Arc surface and 8 steps (~5 hrs)

### Surface scaffold

- [x] **B1**: Create `web/src/surfaces/ArcSurface.tsx` with a `useReducer`
  managing `currentStep` and per-step widget state. Render the active step's
  component plus forward/back navigation and a progress indicator.
  *(R-ARC-002)*
- [x] **B2**: Add Arc route to `web/src/App.tsx` nav and surface dispatch.
  *(R-ARC-002)*
- [x] **B3**: Create `web/src/data/arc.ts` listing the 8 steps with
  title, plain-English copy (≤80 words each), interactive-widget config
  reference, and deep-link target. *(R-ARC-002)*

### Step components

- [x] **B4**: `Step1CoordinationGap.tsx` — render the gap on the default
  scenario. Reuse `labTakeaway`. *(R-ARC-002)*
- [x] **B5**: `Step2PrivacyCost.tsx` — privacy slider. On change run
  `informationSweep(scenario)` and render utility-vs-privacy. *(R-ARC-002)*
- [x] **B6**: `Step3TruthDominant.tsx` — side-by-side incentive comparison
  showing price-only-dual vs CPP+VCG. Reuse `algorithmResults`. *(R-ARC-002)*
- [x] **B7**: `Step4ADMMEngine.tsx` — animate residual converging. Reuse the
  ADMM iteration trace from `algorithmResults`. *(R-ARC-002)*
- [x] **B8**: `Step5ConvergencePaths.tsx` — side-by-side comparison of ADMM,
  alternating-best-response, price-only, consensus-averaging on the same
  scenario; surface iterations, runtime, oracle gap. *(R-ARC-003)*
- [x] **B9**: `Step6AuthorAgent.tsx` — formula editor for buyer or supplier
  utility. Bind to TS formula engine from C1. Persist to localStorage. Reset
  button. Add scenario knob sliders (volatility, capacity tightness, lead
  time). Save-as-JSON and Load-from-JSON paths. *(R-ARC-004 + R-ARC-005)*
- [x] **B10**: `Step7JointOptimumCases.tsx` — three tabs, one per case. Each
  tab shows scenario description, algorithm output, CBT ledger row.
  *(R-ARC-006)*
- [x] **B11**: `Step8CBT.tsx` — transfer ledger with split-rule toggle. Reuse
  `transferLedger`. *(R-ARC-002)*

### Joint-optimality scenarios

- [x] **B12**: Add 3 new entries to `web/src/data/scenarios.ts`:
  `joint-exists-admm-converges`, `joint-exists-admm-oscillates`,
  `joint-does-not-exist`. Calibrate parameters so each case behaves as
  specified. *(R-ARC-006)*
- [x] **B13**: AppTest assertions per case: A converges within 30 iterations;
  B shows ADMM residual not converging while alternating BR does; C produces
  `transferLedger.feasible = false` with non-empty explanation. *(R-ARC-006)*

## Pass D — Deploy (~30 min, manual)

- [ ] **D1**: `gh repo create AthenaTheOwl/procurement-negotiation-lab
  --public --source=. --push`. *(R-ARC-007)*
- [ ] **D2**: Vercel: import repo; root directory `.` (repo root, where
  `package.json` and `vite.config.ts` live); framework Vite; build
  `npm run build`; output `dist/`. *(R-ARC-007)*
- [ ] **D3**: Update repo `README.md` with the Vercel URL. *(R-ARC-007)*
- [ ] **D4**: Add door N° 17 to
  `e:\claude_code\random-apps\athena-site\src\content\doors.json`.
  *(R-ARC-007)*
- [ ] **D5**: Add the new repo to
  `e:\claude_code\random-apps\athena-site\ops\portfolio-manifest.yml`
  with `deploy_url`. *(R-ARC-007)*
- [ ] **D6**: Update `e:\claude_code\random-apps\AthenaTheOwl-profile\README.md`
  with the new door entry. *(R-ARC-007)*
- [ ] **D7**: Trigger the next portfolio audit run; confirm door 17 ✅.
  *(R-ARC-007)*

## Spec discipline

- [x] **S1**: Add this spec entry to `specs/README.md`. *(R-SPEC-003)*
- [x] **S2**: Update `traceability.md` as tasks ship. *(R-SPEC-003)*
- [ ] **S3**: Append a `ops/run-ledger.md` entry per pass (A, C, B, D) with
  the test/build evidence and the commit SHA. *(R-SPEC-003)*

## Build order

```
A1 → A2 → A3 → A4 → A5         hero ships first; visible improvement
C1 → C2 → C3 → C4              TS formula engine before B9 needs it
B1 → B2 → B3                   arc surface scaffold
B4 → B5 → B6 → B7 → B8         narrative steps using existing engine
B9                              authoring step (depends on Pass C)
B10 → B11                      end of arc
B12 → B13                      joint-optimality scenarios
D1 → D2 → D3 → D4 → D5 → D6 → D7   deploy + portfolio integration
S1 → S2 → S3                   spec ledger discipline
```

## Out of scope

- Run report / shareable artifact (next spec; Codex's correct call but the
  so-what pass earns more from hero + arc first)
- LLM-generated coach text
- Multi-party (3+) authoring inside the arc (LAB already supports up to 5
  for exploration; the arc focuses on the two-party teaching case)
