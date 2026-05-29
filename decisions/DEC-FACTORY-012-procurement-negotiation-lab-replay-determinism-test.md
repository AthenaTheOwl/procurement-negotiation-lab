---
id: DEC-FACTORY-012-procurement-negotiation-lab-replay-determinism-test
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-RUN-EVIDENCE-023
date: 2026-05-29
status: approved
reversible: true
amends: DEC-FACTORY-011-procurement-negotiation-lab-ci-enforces-run-evidence-chain
decision: |
  The procurement-negotiation-lab installs a replay-determinism test
  fixture at ``tests/factory/test_replay_determinism.py`` and wires it
  into ``.github/workflows/run-evidence-gates.yml`` as a dedicated
  ``replay-determinism`` job. The fixture replays the canonical
  sample ``run-7b662d3f68b1`` ``RERUNS`` times (default 3, override
  via the ``RERUNS`` env var), canonicalizes the three replay-
  equivalence fields recorded under
  ``field_comparison.<field>.fresh`` on every replay report, and
  SHA-256 hashes the canonical bytes. All ``RERUNS`` hashes MUST
  match; otherwise the test writes a failure bundle at
  ``artifacts/failbundles/determinism_failure.json`` (plus
  ``trace_0.json`` and ``trace_1.json`` carrying the first two
  diverging canonical traces) and fails loudly with the bundle path
  in the assertion message.

  The canonical-field whitelist is fixed at three keys:

  1. ``recomputed_prompt_snapshot_hash``
  2. ``recomputed_tool_schemas_snapshot_hash``
  3. ``recomputed_gate_results_summary`` (with ``gates_passed`` and
     ``gates_failed`` sorted, ``all_passed`` coerced to bool)

  Canonicalization uses ``json.dumps(..., sort_keys=True,
  separators=(",", ":"))`` per the ChatGPT pulse pattern so unrelated
  key ordering and whitespace cannot mask drift.

  The test fixture handles the DEC-FACTORY-010 two-pass-emit shape:
  on entry it saves the finalized HEAD copy of the canonical Run
  record, runs ``git checkout <sandbox-sha>`` (the recorded SHA
  carries the PENDING placeholder), restores the finalized record
  bytes into the worktree so replay can read the SHA back off
  ``sandbox_image_ref``, runs the replay, then on teardown discards
  the worktree modification and returns HEAD to the original branch
  (preferring branch name over detached SHA where one exists). Per-
  replay artifacts that the test creates under
  ``ops/replay-records/<run-id>/`` and ``ops/event-ledger/replay-*``
  are removed in teardown so the working tree stays clean.

  The new CI job uses ``actions/checkout@v4`` with ``fetch-depth: 0``
  so the recorded sandbox SHA is reachable on the runner, then
  ``astral-sh/setup-uv@v5`` + ``uv sync --python 3.11`` to bring in
  project test deps, then ``uv run pytest
  tests/factory/test_replay_determinism.py -v --no-cov`` with
  ``RERUNS=3``. The job uploads the failure bundle directory via
  ``actions/upload-artifact@v4`` when the step fails so CI logs link
  directly to the diverging traces. No ``continue-on-error`` on the
  test step; gate failure fails the build red.
alternatives:
  - label: hash the recorded replay-event ledger instead of the
      replay-record report
    rejected_because: |
      The per-replay ledger carries a ``created_at`` timestamp plus a
      fresh UUID ``event_id`` on every invocation, both of which would
      force the determinism hash to differ on every replay even when
      the replay-equivalence fields agree. The report's
      ``field_comparison.<field>.fresh`` carries exactly the
      content-derived values we want to check. Hashing the ledger
      would require building the same canonical-whitelist plumbing
      anyway, with a noisier surface to filter.
  - label: skip the canonical-whitelist and hash the full report
    rejected_because: |
      The report carries non-content fields (``started_at``,
      ``finished_at``, ``head_sha``, ``recorded_run_summary``,
      ``fresh_run_summary``, ``replay_event_id``) that change on
      every replay. Hashing the full report would flag every replay
      as non-deterministic even when the three replay-equivalence
      fields agree. The whitelist is the load-bearing surface; it
      mirrors the three fields the DEC-FACTORY-009 replay command
      already compares between recorded and fresh.
  - label: run the determinism check as part of the existing
      replay-smoke step
    rejected_because: |
      The replay-smoke step runs replay once and asserts equivalence
      against the recorded Run. Adding ``RERUNS`` invocations inside
      that step would conflate two contracts (recorded-vs-fresh
      equivalence and fresh-vs-fresh determinism). A dedicated job
      keeps the failure mode separable: replay-smoke divergence
      means the recorded sample drifted; replay-determinism
      divergence means the pipeline output drifted between two
      nominally-identical runs.
  - label: rely on the existing test_replay_run.py for determinism
      coverage
    rejected_because: |
      ``test_replay_run.py`` exercises the script's exit-code and
      report-shape contract once per scenario; it does not run the
      replay multiple times against the canonical sample at the
      recorded sandbox SHA. The determinism gap (prompt-template
      drift, tool-config drift, gate-set drift across two replays
      of the same sample) needs a fixture that replays N times at
      the recorded SHA and compares the canonicalized output across
      runs.
