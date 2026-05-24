# .agents/CATALOG.md

Catalog of roles, tools, policies, and workflows the CDCP charter
defines but this repo has not yet installed. Items move out of the
catalog when a SKILL.md, role, tool, policy, or workflow file lands
under `.agents/` and a DEC records the rationale.

The six baseline roles (control.coordinator, product.spec-writer,
engineering.implementation, engineering.code-reviewer,
science.proof-gate-runner, learning.dream-orchestrator) ship in this
install. Two further roles have graduated since; see the Graduated
section below. The remaining roles are deferred.

## Roles graduated

- **domain.simulator-guide** — graduated 2026-05-24. Owns the
  pedagogical surface of the simulator (level intros, glossary
  placement, primitive copy, consequence-before-math discipline).
  Originating evidence: Levels 1-11 under
  `apps/web/src/surfaces/learn/`, the LevelShell primitive contract,
  DEC-PLAY-003 consequence-before-math, DEC-PLAY-004 teach terms in
  context. Role files at `.agents/roles/domain.simulator-guide/`.
- **operations.release-manager** — graduated 2026-05-24. Owns the
  path from merge to production: stages release candidates, runs
  the mobile-release workflow, gates canary promotion, appends
  release ledger entries with proof refs. Originating evidence:
  `ops/releases/001-2026-05-22-spec-0012-tier2-bootstrap.md`, the
  `.github/workflows/mobile-e2e.yml` workflow, DEC-MOBREL-001 EAS
  three-profile strategy, DEC-MOBREL-004 release ledger as durable
  evidence. Role files at `.agents/roles/operations.release-manager/`.

## Roles deferred (44)

### control guild

- control.run-router — routes runs across multiple workflows; deferred
  until the factory grows multi-workflow routing past the existing
  single-workflow pattern.
- control.budget-keeper — tracks token and time budget per role;
  deferred until observability volume warrants per-role accounting.
- control.escalation-broker — handles cross-guild escalations beyond
  the current escalate_to contract; deferred.
- control.run-archiver — moves completed runs into cold storage;
  deferred until factory.db grows past current scale.

### product guild

- product.requirements-clarifier — pre-spec ambiguity resolution;
  deferred until spec-writer hits more requirements ambiguity.
- product.priority-arbiter — ranks backlog items against capacity;
  deferred until backlog volume warrants a dedicated role.
- product.release-notes-author — drafts release notes for shipped
  scope; deferred until release cadence warrants the polish.

### research guild

- research.literature-scout — surfaces external research relevant to
  open spec items; deferred until spec volume warrants the scan.
- research.benchmark-curator — maintains a shared benchmark suite;
  deferred.
- research.eval-set-builder — builds eval sets per skill; deferred
  until the second skill graduates.

### design guild

- design.tokens-keeper — maintains the design token set in
  `apps/web/src/tokens.css` and the mobile equivalent; deferred until
  token drift warrants a role.
- design.flow-illustrator — produces flow diagrams for spec ledgers;
  deferred.
- design.accessibility-auditor — runs accessibility audits on the
  web and mobile surfaces; deferred until the second hosted release
  cycle.

### engineering guild

- engineering.architecture — full architecture review beyond the
  per-change DEC; deferred until system complexity warrants the role.
- engineering.refactor-runner — runs scheduled refactor passes;
  deferred.
- engineering.dependency-keeper — manages dependency upgrades; the
  pip-audit gate covers urgent CVEs in the meantime.
- engineering.migrations-author — handles database schema migrations;
  not yet relevant for this repo (no persistent database).
- engineering.observability-builder — wires structured logging and
  metrics; deferred until hosted volume warrants telemetry.
- engineering.qa-runner — runs the browser QA flows past the
  Playwright smoke; deferred (smoke covers the current scope).

### science guild

- science.eval-runner — runs LLM evals against skill outputs; deferred
  until the second skill graduates with passing_skill_eval.
- science.experiment-coordinator — runs A/B experiments on user-facing
  changes; deferred (no user telemetry yet).
- science.statistical-reviewer — reviews experiment results; deferred.

### security guild

- security.threat-modeler — runs threat-modeling passes on new
  surfaces; deferred (current bandit + pip-audit + gitleaks-style
  scans cover the baseline).
- security.secrets-rotator — rotates secrets on a cadence; deferred
  (manual rotation today; the repo carries no live keys in source).
- security.compliance-auditor — checks compliance against external
  frameworks; deferred (public learning lab, no compliance scope).

### operations guild

- operations.deploy-pilot — handles staged deploys to production;
  deferred (Vercel handles web deploy; EAS handles mobile).
- operations.canary-watcher — monitors canary releases; partially
  covered by the mobile-release workflow canary step.
- operations.incident-commander — leads incident response; partially
  covered by the incident-response workflow.
- operations.cost-keeper — tracks hosting and build cost; deferred.

### domain guild

- domain.scenario-curator — curates lab scenarios under
  packages/engine/src/data/scenarios.ts; deferred (current scenario
  set is stable).
- domain.mechanism-explainer — writes tutorial copy for new mechanisms;
  deferred (TUTORIAL surface is stable).
- domain.strategy-author — adds new participant strategies; deferred
  (current 10-strategy library covers the lab arcs).
- domain.bridge-author — adds new public-data bridges (chip-map,
  supplier-risk, etc.); deferred (current bridge set covers the demos).

### learning guild

- learning.memory-curator — promotes accepted dream candidates into
  long-term memory; deferred until the dream job ships its first
  output.
- learning.skill-author — extracts new skills from observed factory
  patterns; partially covered by dream-orchestrator's skill_extraction
  mode.
- learning.eval-harvester — pulls candidate eval cases from factory
  runs; deferred.
- learning.curriculum-maintainer — keeps the LEARN level curriculum
  current; deferred (Levels 1-11 are stable).

### documentation guild

- documentation.readme-keeper — updates root README on shipped scope;
  partially covered by the single-change workflow's release step.
- documentation.changelog-author — maintains CHANGELOG.md if the
  repo grows one; deferred (no changelog today; the release ledger
  serves the role).
- documentation.api-doc-author — drafts API docs for shared engine
  modules; deferred until the engine package opens an external API.
- documentation.tutorial-keeper — maintains TUTORIAL surface copy;
  partially covered by domain.mechanism-explainer when that role
  lands.
- documentation.runbook-author — drafts runbooks for incident
  response; deferred until the first real incident.
- documentation.archives-keeper — archives stale specs into
  specs/_legacy/; deferred (no stale specs yet).
- documentation.glossary-keeper — maintains the lab glossary at
  packages/engine/src/data/glossary.ts; deferred (glossary is stable).

## Tools deferred

The current registry covers what the six baseline roles need. Tools
land as roles need them; the per-tool allowed_roles list defends
against tool sprawl.

## Policies deferred

The six baseline policies (default-deny, voice-lint-blocks-publish,
dream-candidates-require-human, spec-check-blocks-merge,
factory-run-emits-events, mobile-e2e-requires-emulator) cover the
current enforcement surface. Policies land as enforcement gaps
appear.

## Workflows deferred

The four installed workflows (single-change, weekly-dream,
incident-response, mobile-release) cover the current set. A
data-bridge-refresh workflow may land later when the bridge set
grows; an eval-suite-run workflow may land with the second graduated
skill.
