---
id: DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-RUN-EVIDENCE-015
date: 2026-05-29
status: approved
reversible: true
amends: DEC-FACTORY-009-factory-replay-command
decision: |
  The factory pipeline emits the portable repo:// and artifact:// URI
  scheme defined in athena-site DEC-CDCP-014 for every cross-repo
  reference written into run-evidence artifacts. The validator and
  replay command resolve repo:// URIs to local filesystem paths and
  accept the legacy ``<path>@<sha>`` form during the migration window.

  Three call sites flip on the producer side:

  1. ``workspace_id`` becomes the bare repo name
     (``procurement-negotiation-lab``) instead of an absolute Windows
     path. The field is a workspace identifier, not a file ref, so a
     short logical name routes cross-repo packet consumers without
     parsing per-checkout paths.
  2. ``inputs[].ref`` becomes
     ``repo://procurement-negotiation-lab@<sha>/<rel-path>`` where
     ``<sha>`` is the worktree HEAD at emit time and ``<rel-path>`` is
     the POSIX-form path of the input file relative to the repo root.
     A fallback to the raw spec path covers callers without a
     derivable SHA so tests that pass logical paths keep working.
  3. ``sandbox_image_ref`` becomes
     ``repo://procurement-negotiation-lab@<sha>/`` (no trailing path —
     the field points at the repo root). The emitter writes the
     ``repo://procurement-negotiation-lab@PENDING/`` placeholder; a
     post-commit step (``scripts/finalize_sandbox_ref.py``) rewrites
     the placeholder to the actual sample-containing SHA after that
     commit lands.

  The two-pass emit (Option A) is the chosen fix for the systemic
  off-by-one bug. ``git rev-parse HEAD`` at emit time resolves to the
  PARENT of the commit that ultimately writes the sample to disk; all
  four Round 5 agents independently caught and patched this for a
  single sample. Option A makes the fix structural: the emitter writes
  PENDING, the finalize helper rewrites to the real SHA, and replay's
  HEAD-strict check is satisfiable on first emit.

  ``scripts/finalize_sandbox_ref.py`` is the post-commit helper. It
  accepts ``--run-id`` (required) and ``--sha`` (defaults to
  ``git rev-parse HEAD``), reads the Run record, swaps the PENDING
  placeholder for the final URI, and is idempotent — records that
  already carry a finalized URI are left untouched.

  On the consumer side, ``scripts/validate_run_evidence.py`` and
  ``scripts/replay_run.py`` each grow a ``resolve_uri(uri,
  portfolio_root)`` helper with identical semantics:

  - ``repo://<repo>@<sha>/<path>`` resolves to
    ``<portfolio_root>/<repo>/<path>``; the ``<sha>`` is advisory
    metadata.
  - ``artifact://<repo>/<id>`` returns ``None`` (logical refs are
    not file paths).
  - Anything else returns ``Path(uri)`` unchanged, keeping the
    consumers tolerant of pre-DEC-FACTORY-010 ledgers.

  ``replay_run._extract_recorded_sha`` parses the URI's ``<sha>``
  group first and falls through to the legacy ``<path>@<sha>``
  parser; a PENDING placeholder is a hard error with an actionable
  message pointing the operator at the finalize helper.