rationale: |
  This DEC amends DEC-FACTORY-011. DEC-FACTORY-007 named the
  emission contract, DEC-FACTORY-008 added cross-checks,
  DEC-FACTORY-009 shipped the replay command, DEC-FACTORY-010 made
  the URI scheme portable, and DEC-FACTORY-011 wired the canonical
  sample into CI. The remaining gap: the DEC-FACTORY-009 equivalence
  framing claims the three replay-equivalence fields are content-
  derived and reproducible, but nothing in CI checks that two
  back-to-back replays of the same sample produce the same hashes.
  Prompt-template drift, tool-config drift, or gate-set drift could
  ship green through every existing gate.

  The fixture mirrors the ChatGPT pulse Agents-SDK replay-
  determinism pattern: pick a canonical sample, define a canonical-
  field whitelist, replay N times, canonicalize, hash, compare. The
  translation to our portfolio swaps the Agents-SDK event-payload
  whitelist for our three replay-equivalence fields and the
  Agents-SDK replay loop for ``scripts/replay_run.py``.

  Trade-off: each CI run pays ``RERUNS`` * replay-time on top of the
  existing replay-smoke step. With the dry-run worker stubs the
  replay finishes in a few seconds, so the total marginal cost is
  bounded. Acceptable for the contract value: any drift in the
  three load-bearing hashes shows up at the producing repo's CI
  instead of slipping through to a downstream trace-to-eval
  consumer or a hand-run audit.

  Reversibility is high. Deleting the test file plus the new
  ``replay-determinism`` job in ``.github/workflows/run-evidence-
  gates.yml`` reverts the gate; the universal gates in ``tests.yml``
  and the product gates in the rest of ``run-evidence-gates.yml``
  remain untouched. No new pyproject deps, no new scripts.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: decision
    ref: decisions/DEC-FACTORY-011-procurement-negotiation-lab-ci-enforces-run-evidence-chain.md
  - kind: doc
    ref: tests/factory/test_replay_determinism.py
  - kind: doc
    ref: .github/workflows/run-evidence-gates.yml
  - kind: doc
    ref: scripts/replay_run.py
  - kind: run
    ref: ops/run-records/run-7b662d3f68b1.json
  - kind: artifact
    ref: ops/event-ledger/run-7b662d3f68b1.jsonl
rollback: |
  Delete ``tests/factory/test_replay_determinism.py``, drop the
  ``replay-determinism`` job from
  ``.github/workflows/run-evidence-gates.yml``, remove the
  ``replay-determinism`` / ``tests/factory/test_replay_determinism.py``
  / ``RERUNS`` proof tokens from ``scripts/spec_check.py::
  REQUIRED_WORKFLOW_PROOFS``, drop the
  ``R-FACTORY-RUN-EVIDENCE-023..025`` rows from
  ``specs/0009-factory-dev-control-plane/requirements.md`` and
  ``traceability.md``, and remove the matching task entries from
  ``tasks.md``. The DEC-FACTORY-011 chain (packet generation, packet
  validation, replay smoke) remains untouched.
owner: control.coordinator
systems_map: |
  Determinism-of-derivation contract for replay pipelines — the chain
  (canonical sample -> replay command -> canonicalized fields -> hash)
  is the closure under which two replays of the same input must yield
  byte-identical content hashes. The CI fixture is the empirical probe
  that converts a claimed contract into an enforced one.
transferable_principle: |
  Any pipeline that claims "fresh and recorded should match" needs a
  test that runs the pipeline N times against the same input, hashes
  a content-derived whitelist, and asserts hash equality. The
  whitelist + canonicalization step is the load-bearing surface; the
  rerun loop is just the probe.
falsification_test: |
  If two back-to-back replays of the canonical sample produce
  different hashes on the three replay-equivalence fields despite no
  pipeline change, the determinism claim is falsified for whichever
  field diverged — the failure bundle pinpoints which.
adoption_ladder:
  minimum_viable: |
    Fixture exists locally; one rerun count (RERUNS=3); hash three
    canonicalized fields; assert equality.
  mid_adoption: |
    Fixture runs in CI as an independent job with no
    continue-on-error; failure uploads a determinism failure bundle
    so the diverging field is visible in CI artifacts.
  full_adoption: |
    Determinism fixture extended to cover replay across sandbox-SHA
    boundaries; the whitelist grows to mirror every content-derived
    field added by future DECs; hash equality is a release gate.
  monitoring_signals:
    - "replay-determinism job pass/fail trend on main"
    - "failure-bundle upload count over a 30-day window"
    - "whitelist diff vs. DEC-FACTORY-009 equivalence fields"
---

## decision

