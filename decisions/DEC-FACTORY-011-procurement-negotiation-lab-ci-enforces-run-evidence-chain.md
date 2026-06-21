---
id: DEC-FACTORY-011-procurement-negotiation-lab-ci-enforces-run-evidence-chain
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-RUN-EVIDENCE-019
date: 2026-05-29
status: approved
reversible: true
amends: DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration
decision: |
  The procurement-negotiation-lab CI enforces the run-evidence gate
  chain locked by athena-site DEC-CDCP-015 on every pull request and
  every push to ``main``. A new workflow at
  ``.github/workflows/run-evidence-gates.yml`` adds the product-side
  gates that bind the canonical sample to the trace-to-eval consumer:

  1. ``packet-generation-from-canonical-sample`` checks the
     ``AthenaTheOwl/trace-to-eval-harness`` repo out as a sibling, <!-- voice_lint:allow banned-harness -->
     pip-installs it, and runs ``python -m trace_to_eval evidence
     from-cdcp-events ops/event-ledger/run-960d6b107160.jsonl --out
     /tmp/packet.json --portfolio-root <workspace>`` against the
     canonical ledger. The ``--portfolio-root`` flag points at the
     GitHub workspace so trace-to-eval can resolve ``repo://`` URIs
     to sibling checkouts.
  2. ``packet-validation`` runs ``python -m trace_to_eval evidence
     validate /tmp/packet.json`` against the trace-to-eval v2-1
     run-evidence schema.
  3. ``replay-smoke`` extracts the 40-char sandbox SHA from
     ``ops/run-records/run-960d6b107160.json``'s ``sandbox_image_ref``
     repo:// URI, checks that SHA out, restores the HEAD-finalized Run
     record into the worktree (because the recorded SHA is the
     PENDING-emit commit per the DEC-FACTORY-010 two-pass flow), and
     runs ``python scripts/replay_run.py --run-id run-960d6b107160``.
     A non-equivalent replay or a missing SHA exits the gate red.

  The existing ``tests.yml`` workflow already enforces the universal
  gates (schema-cache-freshness, voice-lint, bom-check, spec-check,
  decisions-validation, typed-event-payload-validation, language-test
  runner) on the same triggers. No contract gate carries
  ``continue-on-error: true`` or an ``if: ${{ failure() }}`` informational
  shape. No path filters hide gate failures. No ``--no-verify`` bypass
  is configured anywhere in the workflow.

  The canonical sample for replay smoke is ``run-960d6b107160``; the
  workflow has only one matrix slot because the lab carries one
  finalized sample at a time.
alternatives:
  - label: extend tests.yml in place with the new product-only gates
    rejected_because: |
      tests.yml already covers the universal gates and runs the
      Python language test runner under ``uv``. Adding the
      trace-to-eval sibling checkout, the ``git checkout
      <sandbox-sha>`` step, and the worktree dance inline would
      conflate two concerns and force the universal gates to wait on
      a sibling-repo install. A dedicated workflow keeps the
      replay-smoke setup isolated so the universal gates fail fast on
      their own runner while the product-side chain runs in parallel.
  - label: skip replay-smoke in CI and rely on the local replay
      command for evidence
    rejected_because: |
      DEC-CDCP-015 names replay-smoke as a load-bearing gate. The
      whole point of recording ``sandbox_image_ref`` and the three
      replay-equivalence hashes is to prove that the recorded SHA is
      reachable and replays cleanly on a fresh runner. Without CI
      enforcement the contract is aspirational; the divergence we are
      guarding against (recorded SHA points at a missing commit, or
      replay diverges silently) only surfaces in CI runs, not in
      local development.
  - label: keep packet generation as a downstream consumer concern
    rejected_because: |
      The trace-to-eval consumer reads packets, but the producer
      side (this lab) owns the contract that the canonical ledger
      generates a valid packet. Catching a malformed ledger at
      producer CI fails fast at the moment the bad ledger lands;
      catching it at consumer CI ships a broken artifact and lets
      every downstream consumer trip over it.
  - label: rebuild the run record via the finalize helper inside CI
      instead of restoring the HEAD copy after checkout
    rejected_because: |
      The finalize helper rewrites the PENDING placeholder to a SHA
      passed in by the operator. Re-running it inside CI would have
      to pass the recorded SHA back in, which is exactly the value we
      just extracted from the HEAD record. Copying the HEAD record
      into ``/tmp`` before checkout and restoring it after is one
      ``cp`` either side of ``git checkout`` and avoids reproducing
      the finalize helper's argument plumbing inside the workflow.
rationale: |
  This DEC amends DEC-FACTORY-010. DEC-FACTORY-007 named the run-evidence
  emission contract, DEC-FACTORY-008 added the cross-checks, DEC-FACTORY-009
  shipped the replay command, and DEC-FACTORY-010 made the URI scheme
  portable. The remaining gap is CI enforcement: every gate in the chain
  runs locally and ships green, but ``main`` accepts a PR whose
  trace-to-eval packet would not validate, or whose recorded sandbox SHA
  is missing, because the chain only runs locally.

  athena-site DEC-CDCP-015 locks the CI contract for every CDCP product
  repo. This DEC implements that contract for procurement-negotiation-lab
  with the minimum-surface-area change: one new workflow file alongside
  the existing tests.yml/security.yml/etc. The new workflow runs the
  product-only gates (packet generation, packet validation, replay
  smoke). The existing tests.yml continues to run the universal gates.

  Reversibility is high. The workflow can be relaxed via a single DEC
  amendment plus a corresponding edit to
  ``.github/workflows/run-evidence-gates.yml``. The replay-smoke job is
  the only step that touches the worktree (``git checkout
  <sandbox-sha>`` plus a one-line ``cp`` to restore the finalized Run
  record); reverting it leaves no other state to clean up. No new
  scripts, no new pyproject extras, no new dependencies.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: decision
    ref: decisions/DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration.md
  - kind: doc
    ref: .github/workflows/run-evidence-gates.yml
  - kind: doc
    ref: .github/workflows/tests.yml
  - kind: doc
    ref: scripts/replay_run.py
  - kind: doc
    ref: scripts/validate_run_evidence.py
  - kind: run
    ref: ops/run-records/run-960d6b107160.json
  - kind: artifact
    ref: ops/event-ledger/run-960d6b107160.jsonl
