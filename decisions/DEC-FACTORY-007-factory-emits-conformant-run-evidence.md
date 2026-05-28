---
id: DEC-FACTORY-007-factory-emits-conformant-run-evidence
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-RUN-EVIDENCE-001
date: 2026-05-27
status: approved
reversible: true
decision: |
  The factory pipeline MUST emit a conformant Event ledger plus a final
  Run record on every pipeline run, with the replay-equivalence fields
  populated where derivable. The ledger lands at
  `ops/event-ledger/<run-id>.jsonl` and the Run record lands at
  `ops/run-records/<run-id>.json`; both conform to the cached
  cross-repo schemas mirrored from athena-site under
  `ops/schemas-cache/`. The validator gate at
  `scripts/validate_run_evidence.py` walks both directories on every
  test run and exits non-zero on schema violations.
alternatives:
  - label: continue with only the SQLite event store
    rejected_because: |
      The existing SQLite store in `scripts/factory/state.py` is opaque
      to cross-repo consumers. The amendment to `run.schema.json` in
      athena-site (DEC-CDCP-011) added six replay-equivalence fields
      precisely so downstream packet generators like the sibling repo
      can read a run-evidence packet without grepping a database.
      Without an emitter that writes the new schema fields, the schema
      fields are dead letters and the bridge between agents and
      engineering-grade trust does not exist.
  - label: emit only the Run record, skip the per-step JSONL ledger
    rejected_because: |
      A Run record alone records the rollup but not the timeline. The
      packet generator needs gate.check.*, tool.call.*, and
      checkpoint.paused events to populate gate_results, tool_calls,
      and approval_events in the run-evidence packet defined by the
      sibling repo's `schemas/run-evidence.schema.json`. The ledger is
      the source of those events.
  - label: populate all six replay-equivalence fields including
      determinism and checkpoint_ref
    rejected_because: |
      The factory shells out to `claude` and `codex` CLIs that do not
      expose seed, temperature, or top_p knobs, so the determinism
      object has no derivable values today. The managed-task-runtime
      checkpoint store (addendum-6) has not landed yet, so there is no
      checkpoint to reference. Populating those fields with placeholder
      values would lie about replay equivalence. The schema treats
      absence as "not derivable", which is the honest record.
rationale: |
  This is the emission slice of the larger managed-task-runtime
  upgrade. The amendment that added the six replay-equivalence fields
  to the Run schema (DEC-CDCP-011 in athena-site, commit f314fd7)
  named the contract. Codex's commit bfd1d48 in the sibling
  trace-to-eval consumer repo shipped the consumer side: a
  `run-evidence.schema.json` packet format plus a
  `trace-to-eval evidence from-cdcp-events` CLI that reads a CDCP
  event log and produces a packet. The missing piece was the emitter
  that writes the new schema fields in the first place.

  Without this DEC the schema fields stay dead letters: the producer
  side never writes them, the consumer side has nothing to read.
  Naming the bridge in writing also makes it explicit which fields
  the factory can derive today (the two hashes, the worktree-pinned
  sandbox ref, the gate rollup) versus which ones wait for the
  addendum-6 work (determinism knobs, checkpoint refs).

  Keeping the emitter reversible via a task-level flag and the
  validator gate (gates can be relaxed for emergency commits) means
  the discipline is opt-out by intent, not opt-in by accident.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: decision
    ref: https://github.com/AthenaTheOwl/athena-site/blob/main/decisions/DEC-CDCP-011-run-schema-replay-equivalence-fields.md
  - kind: doc
    ref: src/procurement_lab/run_evidence.py
  - kind: doc
    ref: scripts/factory/pipeline.py
  - kind: doc
    ref: scripts/validate_run_evidence.py
  - kind: doc
    ref: ops/schemas-cache/run.schema.json
  - kind: doc
    ref: ops/schemas-cache/event.schema.json
