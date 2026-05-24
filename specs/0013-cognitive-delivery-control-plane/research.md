# research: cognitive-delivery-control-plane

Research checked 2026-05-24.

- The CDCP framing came out of a synthesis pass across athena-site,
  ai-field-brief, and this repo. Specs were already gated here via
  `scripts/spec_check.py`; decisions were not. The factory subsystem
  under `scripts/factory/` already names workspace management, dual
  review, checkpoints, and trace IDs as a working pattern that earns
  graduation as a packaged skill.
- The cross-repo schemas under `athena-site/ops/schemas/` (artifact,
  decision, dream-output, run, skill, role, tool, policy) are the
  source of truth. This repo references them by URL and keeps a local
  cache under `ops/schemas-cache/` so CI runs offline.
- The ai-field-brief repo at `../ai-field-brief` shipped the base CDCP
  layer in commit `5b3b792`. That install is the worked pattern this
  spec mirrors. Procurement-lab installs the base layer plus the
  operating-model layer (roles, tools, policies, state-machines,
  workflows, CATALOG) in one pass because the repo is mature enough
  to land both.
- Anthropic's published guidance on agent skills (March 2026) frames
  a skill as instructions plus optional scripts and evals, graduated
  from observed practice. The `skill.schema.json` shape in athena-site
  follows that pattern. The first graduated skill in this repo is
  `run-factory-task`, packaging the orchestrator-worker pattern in
  `scripts/factory/`.
- The role/tool/policy schemas in athena-site mirror an OPA-shaped
  data layer: roles declare allowed_tools and required_gates, tools
  declare risk_level and requires_approval, policies are priority-sorted
  rules that the engine evaluates against a request. The structure is
  data, not code; a small Python evaluator can read it.
- The release-ledger discipline comes from the prior ai-field-brief
  install. This repo has 130-plus prior commits; the install backfills
  the 20 most recent through `646d989` (the hosted mobile e2e gradle
  blocker note) and the discipline forward from this pass records each
  new release.
- The reset-ledger pattern originated in this repo's audit-trail
  history; force-pushes get recorded in the same push so the trail
  survives the rewrite. ai-field-brief borrowed the shape; this install
  formalizes it here.
- The mobile-release workflow YAML is procurement-lab-specific: the
  EAS build profiles and Maestro flows under `apps/mobile/` and
  `.github/workflows/mobile-e2e.yml` are working infrastructure that
  the workflow describes, not new code.

## Why now

- Specs alone do not record why a path was chosen over alternatives.
  DEC files fill that gap. The 12 prior specs shipped 91 requirements
  without one DEC; that gap is the load-bearing argument.
- The factory subsystem in `scripts/factory/` already operates as a
  workspace manager with checkpoints and trace IDs. Graduating it as
  a packaged skill (and naming the tool that invokes it) makes the
  reuse path durable across coding agents.
- The mobile-release pass (spec 0012) just landed and exposed the gap
  between "we know how to ship mobile" and "the workflow that names
  the steps lives somewhere a coding agent can read." The
  `.agents/workflows/mobile-release.yaml` closes that gap.

## Alternatives considered

- Single ad-hoc `governance.md` file: skipped because it does not
  generate executable gates.
- Adopting a framework stack (LangGraph, CrewAI, Strands): skipped
  because frameworks turn over every six months; the records survive
  the framework. The factory already has an optional LangGraph router
  with a fallback; that is the right scope for framework adoption.
- A 12-screen control-plane SaaS: deferred until artifact volume
  warrants a UI layer beyond the markdown ledgers.
- Install the base layer first and the operating-model layer in a
  later pass (the ai-field-brief shape): rejected because this repo is
  mature enough that the cost of two installs over one is higher than
  the cost of one larger install. Backfill DECs are deferred either
  way; the operating-model layer is the only delta.

## Open questions

- When does the first dream output land for this repo? Likely after
  the first weekly brief cadence runs against this repo's run-ledger
  and factory artifacts; the agent contract will name the trigger.
- Do the 44 deferred roles land iteratively as needed, or as a single
  later pass? Iteratively. CATALOG.md tracks the TODO list.
- How do we handle dream candidates that propose changes to the
  factory itself? Treated as a skill patch against
  `.agents/skills/run-factory-task/`, gated by human review.
