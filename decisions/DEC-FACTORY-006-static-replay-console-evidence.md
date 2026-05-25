---
id: DEC-FACTORY-006-static-replay-console-evidence
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-006
date: 2026-05-25
status: approved
reversible: true
decision: |
  Render the Factory console as a static replay surface in the web app.
  It reads a checked-in fixture plus SDK RunReport data and never starts
  agents, reads the local SQLite store, or calls a backend from the
  browser.
alternatives:
  - label: live orchestration backend
    rejected_because: |
      A hosted backend would need auth, process supervision, queue state,
      and a threat model for agent execution. The requested slice is a
      console MVP that makes existing factory evidence readable in the
      app without changing the runtime boundary.
  - label: browser reads local SQLite and artifact files
    rejected_because: |
      The hosted web app cannot read a developer machine's SQLite store
      or ignored artifact tree. Adding file handles or upload flows would
      expand the product surface beyond the static evidence view.
  - label: fold factory evidence into the run-report page
    rejected_because: |
      `ReportSurface` is scoped to procurement mechanism run reports.
      Factory evidence has task state, checkpoints, worker metadata, and
      artifact refs, so it needs a separate console route.
rationale: |
  Static replay gives users a real view of the factory pattern while
  keeping the hosted app deterministic and dependency-free. Using the
  SDK RunReport type for report data keeps the replay tied to the same
  schema the rest of the app already uses, and a fixture keeps tests
  stable without browser-side worker execution.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: doc
    ref: docs/factory.md
  - kind: doc
    ref: scripts/factory/README.md
  - kind: doc
    ref: packages/engine/src/model/runReportSchema.ts
rollback: |
  Remove the `#/factory` route from `apps/web/src/App.tsx`, delete
  `apps/web/src/surfaces/factory/`, and remove the home navigation
  entry. Then delete R-FACTORY-006 from the spec files and remove this
  DEC. No migration is needed because the console stores no user data
  and writes no browser state.
owner: control
---

## decision

Render the Factory console as a static replay surface in the web app.
It reads a checked-in fixture plus SDK `RunReport` data and never starts
agents, reads the local SQLite store, or calls a backend from the
browser.

## alternatives

- Live orchestration backend: rejected because it needs auth, process
  supervision, queue state, and a threat model for agent execution.
- Browser reads local SQLite and artifact files: rejected because the
  hosted app cannot read a developer machine's ignored factory store.
- Fold factory evidence into the run-report page: rejected because
  mechanism reports and factory task evidence have different state
  models.

## rationale

Static replay gives users a real view of the factory pattern while
keeping the hosted app deterministic and dependency-free. Using the SDK
`RunReport` type keeps report data tied to the schema the rest of the
app already uses, and a fixture keeps tests stable without browser-side
worker execution.

## evidence

- `specs/0009-factory-dev-control-plane/requirements.md` - R-FACTORY-006.
- `docs/factory.md` - artifact refs and checkpoint interrupts.
- `scripts/factory/README.md` - trace IDs, worker metadata, and sample
  task flow.
- `packages/engine/src/model/runReportSchema.ts` - `RunReport` schema.

## rollback

Remove the `#/factory` route from `apps/web/src/App.tsx`, delete
`apps/web/src/surfaces/factory/`, and remove the home navigation entry.
Then delete R-FACTORY-006 from the spec files and remove this DEC. No
migration is needed because the console stores no user data and writes
no browser state.
