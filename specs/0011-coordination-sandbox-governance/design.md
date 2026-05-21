# design: coordination sandbox + execution discipline

## Product surfaces

The new concepts live in Sandbox tabs instead of becoming gated Learn levels.
That keeps the main learning journey stable while still giving power users a
place to play with the new coordination mechanics.

```text
apps/web/src/surfaces/sandbox/
  SandboxShell.tsx
  convergence/
    ConvergencePlayground.tsx
  transfer/
    TransferPricingStudio.tsx
```

`SandboxShell` owns the tab registry:

- Buy plan
- Convergence
- Transfers
- Classic Lab Arena

## Engine contract

The browser surfaces do not own math directly. New sandbox math lives in the
shared engine and is exported through `@lab/engine`.

```text
packages/engine/src/learn/convergencePlayground.ts
packages/engine/src/learn/transferPricing.ts
packages/engine/src/index.ts
```

### Convergence helper

`simulateConvergence()` accepts vendor profiles plus a config and returns:

- method
- converged flag
- round log
- final consensus
- final price
- residual
- messages shared
- privacy note
- fallback menu

The helper simulates four methods and separately exports `CONVERGENCE_GUIDES`
so the UI can describe additional approaches without pretending each is fully
simulated.

### Transfer helper

`evaluateTransferPricing()` accepts a scenario and returns:

- welfare surplus
- acceptance interval
- selected transfer
- unit transfer
- vendor/platform net gain
- budget-balance flag
- component breakdown
- guardrail/explanation copy

The core design rule is strict: transfers allocate positive real surplus; they
must not make negative-welfare plans look good.

## Mobile coverage

Mobile progress state currently has `TOTAL_LEVELS = 11`, so the mobile app must
render Level 11 too. `App.tsx` uses a `LEVEL_COMPONENTS` registry with:

```ts
satisfies Record<LevelId, ComponentType<LearnLevelProps>>
```

That turns missing level screens into TypeScript failures.

## Spec and CI guardrails

The durable guardrail is `scripts/spec_check.py`. It now discovers every active
`specs/NNNN-*` directory and verifies:

- all six required files exist
- every `R-*` heading in `requirements.md` appears in `traceability.md`
- requirement IDs are unique across active specs
- `specs/README.md` lists every active spec
- CI workflows contain the expected proof commands

CI is split by concern:

- `.github/workflows/tests.yml`: Python correctness + voice/spec gates
- `.github/workflows/frontend.yml`: install, lint, build, web/engine tests,
  mobile Jest, mobile typecheck, local built-app smoke
- `.github/workflows/security.yml`: bandit and pip-audit
- `.github/workflows/smoke.yml`: scheduled/manual production smoke

## Why not delete and redo?

The implementation itself was sound and already had meaningful tests. The
problem was process debt: the spec ledger, mobile route coverage, and CI
coverage did not fully match the shipped claims. Retrofitting the spec and
making the mismatch fail in CI is lower-risk than deleting working code.