rollback: |
  Delete ``.github/workflows/run-evidence-gates.yml``, drop the
  ``R-FACTORY-RUN-EVIDENCE-019..022`` rows from
  ``specs/0009-factory-dev-control-plane/requirements.md`` and
  ``traceability.md``, and remove the new task entries from
  ``tasks.md``. The universal gates in ``tests.yml`` remain untouched,
  so a partial rollback that keeps the universal chain green but
  drops the product-side gates is also safe.
owner: control.coordinator
---

## decision

The procurement-negotiation-lab CI enforces the DEC-CDCP-015 run-evidence
gate chain on every pull request and every push to ``main``. A new
workflow at ``.github/workflows/run-evidence-gates.yml`` runs three
product-side gates: packet generation from the canonical event ledger
via the sibling-checked-out trace-to-eval repo, packet validation
against the v2-1 run-evidence schema, and a replay-smoke step that
extracts the sandbox SHA from the canonical Run record, checks it out,
restores the finalized Run record into the worktree, and runs
``scripts/replay_run.py``. The existing ``tests.yml`` keeps running
the universal gates on the same triggers. No contract gate carries
``continue-on-error`` or any informational-only shape.

## alternatives

- Extend tests.yml in place with the product-only gates: rejected
  because tests.yml runs the universal gates under ``uv`` and the
  trace-to-eval sibling checkout deserves its own runner so the
  universal gates fail fast on their own.
- Skip replay-smoke in CI and rely on the local replay command:
  rejected because DEC-CDCP-015 names replay-smoke load-bearing; the
  divergence we are guarding against only surfaces in a fresh CI run.
- Keep packet generation as a downstream consumer concern: rejected
  because the producer owns the contract that the canonical ledger
  yields a valid packet; catching it here fails fast at the moment a
  bad ledger lands.
- Rebuild the Run record via the finalize helper inside CI instead of
  restoring the HEAD copy after checkout: rejected because copying the
  HEAD record to ``/tmp`` before checkout and restoring it after is
  one ``cp`` either side of ``git checkout`` and avoids re-plumbing
  the finalize helper's argument shape into the workflow.

## rationale

This DEC amends DEC-FACTORY-010. The DEC-FACTORY-007 emission
contract, the DEC-FACTORY-008 cross-checks, the DEC-FACTORY-009
replay command, and the DEC-FACTORY-010 portable URI scheme all
shipped local-only. The remaining gap is CI enforcement: ``main``
accepts a PR whose trace-to-eval packet would not validate, or whose
recorded sandbox SHA is unreachable, because the chain only runs
locally. DEC-CDCP-015 locks the CI contract for every CDCP product
repo; this DEC implements it for procurement-negotiation-lab via one
new workflow file. Reversibility is high: a single revert deletes
the workflow with no other state to clean up.

## evidence

- ``specs/0009-factory-dev-control-plane/requirements.md`` adds
  ``R-FACTORY-RUN-EVIDENCE-019..022``.
- ``decisions/DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration.md``
  is the parent DEC that landed the portable URI scheme this CI
  enforcement chain consumes.
- ``.github/workflows/run-evidence-gates.yml`` carries the new
  product-side gates (packet generation, packet validation, replay
  smoke).
- ``.github/workflows/tests.yml`` continues to run the universal
  gates (schema-cache freshness, voice-lint, BOM check, spec-check,
  decisions validation, typed-event-payload validation, language test
  runner).
- ``scripts/replay_run.py`` and ``scripts/validate_run_evidence.py``
  are the in-repo gate scripts the workflows invoke.
- ``ops/run-records/run-960d6b107160.json`` and
  ``ops/event-ledger/run-960d6b107160.jsonl`` are the canonical
  sample the new workflow targets.

## rollback

Delete ``.github/workflows/run-evidence-gates.yml``, drop the
``R-FACTORY-RUN-EVIDENCE-019..022`` rows from
``specs/0009-factory-dev-control-plane/requirements.md`` and
``traceability.md``, and remove the matching task entries from
``tasks.md``. The universal gates in ``tests.yml`` stay untouched.

## coverage

This DEC resolves the following requirements added to spec
``0009-factory-dev-control-plane``:

- ``R-FACTORY-RUN-EVIDENCE-019`` CI workflow at
  ``.github/workflows/run-evidence-gates.yml`` exists and triggers on
  every ``pull_request`` and every ``push`` to ``main``.
- ``R-FACTORY-RUN-EVIDENCE-020`` workflow enforces the
  DEC-CDCP-015 product-side gates (packet generation from the
  canonical sample via the sibling trace-to-eval checkout,
  packet validation against the run-evidence schema, and replay
  smoke against the canonical sample).
- ``R-FACTORY-RUN-EVIDENCE-021`` replay-smoke extracts the 40-char
  sandbox SHA from the canonical Run record's ``sandbox_image_ref``
  URI, checks the recorded SHA out, restores the finalized Run
  record into the worktree, and runs ``scripts/replay_run.py``.
- ``R-FACTORY-RUN-EVIDENCE-022`` no contract gate carries
  ``continue-on-error: true`` or any informational-only shape; gate
  failure exits the build red.
