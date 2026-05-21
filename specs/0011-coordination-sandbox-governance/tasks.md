# tasks: coordination sandbox + execution discipline

## Product implementation

- [x] **A1**: Add shared convergence engine helper with simulated ADMM,
  damped averaging, price tatonnement, and Lagrangian loops.
  *(R-SANDBOX-001)*
- [x] **A2**: Add fallback-menu generation from the final consensus point.
  *(R-SANDBOX-002)*
- [x] **A3**: Add method guide metadata for non-simulated convergence
  alternatives. *(R-SANDBOX-003)*
- [x] **A4**: Add transfer-pricing engine helper with welfare, acceptance
  interval, transfer methods, and guardrails. *(R-SANDBOX-004,
  R-SANDBOX-005)*
- [x] **A5**: Export the helpers through `@lab/engine`. *(R-SANDBOX-001,
  R-SANDBOX-004)*

## Web sandbox implementation

- [x] **B1**: Add `ConvergencePlayground.tsx` and wire it into
  `SandboxShell`. *(R-SANDBOX-001, R-SANDBOX-002, R-SANDBOX-003)*
- [x] **B2**: Add `TransferPricingStudio.tsx` and wire it into
  `SandboxShell`. *(R-SANDBOX-004, R-SANDBOX-005)*
- [x] **B3**: Add component tests for both new sandbox tabs and update
  `SandboxShell` tests. *(R-SANDBOX-001, R-SANDBOX-004)*
- [x] **B4**: Extend Playwright smoke to open both new tabs.
  *(R-SANDBOX-002, R-SANDBOX-004)*

## Mobile correction

- [x] **C1**: Add mobile `Level11.tsx` for the coordination catalog.
  *(R-MOBILE-003)*
- [x] **C2**: Replace manual route branches with a type-checked
  `LEVEL_COMPONENTS` registry. *(R-MOBILE-003)*
- [x] **C3**: Verify mobile Jest and typecheck. *(R-MOBILE-003)*

## Guardrails

- [x] **D1**: Replace hand-maintained spec ID list with dynamic spec
  discovery in `scripts/spec_check.py`. *(R-GUARD-001)*
- [x] **D2**: Make `spec_check.py` fail on missing spec directories in
  `specs/README.md`. *(R-GUARD-001)*
- [x] **D3**: Make `spec_check.py` fail when CI workflow proof commands are
  missing. *(R-GUARD-002)*
- [x] **D4**: Update GitHub workflows to enforce voice lint, full frontend
  build/test, mobile Jest/typecheck, and built-app smoke. *(R-GUARD-002)*
- [x] **D5**: Update `AGENTS.md` with spec-first and proof-gate rules.
  *(R-GUARD-003)*
- [x] **D6**: Register this spec and update traceability. *(R-SPEC-011)*

## Verification

- [x] **V1**: Engine vitest covers convergence and transfer helpers.
  *(R-SANDBOX-001, R-SANDBOX-004)*
- [x] **V2**: Web vitest covers new sandbox UI and tabs. *(R-SANDBOX-001,
  R-SANDBOX-004)*
- [x] **V3**: Full local gate sweep passes. *(R-GUARD-002)*
- [x] **V4**: Push to `main`, wait for GitHub checks, verify Vercel
  deployment, and run production smoke. *(R-GUARD-002, R-GUARD-003)*
