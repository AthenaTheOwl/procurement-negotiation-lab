---
id: DEC-FACTORY-008-factory-run-evidence-cross-checks
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-RUN-EVIDENCE-007
date: 2026-05-28
status: approved
reversible: true
amends: DEC-FACTORY-007-factory-emits-conformant-run-evidence
decision: |
  The factory's run-evidence validator MUST enforce Run-level
  required-for-done fields plus four cross-checks that bind the Run
  record to the per-run event ledger. Done is the only Run status
  where these checks fire; runs in any other terminal state pass on
  the schema-only baseline. The validator at
  `scripts/validate_run_evidence.py` is the single enforcement point.

  Required-for-done fields (validator fails when any is missing or
  empty on a Run whose `status == "done"`): `prompt_snapshot_hash`,
  `tool_schemas_snapshot_hash`, `sandbox_image_ref`,
  `gate_results_summary`. The ledger must also carry at least one
  `gate.run.evidence_recorded` event for the run.

  Four cross-checks (each one is a hard failure):

  1. `Run.prompt_snapshot_hash` matches the `pipeline.start` event's
     `payload.prompt_snapshot_hash`.
  2. `Run.tool_schemas_snapshot_hash` matches the `pipeline.start`
     event's `payload.tool_schemas_snapshot_hash`.
  3. The `gate.run.evidence_recorded` event's
     `payload.fields_populated` matches (as sorted sets) the
     replay-equivalence fields the Run record carries.
  4. `Run.gate_results_summary` matches the scan of
     `gate.check.passed` / `gate.check.failed` events in the ledger
     (`gates_passed` and `gates_failed` are the sorted gate names;
     `all_passed` is `len(gates_failed) == 0`).
alternatives:
  - label: leave the validator on schema-only conformance
    rejected_because: |
      Schema validation catches shape violations but not internal
      inconsistency. The audit found cases where a Run record claimed
      one `prompt_snapshot_hash` while the same run's
      `pipeline.start` event recorded a different value. The schema
      accepts each record in isolation; without a cross-check the two
      can drift silently, which defeats the whole point of recording
      replay-equivalence hashes.
  - label: enforce the cross-checks only on packet generation
    rejected_because: |
      The downstream trace-to-eval consumer does enforce replay
      equivalence when it builds a packet, but that check fires at
      consumption time, not emission time. By the time a consumer
      finds a mismatch the producer has already shipped the bad
      ledger. The producer-side gate catches the divergence at the
      moment it is created, which is where the fix is cheap.
  - label: extend the Run schema with required fields instead of
      keeping the cross-check in the validator
    rejected_because: |
      The Run schema is owned by athena-site as a cross-repo
      contract. Requiring fields in the schema would force every
      consumer of `run.schema.json` to populate them, including
      consumers that have no factory pipeline (for example a
      hand-written run record from a benchmark runner). Keeping the
      enforcement local to the factory validator preserves the
      schema's permissiveness while still holding the factory to a
      stricter contract.
  - label: also enforce the cross-checks on `awaiting_approval` and
      `needs_review` runs
    rejected_because: |
      Mid-pipeline pause states do not yet have the full evidence
      record. The plan-review and diff-review checkpoints emit a
      Run record before the gate.check events fire on later
      resumes, so requiring a `gate_results_summary` at pause time
      would block the checkpoint flow. Restricting enforcement to
      `done` lets the validator gate the finished evidence without
      penalizing the pause shape.
rationale: |
  This DEC amends DEC-FACTORY-007. DEC-FACTORY-007 named the
  emission contract: factory writes a conformant ledger plus a
  conformant Run record on every pipeline run, with the schema cache
  as the single source of truth. After Round 2 amended athena-site's
  `event.schema.json` with typed per-event-type payloads (the
  athena-site reference is DEC-CDCP-013), the audit on this repo
  found three concrete drifts:

  - `tool.call.started` used `tool_id` where the typed payload schema
    requires `tool_name`.
  - `tool.call.completed` had the same `tool_id` divergence.
  - `pipeline.done` carried only `{pr_url: null}` and was missing
    the required `status` enum.

  The emitter fix is necessary but not sufficient: the same audit
  surfaced a separate inconsistency where the Run record's
  `prompt_snapshot_hash` did not match the `pipeline.start` event's
  hash because the two were computed from different inputs. That is a
  cross-record drift the schema cannot catch. DEC-FACTORY-008 closes
  that gap by naming the cross-checks explicitly and wiring them
  into `validate_run_evidence.py`. The validator becomes the source
  of truth for run-evidence discipline, the schemas remain the
  shape contract, and the two together make a complete fence.

  Restricting the cross-checks to `done` Runs keeps the existing
  pause flow (DEC-PLAY-002, DEC-FACTORY-002) honest: a pause-shaped
  Run record records what is known so far without the full final
  evidence. The discipline only applies to the terminal happy path
  where every replay-equivalence field is derivable.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: decision
    ref: decisions/DEC-FACTORY-007-factory-emits-conformant-run-evidence.md
  - kind: decision
    ref: https://github.com/AthenaTheOwl/athena-site/blob/main/decisions/DEC-CDCP-013-event-schema-typed-payloads.md
  - kind: doc
    ref: scripts/validate_run_evidence.py
  - kind: doc
    ref: scripts/factory/pipeline.py
  - kind: doc
    ref: tests/factory/test_validate_run_evidence.py
  - kind: run
    ref: ops/run-records/run-16a7bf515611.json
