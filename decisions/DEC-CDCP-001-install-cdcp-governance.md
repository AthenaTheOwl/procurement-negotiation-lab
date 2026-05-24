---
id: DEC-CDCP-001-install-cdcp-governance
spec: specs/0013-cognitive-delivery-control-plane/
requirement: R-CDCP-001
date: 2026-05-24
status: approved
reversible: true
decision: |
  Install the Cognitive Delivery Control Plane governance scaffold in
  this repo in a single pass: the base layer (.agents/AGENTS.md,
  decisions/, dreams/, ops/RELEASE_LEDGER.md, ops/RESET_LEDGER.md,
  ops/schemas-cache/, scripts/validate_decisions.py, the spec_check
  extension) plus the operating-model layer (six baseline roles,
  central tools registry, six baseline policies, three state machines,
  four workflows, the deferred-roles catalog, and three more
  validators). Every R-* requirement from specs 0001-0012 lands in
  decisions/.spec-check-allowlist.yaml as deferred; backfill DECs ship
  in later passes, cluster by cluster.
alternatives:
  - label: install only the base layer now and the operating-model layer later
    rejected_because: |
      The ai-field-brief repo took the staged path because that repo
      is younger. This repo carries 12 specs, 91 requirements, a
      working factory orchestrator under scripts/factory/, mobile
      release infrastructure, and a fully wired CI matrix. The cost
      of two separate installs (two scaffolding passes, two backfill
      planning passes, two doc updates) is higher than the cost of
      one larger install. Backfill DECs are deferred either way.
  - label: backfill DECs for every prior R-* in this pass
    rejected_because: |
      Writing 91 decision records in one pass produces shallow records
      that record what someone could reconstruct from a commit log,
      not what was weighed at the time. Backfilling iteratively, one
      cluster at a time, lets each DEC name real alternatives and
      real rationale. The allowlist makes the deferral explicit and
      enforceable.
  - label: adopt a framework stack (LangGraph, CrewAI, Strands)
    rejected_because: |
      Frameworks turn over every six months. The records (specs,
      decisions, traces, ledgers, tests, evals, deployment evidence)
      survive the framework. The factory subsystem already has an
      optional LangGraph router with a built-in fallback; that is the
      right scope for framework adoption. Wholesale framework
      commitment changes no behavior the gates check.
  - label: build a 12-screen control-plane SaaS
    rejected_because: |
      Premature. Markdown ledgers plus executable gates cover the
      audit-trail and human-review needs at current artifact volume.
      A UI layer over the ledgers lands when volume warrants it; not
      now.
rationale: |
  The CDCP framing names the records the team already builds (specs,
  releases, run ledgers, factory artifacts) and adds the records the
  team did not (decisions, roles, tools, policies, state machines,
  workflows, dreams). Installing the full scaffold in one pass keeps
  the records consistent from the start and turns the discipline into
  executable gates: validate_decisions, validate_roles, validate_tools,
  validate_policies, and the extended spec_check fail builds when
  records drift out of shape.

  The operating-model layer matters now because the factory subsystem
  is the de facto workspace manager and earns naming as a packaged
  skill plus a role contract. The mobile-release workflow names the
  existing EAS profiles + Maestro flow + CI matrix so a coding agent
  can read the steps in one place.

  The allowlist defers 91 prior R-* IDs to later passes so this commit
  scaffolds the system without paper-thin backfill records.
evidence:
  - kind: spec
    ref: specs/0013-cognitive-delivery-control-plane/
  - kind: doc
    ref: https://raw.githubusercontent.com/AthenaTheOwl/athena-site/main/ops/control-plane.md
  - kind: doc
    ref: https://raw.githubusercontent.com/AthenaTheOwl/athena-site/main/ops/schemas/decision.schema.json
  - kind: doc
    ref: https://raw.githubusercontent.com/AthenaTheOwl/athena-site/main/ops/schemas/role.schema.json
  - kind: doc
    ref: https://raw.githubusercontent.com/AthenaTheOwl/athena-site/main/ops/schemas/tool.schema.json
  - kind: doc
    ref: https://raw.githubusercontent.com/AthenaTheOwl/athena-site/main/ops/schemas/policy.schema.json
  - kind: decision
    ref: ../ai-field-brief/decisions/DEC-CDCP-001-install-cdcp-governance.md
rollback: |
  Delete this commit. The added directories (.agents/, decisions/,
  dreams/, ops/RELEASE_LEDGER.md, ops/RESET_LEDGER.md,
  ops/schemas-cache/, ops/event-log/, specs/0013-*/) and the four
  validator scripts (scripts/validate_decisions.py,
  scripts/validate_roles.py, scripts/validate_tools.py,
  scripts/validate_policies.py) can be removed wholesale. The
  scripts/spec_check.py extension can be reverted to drop the CDCP
  prefix and the DEC-coverage rule; the prior shape still works. The
  existing scripts/factory/ subsystem, the existing ops/run-ledger.md,
  and every ops/factory-* artifact stay untouched and keep operating.
  No data loss: the cross-repo schemas remain in athena-site, and the
  prior R-* IDs in the allowlist record what work is still pending.
owner: platform
---

## decision

Install the Cognitive Delivery Control Plane governance scaffold in
procurement-negotiation-lab in a single pass. The scaffold adds the
base layer (`.agents/AGENTS.md`, `decisions/`, `dreams/`, the two ops
ledgers, the schemas cache, `scripts/validate_decisions.py`, and the
spec_check extension) plus the operating-model layer (six baseline
role contracts, central tool registry, six baseline policies, three
state machines, four workflows, the deferred-roles catalog, and three
more validator scripts). Every R-* requirement from specs 0001-0012
lands in `decisions/.spec-check-allowlist.yaml` as deferred; backfill
DECs ship in later passes, cluster by cluster.

## alternatives

- Install base layer now and operating-model layer later — staged
  install costs more than one pass for a repo this mature.
- Backfill DECs for every prior R-* in this pass — would produce 91
  shallow records.
- Framework stack (LangGraph, CrewAI, Strands) — turns over every six
  months; the records survive the framework.
- 12-screen control-plane SaaS — premature at current artifact volume.

## rationale

Installing the full scaffold in one pass keeps the records consistent
and turns the discipline into executable gates. The operating-model
layer earns inclusion now because the factory subsystem already
operates as a workspace manager and the mobile-release infrastructure
already operates as a release path; both deserve named contracts a
coding agent can read in one place.

## evidence

- `specs/0013-cognitive-delivery-control-plane/` — the spec ledger
  this DEC resolves.
- The cross-repo charter and the four schemas referenced in the
  front-matter.
- `../ai-field-brief/decisions/DEC-CDCP-001-install-cdcp-governance.md`
  — the worked pattern from the sibling repo.

## rollback

Delete this commit. Remove the added directories and validator
scripts wholesale. Revert `scripts/spec_check.py` to drop the CDCP
prefix and the DEC-coverage rule. The existing factory subsystem and
the existing ops/run-ledger.md stay untouched. No data loss: the
cross-repo schemas remain in athena-site, and the allowlist records
what backfill is still pending.
