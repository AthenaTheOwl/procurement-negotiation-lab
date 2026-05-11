# research: production hardening from MedRoute patterns

## Primary source

**`../cargo-health/medroute-main`** — the user's adjacent production
project. Specifically the patterns that turn a small TypeScript codebase
into something durable:

Shapes:
- Test rings: unit/property → integration → contract/observability →
  browser/system.
- Schema-first validation as a single source of truth (zod or zod-like).
- Test data factories instead of inline ad-hoc fixtures.
- Spec checker that maps every requirement to tests + UI proof.
- Event-style audit log for cross-module operations.

These are imported as *habits*, not as code. The lab is a different domain
(public learning demo, not a routing product); the disciplines transfer.

## Schema-first validation

**zod.** https://zod.dev/

Shapes:
- The runtime + compile-time single-source-of-truth pattern.
- Inferred TypeScript types via `z.infer`.

**Aaron Boodman, *Schema-driven development*.** Linear engineering blog,
2022.

Shapes:
- The argument that schemas at the boundary of every module simplify
  refactor and prevent silent regressions.

## Test rings

**The Practical Test Pyramid.** Martin Fowler, 2018.
https://martinfowler.com/articles/practical-test-pyramid.html

Shapes:
- The unit / integration / E2E ring structure.
- The bias toward many unit tests + fewer integration + few E2E.

**Contract testing.** Pact docs.
https://pact.io/

Shapes:
- The framing that integration tests assert at module-public-API level,
  not internal-state level. The lab's integration tests follow this.

## Browser smoke

**Playwright.** https://playwright.dev/

Shapes:
- Deployed-URL smoke against the actual production environment.
- Catches deploy-time regressions that DOM-only tests miss (CSS load
  failures, asset 404s, broken iframes).

## Audit logs

**Event sourcing patterns.** Martin Fowler.
https://martinfowler.com/eaaDev/EventSourcing.html

Shapes:
- The typed-event log pattern: every state change emits an event;
  the event log is the source of truth for what happened.

**Decision journals.** Annie Duke, *Thinking in Bets*, 2018.

Shapes:
- The argument that a decision log separates good decisions from good
  outcomes. The lab's decision event log makes the run's reasoning
  visible alongside its results.

## Spec discipline

**Kiro specs.** https://kiro.dev/docs/specs/

Shapes:
- External comparison for the requirements/design/tasks/acceptance/
  research/traceability spec ledger this repo uses.

## Spec dependencies

- Spec 0005 — `scenarioSchema.ts` introduced there is the single source
  of truth that 0007 enforces.
- Spec 0006 — `runReportSchema` and decision events feed each other.

## Out of scope

- Auth, DB, server. Not relevant to a single-user public demo.
- Real CDN/edge/observability. Vercel's defaults suffice.
- LLM-based test generation. Deterministic tests only.