alternatives:
  - label: Option B — defer Run-record emission until after the regeneration commit
    rejected_because: |
      The cleanest deterministic flow would commit the sample, then
      emit the Run record referencing the just-landed SHA. The cost
      is a substantially more complex regenerate wrapper: the
      pipeline currently writes the Run record at terminal pipeline
      state, before the commit boundary. Restructuring that to
      delay emission across a commit boundary touches the pipeline
      state machine, the validator's terminal-event contract, and
      the replay framing. Option A's two-pass flow keeps the
      emitter unchanged in shape and isolates the fix to one
      dedicated helper that runs after the commit lands.
  - label: Option C — single-pass with a post-edit at end of regeneration script
    rejected_because: |
      The single-pass version would have the regeneration script
      defer writing the Run record until it knows the final SHA.
      That requires the script to read the just-emitted Run record
      back from disk, edit it, and re-write it — the same shape as
      Option A but with the edit inlined into the regeneration
      flow. It does not generalize: a future regenerate caller that
      forgets the post-edit silently goes back to the off-by-one
      bug. The PENDING placeholder + dedicated finalize helper is
      explicit about what the fix is and where it runs.
  - label: keep the legacy ``<abs-path>@<sha>`` form for sandbox_image_ref
    rejected_because: |
      The legacy form bakes a per-machine absolute Windows path into
      the run-evidence packet. Cross-repo consumers (athena-site
      tooling, the trace-to-eval consumer, etc.) cannot use that path
      without knowing the producing operator's checkout layout.
      DEC-CDCP-014 makes repo:// the portable canonical form. The
      migration cost is one round of regeneration plus the URI
      resolver helpers; the payoff is portable packets.
  - label: leave ``workspace_id`` as a filesystem path
    rejected_because: |
      ``workspace_id`` is documented as a workspace identifier, not
      a file ref. The amended Run schema's free-form string allows
      either, but routing on a logical name is robust where routing
      on a path is brittle (different operators have different
      drive letters; CI runners use different mount points). The
      bare repo name is the smallest honest identifier.
rationale: |
  This DEC amends DEC-FACTORY-009. DEC-FACTORY-007 named the
  emission contract; DEC-FACTORY-008 named the cross-check
  discipline; DEC-FACTORY-009 shipped the replay command. This DEC
  closes two systemic issues that surfaced once replay started
  exercising the recorded artifacts end-to-end:

  1. Cross-repo packet consumers cannot use ``<abs-path>@<sha>``
     refs because the path component is per-operator. DEC-CDCP-014
     lands the portable URI scheme; this DEC migrates the procurement
     factory emitter onto it.
  2. The recorded ``sandbox_image_ref`` SHA was always one commit
     behind the commit that contained the sample. Round 5
     agents kept patching this per-sample; the structural fix is the
     two-pass emit (PENDING + finalize) so replay's HEAD-strict gate
     can be satisfied on first emit without manual SHA backfill.

  Reversibility costs are small. The URI shape can be toggled back by
  a single revert (the emitter still derives the legacy form via
  ``Path.as_posix() + '@' + head``). The finalize helper is additive
  and idempotent: a record that already carries a finalized URI is
  skipped, so re-running the helper after a true HEAD update produces
  no churn. The validator and replay still accept the legacy form,
  so any older committed sample stays readable until the operator
  chooses to regenerate it.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: decision
    ref: decisions/DEC-FACTORY-009-factory-replay-command.md
  - kind: doc
    ref: src/procurement_lab/run_evidence.py
  - kind: doc
    ref: scripts/factory/pipeline.py
  - kind: doc
    ref: scripts/validate_run_evidence.py
  - kind: doc
    ref: scripts/replay_run.py
  - kind: doc
    ref: scripts/finalize_sandbox_ref.py
  - kind: run
    ref: ops/run-records/run-960d6b107160.json
  - kind: artifact
    ref: ops/event-ledger/run-960d6b107160.jsonl
rollback: |
  Revert the four engineering commits (emitter migration, validator +
  replay resolver, regenerated sample, finalize) in reverse order.
  Delete ``scripts/finalize_sandbox_ref.py`` and the
  ``R-FACTORY-RUN-EVIDENCE-015..018`` requirements + traceability
  rows. Restore the legacy ``run-16a7bf515611`` sample from history
  if downstream tooling still keys off that run-id. No data migration
  is needed because the records are append-only audit trails; the
  validator and replay already accept both URI forms, so a partial
  rollback to a mix of legacy and new sample files is also safe.
owner: control.coordinator
---

## decision

The procurement-negotiation-lab factory pipeline emits the portable
repo:// and artifact:// URIs defined in DEC-CDCP-014 for every
cross-repo reference written into run-evidence artifacts. The
validator and replay command resolve repo:// URIs to local paths and
accept the legacy ``<path>@<sha>`` form during the migration window.