The procurement-negotiation-lab installs a replay-determinism test
fixture at ``tests/factory/test_replay_determinism.py`` and wires it
into the ``run-evidence-gates`` workflow as a dedicated
``replay-determinism`` job. The fixture replays the canonical sample
``run-7b662d3f68b1`` ``RERUNS`` times (default 3), canonicalizes the
three replay-equivalence fields per replay report, SHA-256 hashes the
canonical bytes, and fails when the hashes diverge. On failure the
test writes a failure bundle to ``artifacts/failbundles/`` carrying
the unique hashes, the first two diverging canonical traces, and the
canonical sample identity, then fails with the bundle path in the
assertion message.

## alternatives

- Hash the per-replay event ledger instead of the report: rejected
  because the ledger event carries ``created_at`` plus a fresh UUID
  on every invocation, which would force the determinism hash to
  differ even when the replay-equivalence fields agree.
- Skip the canonical-field whitelist and hash the full report:
  rejected because the report carries non-content fields (timestamps,
  ``replay_event_id``, both Run summaries) that change every replay
  and would flag every run as non-deterministic.
- Run the determinism check inside the existing replay-smoke step:
  rejected because replay-smoke is the recorded-vs-fresh contract;
  the determinism gate is the fresh-vs-fresh contract. Separating
  them keeps the failure modes diagnosable.
- Rely on ``tests/factory/test_replay_run.py`` for determinism
  coverage: rejected because that file checks the script's exit code
  and report shape once per scenario; it does not run the replay
  multiple times at the recorded SHA.

## rationale

This DEC amends DEC-FACTORY-011. The DEC-FACTORY-009 equivalence
framing claims the three replay-equivalence hashes
(``prompt_snapshot_hash``, ``tool_schemas_snapshot_hash``,
``gate_results_summary``) are content-derived and reproducible, but
nothing in CI checks that two back-to-back replays of the same
sample produce the same canonical hash. Prompt-template drift,
tool-config drift, or gate-set drift could ship green through every
existing gate. The ChatGPT pulse Agents-SDK replay-determinism
pattern (canonical sample + canonical-field whitelist + N replays +
hash compare) maps cleanly to our portfolio's run-evidence framing
once the Agents-SDK event-payload whitelist is swapped for our
three replay-equivalence fields and the Agents-SDK replay loop is
swapped for ``scripts/replay_run.py``.

Trade-off: each CI run pays ``RERUNS`` times replay-time. With the
dry-run worker stubs each replay finishes in a few seconds, so the
marginal cost is bounded. The contract value (catching drift in
load-bearing hashes at the producing repo) outweighs the cost.

Reversibility is high: deleting the test file plus the new CI job
reverts the gate. No new pyproject deps, no new scripts.

## evidence

- ``specs/0009-factory-dev-control-plane/requirements.md`` adds
  ``R-FACTORY-RUN-EVIDENCE-023..025``.
- ``decisions/DEC-FACTORY-011-procurement-negotiation-lab-ci-enforces-run-evidence-chain.md``
  is the parent DEC that wired the canonical sample into CI.
- ``tests/factory/test_replay_determinism.py`` carries the fixture.
- ``.github/workflows/run-evidence-gates.yml`` carries the
  ``replay-determinism`` job that runs the fixture under ``uv``.
- ``scripts/replay_run.py`` is the replay command the fixture
  invokes.
- ``ops/run-records/run-7b662d3f68b1.json`` plus
  ``ops/event-ledger/run-7b662d3f68b1.jsonl`` are the canonical
  sample the fixture replays.

## rollback

Delete the test file, drop the ``replay-determinism`` job from the
workflow, remove the new proof tokens from
``scripts/spec_check.py::REQUIRED_WORKFLOW_PROOFS``, drop the
``R-FACTORY-RUN-EVIDENCE-023..025`` rows from ``requirements.md`` and
``traceability.md``, and remove the matching task entries from
``tasks.md``. The DEC-FACTORY-011 chain remains untouched.

## coverage

This DEC resolves the following requirements added to spec
``0009-factory-dev-control-plane``:

- ``R-FACTORY-RUN-EVIDENCE-023`` the fixture file
  ``tests/factory/test_replay_determinism.py`` exists and runs the
  canonical-sample replay ``RERUNS`` times (default 3) with a
  canonical-field whitelist over the three replay-equivalence
  fields.
- ``R-FACTORY-RUN-EVIDENCE-024`` the workflow at
  ``.github/workflows/run-evidence-gates.yml`` carries a dedicated
  ``replay-determinism`` job that runs the fixture under
  ``fetch-depth: 0`` with ``RERUNS=3`` and uploads
  ``artifacts/failbundles/`` on failure.
- ``R-FACTORY-RUN-EVIDENCE-025`` the fixture writes a failure
  bundle at ``artifacts/failbundles/determinism_failure.json``
  (plus ``trace_0.json`` and ``trace_1.json``) when the canonical
  hashes diverge, and fails the test with the bundle path in the
  assertion message.