rollback: |
  Revert the `cross_check_done_runs` function plus its call site in
  `scripts/validate_run_evidence.py::main` so the validator falls
  back to schema-only conformance. Delete the
  `R-FACTORY-RUN-EVIDENCE-007..010` requirements from
  `specs/0009-factory-dev-control-plane/requirements.md` and the
  matching traceability rows. Roll back the emitter fixes in
  `scripts/factory/pipeline.py` (the `tool_name` / pipeline.done
  `status` / pipeline.done `gate_results_summary` edits) only if
  athena-site's `event.schema.json` is also rolled back to the
  un-typed payload shape — otherwise the ledger fails its own schema
  gate. Delete this DEC. No data migration is needed because the
  ledger and Run records are append-only audit trails.
owner: control.coordinator
---

## decision

The factory's run-evidence validator enforces Run-level
required-for-done fields plus four cross-checks that bind a Run
record to its per-run event ledger. The checks fire only on Runs
whose `status == "done"`. The validator at
`scripts/validate_run_evidence.py` is the single enforcement point;
DEC-FACTORY-007 named the emission contract, this DEC names the
discipline contract that backs it.

## alternatives

- Leave the validator on schema-only conformance: rejected because
  schema validation cannot catch cross-record drift between a Run
  record and its ledger.
- Enforce the cross-checks only on packet generation: rejected
  because catching drift at consumption time means the producer has
  already shipped the bad ledger; the cheap fix is at emission time.
- Extend the cross-repo Run schema instead: rejected because the
  schema is owned by athena-site for use by consumers that have no
  factory pipeline; the factory-specific discipline stays local.
- Enforce the checks on every Run status: rejected because pause
  states do not yet have the full evidence; restricting to `done`
  lets the validator gate finished evidence without breaking the
  checkpoint flow.

## rationale

This DEC amends DEC-FACTORY-007. The Round 2 amendment to
athena-site's `event.schema.json` added typed per-event-type payload
schemas. The audit on this repo found three concrete drifts in the
existing sample ledger plus a fourth cross-record drift between a
Run record's `prompt_snapshot_hash` and the `pipeline.start` event's
hash. The emitter fix closes the typed-payload drift; the validator
cross-checks close the cross-record drift. The two together make a
complete fence around run-evidence discipline.

## evidence

- `specs/0009-factory-dev-control-plane/requirements.md` adds the
  `R-FACTORY-RUN-EVIDENCE-007..010` requirements this DEC resolves.
- `decisions/DEC-FACTORY-007-factory-emits-conformant-run-evidence.md`
  is the parent DEC this one amends.
- `athena-site/decisions/DEC-CDCP-013-event-schema-typed-payloads.md`
  is the cross-repo source-of-truth for the typed payloads the
  cross-checks consume.
- `scripts/validate_run_evidence.py` is the enforcement point.
- `scripts/factory/pipeline.py` is the emitter that now produces
  cross-check-compatible records.
- `tests/factory/test_validate_run_evidence.py` covers the positive
  case plus a negative test per check.
- `ops/run-records/run-16a7bf515611.json` is the regenerated sample
  Run record that satisfies every cross-check.

## rollback

Revert `cross_check_done_runs` and its call site in
`scripts/validate_run_evidence.py::main` so the validator falls back
to schema-only conformance. Drop the
`R-FACTORY-RUN-EVIDENCE-007..010` requirements and traceability
rows. Roll back the emitter fixes only if athena-site's
`event.schema.json` is also rolled back; otherwise the ledger fails
its own schema gate. Delete this DEC. No data migration is needed
because the records are append-only audit trails.

## coverage

This DEC resolves the following requirements added to spec
`0009-factory-dev-control-plane`:

- `R-FACTORY-RUN-EVIDENCE-007` validator enforces required-for-done
  fields on every Run with `status == "done"`.
- `R-FACTORY-RUN-EVIDENCE-008` validator enforces that a done Run
  has at least one `gate.run.evidence_recorded` event in the
  ledger.
- `R-FACTORY-RUN-EVIDENCE-009` validator enforces the two
  pipeline.start hash cross-checks
  (`prompt_snapshot_hash`,
  `tool_schemas_snapshot_hash`) plus the
  `fields_populated` set-equality cross-check.
- `R-FACTORY-RUN-EVIDENCE-010` validator enforces that
  `Run.gate_results_summary` matches the scan of
  `gate.check.passed` / `gate.check.failed` events in the ledger.
