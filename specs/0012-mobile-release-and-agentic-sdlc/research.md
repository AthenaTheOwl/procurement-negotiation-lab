# research: mobile release discipline + agentic SDLC

## External references checked 2026-05-22

- Expo EAS production builds: production builds are store/TestFlight oriented;
  emulator-installable artifacts require the right build type/profile. This
  supports a separate preview/internal profile rather than treating production
  builds as the normal smoke artifact.
- EAS Workflows syntax: workflows can trigger on GitHub events or manual CLI
  runs, and jobs can build, submit, and distribute to TestFlight. This supports
  manual/scheduled native proof instead of every-PR store builds.
- EAS Update deployment: runtime versions, channels, rollouts, and rollback are
  release concepts that need to be recorded with the git SHA.
- Expo Jest docs: `jest-expo` is the intended fast unit/snapshot layer for Expo
  projects, but Expo points UI/E2E testing to E2E tools rather than snapshots.
- React Native testing overview: E2E should run against a release-like app and
  should cover vital flows because it is slower and more failure-prone.
- Maestro React Native docs: Maestro works at the accessibility layer, can test
  React Native on Android/iOS without app dependencies, and fits Expo/EAS.
- GitHub branch protection docs: required status checks, PR reviews, merge
  queue, deployment gates, and admin-bypass behavior are policy levers, not
  repo files. They need GitHub settings after workflow files exist.
- GitHub Actions workflow syntax: concurrency groups cancel stale runs; use this
  on CI and deployment workflows.
- Turborepo CI and remote cache docs: use task graph/cache/filtering for larger
  monorepos; be careful because logs are artifacts and environment variables can
  affect cache safety.
- Inngest docs: functions use events/cron/workflows and `step.run()` gives
  retriable, memoized step boundaries. AI Brief should model ingestion and brief
  generation as step workflows with replay.
- pgvector: keeps vectors with relational data in Postgres and supports exact
  and approximate nearest-neighbor search. AI Brief can start with Postgres +
  pgvector plus full-text search instead of a separate vector database.
- OpenAI Evals: evals are a framework for testing LLM systems and custom evals.
  Prompt/model changes in AI Brief should be blocked by task-specific evals.
- LeCun/Meta JEPA: the useful process lesson is "world model before action":
  build internal representations and evaluate plans, not just generate text.
- Thinking Machines interaction-model work: separates real-time interaction
  from asynchronous background reasoning. AI Brief should mirror that split:
  quick UI actions plus durable background ingestion/summarization.
- Karpathy/Software 3.0 framing, treated as a heuristic rather than a spec:
  natural-language programming increases output speed, so the bottleneck moves
  to verification, orchestration, and evals.
- Garry Tan/control framing, treated as a product heuristic: users need visible
  control and clear feedback loops; hidden automation without a control surface
  becomes bad UX.

## Local references checked

- `procurement-negotiation-lab/specs/0010-pedagogical-redesign/STATUS.md`
  already records Phase 12 discipline retrofit and the remaining EAS/iOS caveat.
- `procurement-negotiation-lab/specs/0011-coordination-sandbox-governance/`
  already codifies sandbox discipline and user-control explanations.
- `../cargo-health/medroute-main/.github/workflows/` contains a richer CI ring:
  CI, contracts, integration, chaos, mutation, Lighthouse, Schemathesis, ZAP.
- `../prompt-library/library/coding/workflows/spec-driven-learning-lab.md`
  already names the "visible causal delta" rule that applies to the lab.

## Decision

Use a layered proof model:

1. Fast PR gates for deterministic checks.
2. Scheduled/manual native checks for expensive device proof.
3. Release ledger for evidence that survives the session.
4. Branch protection/rulesets to make the green path enforceable in GitHub.
5. Eval suites for LLM/prompt/source-ingestion changes in AI Brief.