Three producer-side flips: ``workspace_id`` is the bare repo name,
``inputs[].ref`` is a repo:// URI carrying the worktree-HEAD SHA, and
``sandbox_image_ref`` is a repo:// URI starting as a PENDING
placeholder that ``scripts/finalize_sandbox_ref.py`` rewrites after
the sample-containing commit lands.

The two-pass emit (Option A) is the structural fix for the systemic
off-by-one bug: ``git rev-parse HEAD`` at emit time resolves to the
PARENT of the sample-containing commit. PENDING + finalize closes
that gap.

## alternatives

- Option B (defer Run-record emission past the regeneration commit):
  rejected because it restructures the pipeline state machine and
  the validator's terminal-event contract for one bug; Option A
  isolates the fix to one helper.
- Option C (single-pass with post-edit in the regen script):
  rejected because it does not generalize — a future caller that
  forgets the post-edit silently regresses to the off-by-one bug.
- Keep the legacy ``<abs-path>@<sha>`` form: rejected because the
  path component is per-operator and breaks cross-repo packet
  consumers.
- Leave ``workspace_id`` as a filesystem path: rejected because the
  field is documented as a workspace identifier, and a logical name
  routes more robustly than a path.

## rationale

This DEC amends DEC-FACTORY-009. The replay command surfaced two
systemic issues once it started exercising recorded artifacts
end-to-end: cross-repo consumers cannot use per-operator paths, and
the recorded sandbox SHA was always one commit behind the
sample-containing commit. DEC-CDCP-014 lands the portable URI
scheme; this DEC migrates the procurement factory emitter onto it
and applies the two-pass off-by-one fix at the same time so replay's
HEAD-strict gate is satisfiable on first emit.

## evidence

- ``specs/0009-factory-dev-control-plane/requirements.md`` adds the
  ``R-FACTORY-RUN-EVIDENCE-015..018`` requirements this DEC resolves.
- ``decisions/DEC-FACTORY-009-factory-replay-command.md`` is the
  parent DEC.
- ``src/procurement_lab/run_evidence.py`` carries the URI helpers
  (``build_repo_uri``, ``build_artifact_uri``, ``resolve_uri``,
  ``extract_repo_uri_sha``, ``is_repo_uri``,
  ``SANDBOX_PENDING_PLACEHOLDER``).
- ``scripts/factory/pipeline.py`` wires the URI emission into the
  Run record assembly.
- ``scripts/validate_run_evidence.py`` and ``scripts/replay_run.py``
  carry the consumer-side ``resolve_uri`` helper.
- ``scripts/finalize_sandbox_ref.py`` is the post-commit step that
  rewrites the PENDING placeholder.
- ``ops/run-records/run-960d6b107160.json`` and
  ``ops/event-ledger/run-960d6b107160.jsonl`` are the regenerated
  sample written under the new contract.

## rollback

Revert the four engineering commits in reverse order, delete the
finalize helper, drop the ``R-FACTORY-RUN-EVIDENCE-015..018``
requirements and traceability rows, and restore the legacy sample
from history if downstream tooling still keys off it. The validator
and replay already accept both URI forms, so a partial rollback to a
mix of legacy and new sample files is safe.

## coverage

This DEC resolves the following requirements added to spec
``0009-factory-dev-control-plane``:

- ``R-FACTORY-RUN-EVIDENCE-015`` factory emitter produces repo:// URIs
  per DEC-CDCP-014 for ``workspace_id``, ``inputs[].ref``, and
  ``sandbox_image_ref``.
- ``R-FACTORY-RUN-EVIDENCE-016`` validator resolves repo:// URIs to
  local paths via a ``resolve_uri`` helper and accepts both URI
  and legacy forms.
- ``R-FACTORY-RUN-EVIDENCE-017`` replay command resolves repo:// URIs
  via the same helper and extracts the sandbox SHA from the URI's
  ``<sha>`` group with a legacy fallback.
- ``R-FACTORY-RUN-EVIDENCE-018`` factory's sandbox_image_ref
  off-by-one fix lands via ``scripts/finalize_sandbox_ref.py`` and
  the PENDING placeholder shape.
