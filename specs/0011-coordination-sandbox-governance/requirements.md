# requirements: coordination sandbox + execution discipline

## Scope

Spec 0011 codifies the post-Level-11 sandbox additions and the process
guardrails needed to keep future work from drifting away from requirements,
traceability, tests, deployment proof, and production smoke.

This spec exists because the sandbox work initially shipped as a good feature
slice, but not as a first-class spec slice. That is the gap this spec closes.

## Requirements

### R-SANDBOX-001: per-product convergence playground

WHEN a user opens the Sandbox, THE SYSTEM SHALL provide an interactive
convergence tab for per-product vendor coordination.

Acceptance:
- The tab simulates consensus/ADMM, damped averaging, price tatonnement,
  and Lagrangian shadow-price updates.
- It shows per-round residuals, demand gaps, prices or shadow prices, and
  latest vendor messages.
- It names what crosses the trust boundary for the chosen method.

### R-SANDBOX-002: one-shot menu fallback

WHEN an iterative method is not worth the overhead, THE SYSTEM SHALL show
a discrete one-shot menu fallback derived from the latest consensus point.

Acceptance:
- The fallback contains Fast & Flexible, Balanced, and Lean & Firm options.
- Each option includes quantity, unit price, flexibility, penalty, and a
  short commercial note.
- Browser smoke verifies the fallback renders.

### R-SANDBOX-003: convergence method map

WHEN a user compares convergence approaches, THE SYSTEM SHALL explain more
than the four simulated methods.

Acceptance:
- The method map covers progressive hedging, gossip, federated averaging,
  projection methods, no-regret learning, auctions/mechanisms,
  voting/scoring, Bayesian pooling, and contract menus.
- Each method names best fit and tradeoff.
- The engine test suite asserts the map contains these alternatives.

### R-SANDBOX-004: transfer-pricing workbench

WHEN a user explores cost-benefit transfer pricing, THE SYSTEM SHALL show
how welfare and transfers differ.

Acceptance:
- The workbench computes real welfare surplus separately from transfers.
- It computes the acceptance interval, selected transfer, unit transfer,
  vendor net gain, and platform net gain.
- It blocks negative-welfare plans instead of allowing a transfer to make
  them look acceptable.

### R-SANDBOX-005: transfer pricing lenses

WHEN a user changes the transfer method, THE SYSTEM SHALL compare the main
pricing lenses without changing the underlying welfare accounting.

Acceptance:
- The workbench supports surplus-share, marginal-externality,
  two-part-tariff, and VCG-style methods.
- Two-part tariff separates marginal unit signals from fixed surplus
  sharing.
- Engine tests verify budget balance and acceptance-interval bounds.

### R-MOBILE-003: mobile level coverage matches progress state

WHEN `TOTAL_LEVELS` changes in mobile progress state, THE SYSTEM SHALL
render every level from 1 through `TOTAL_LEVELS`.

Acceptance:
- Mobile has a Level 11 screen for the coordination catalog.
- `apps/mobile/App.tsx` uses a type-checked level registry so missing
  level components fail TypeScript.
- Mobile typecheck and Jest pass.

### R-GUARD-001: dynamic spec discovery

WHEN `scripts/spec_check.py` runs, THE SYSTEM SHALL discover active specs
from the `specs/` directory instead of relying on a hand-maintained list.

Acceptance:
- Every `NNNN-*` spec must contain the six core spec files.
- Every `R-*` heading in `requirements.md` must appear in the same spec's
  `traceability.md`.
- Duplicate requirement IDs are rejected.
- `specs/README.md` must list every active spec directory.

### R-GUARD-002: workflow proof gates

WHEN CI runs on pull requests or pushes to main, THE SYSTEM SHALL enforce
the same gates needed to call the repo ready.

Acceptance:
- Python CI runs pytest, ruff, mypy, voice_lint, and spec_check.
- Frontend CI runs npm install, lint, production build, web+engine tests,
  mobile Jest, mobile typecheck, and built-app Playwright smoke.
- Security CI runs bandit and pip-audit.
- Scheduled/manual smoke runs against the production Vercel URL.

### R-GUARD-003: local execution protocol

WHEN an agent or developer changes implementation code, THE SYSTEM SHALL
document the full local proof sequence before merge.

Acceptance:
- `AGENTS.md` includes spec-first rules for user-visible product work.
- `AGENTS.md` lists the full local and post-deploy verification commands.
- `package.json` exposes `verify:js`, `verify:py`, and `verify`.
- The rules say to update the spec before implementation when a change does
  not fit the active spec.

### R-GUARD-004: interactive controls explain their purpose

WHEN a user-facing sandbox control changes a scenario parameter, THE SYSTEM
SHALL explain what the control changes, why the user would touch it, and which
output to watch.

Acceptance:
- Core scenario sliders in the Lab Arena include short causal helper text.
- Level 6 explains why packager capacity exists and how it affects third-party
  transfer feasibility.
- Convergence and transfer-pricing workbench inputs include parameter-specific
  helper text.
- Tests cover the Level 6 packager-capacity explanation.

### R-SPEC-011: traceability for this discipline pass

WHEN this spec ships, THE SYSTEM SHALL record the new requirements,
design, tasks, acceptance checks, research notes, and traceability.

Acceptance:
- This spec is listed in `specs/README.md`.
- `scripts/spec_check.py` passes with this spec included.
- `specs/0010-pedagogical-redesign/STATUS.md` remains a status snapshot,
  not the only source of truth for the Phase 11 work.