rollback: |
  Remove the `_RunEvidence` ledger calls from
  `scripts/factory/pipeline.py` (revert commit cbc02d4), drop the
  validator from `.github/workflows/tests.yml` and from
  `scripts/spec_check.py`'s `REQUIRED_WORKFLOW_PROOFS`, delete
  `scripts/validate_run_evidence.py` and
  `src/procurement_lab/run_evidence.py`, then delete the
  `R-FACTORY-RUN-EVIDENCE-*` requirements from the spec ledger and
  remove this DEC. The cached schemas under `ops/schemas-cache/` stay
  because other validators still need them. No data migration is
  needed because the ledger and record files are append-only audit
  trails with no foreign-key fan-out.
owner: control.coordinator
---

## decision

The factory pipeline emits a conformant Event ledger plus a final Run
record on every pipeline run, with the six replay-equivalence fields
populated where derivable. The ledger lands at
`ops/event-ledger/<run-id>.jsonl`; the Run record lands at
`ops/run-records/<run-id>.json`. A validator gate enforces conformance
to the cross-repo schemas on every test run.

## alternatives

- Continue with only the SQLite event store: rejected because the
  SQLite store is opaque to cross-repo consumers and the new schema
  fields would never be written.
- Emit only the Run record and skip the ledger: rejected because the
  packet generator needs the timeline to populate gate, tool, and
  approval lists.
- Populate all six fields including determinism and checkpoint_ref:
  rejected because the factory shells out to CLIs that do not expose
  sampler knobs and the checkpoint store does not exist yet; the
  schema treats absence as "not derivable".

## rationale

DEC-CDCP-011 in athena-site amended `run.schema.json` with six
replay-equivalence fields. Codex's commit `bfd1d48` in the sibling
consumer repo shipped the consumer side: a
`run-evidence.schema.json` packet format and a
`trace-to-eval evidence from-cdcp-events` CLI. Without an emitter
that populates the new schema fields, the fields are dead letters and
the bridge between agents and engineering-grade trust does not exist.
This DEC names the bridge.

## evidence

- `specs/0009-factory-dev-control-plane/requirements.md` lists the
  `R-FACTORY-RUN-EVIDENCE-*` requirements this DEC resolves.
- `athena-site/decisions/DEC-CDCP-011-run-schema-replay-equivalence-fields.md`
  records the source-of-truth schema amendment.
- `src/procurement_lab/run_evidence.py` is the emitter module.
- `scripts/factory/pipeline.py` wires the emitter into the state
  machine.
- `scripts/validate_run_evidence.py` is the validator gate.
- `ops/schemas-cache/run.schema.json` and
  `ops/schemas-cache/event.schema.json` mirror the cross-repo
  contract.

## rollback

Revert the pipeline changes, remove the validator gate from the
workflow and from `spec_check.py`'s `REQUIRED_WORKFLOW_PROOFS`,
delete `scripts/validate_run_evidence.py` and
`src/procurement_lab/run_evidence.py`, then delete the
`R-FACTORY-RUN-EVIDENCE-*` requirements and remove this DEC. The
cached schemas stay because other validators still need them. No
migration is needed because the ledger files are append-only audit
trails with no fan-out.

## coverage

This DEC resolves the following requirements added to spec
`0009-factory-dev-control-plane`:

- `R-FACTORY-RUN-EVIDENCE-001` factory emits a conformant Event
  ledger to `ops/event-ledger/<run-id>.jsonl` on every run.
- `R-FACTORY-RUN-EVIDENCE-002` factory emits a conformant Run record
  to `ops/run-records/<run-id>.json` on completion.
- `R-FACTORY-RUN-EVIDENCE-003` `prompt_snapshot_hash` and
  `tool_schemas_snapshot_hash` are always populated.
- `R-FACTORY-RUN-EVIDENCE-004` `sandbox_image_ref` is populated when
  a worktree exists.
- `R-FACTORY-RUN-EVIDENCE-005` `gate_results_summary` is populated by
  aggregating `gate.check.*` events.
- `R-FACTORY-RUN-EVIDENCE-006` `validate_run_evidence.py` runs on
  every push to main and exits non-zero on schema violations.
