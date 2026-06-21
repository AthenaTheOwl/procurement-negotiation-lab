---
id: DEC-FACTORY-014-procurement-negotiation-lab-chaos-test-suite
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-RUN-EVIDENCE-029
date: 2026-05-29
status: approved
reversible: true
amends: DEC-FACTORY-013-factory-thread-id-capture-and-timestamp-fix
decision: |
  procurement-negotiation-lab installs a chaos test suite at
  ``tests/factory/test_chaos_run_evidence.py`` that copies the canonical
  sample ``run-960d6b107160`` (Run record + ledger) into a temp dir,
  applies one targeted mutation per test from a seven-class catalog
  (M1..M7), points ``scripts/validate_run_evidence.py`` at the temp
  dir via its module-level ``EVENT_LEDGER_DIR`` /
  ``RUN_RECORDS_DIR`` constants, and asserts the validator exits
  non-zero with stderr that names the specific check. The suite runs
  in CI as an independent ``chaos-validation`` job inside
  ``.github/workflows/run-evidence-gates.yml``.

  The seven mutation classes map one-to-one onto the validator
  branches the prior rounds locked:

  - M1: ``Run.prompt_snapshot_hash`` mutated to a different valid
    64-char hex hash. Catches a regression in cross-check #1
    (``Run.prompt_snapshot_hash`` matches ``pipeline.start.payload
    .prompt_snapshot_hash``).
  - M2: ``Run.tool_schemas_snapshot_hash`` mutated similarly.
    Catches a regression in cross-check #2.
  - M3: ``Run.gate_results_summary.gates_passed`` adds a phantom
    gate name (``phantom_gate``). The ledger has no
    ``gate.check.passed`` event for it, so cross-check #4
    (Run.gate_results_summary matches the scan of gate.check.*
    events) must fire.
  - M4: the terminal ``gate.run.evidence_recorded`` event is
    removed from the ledger. The Run still carries
    ``status == "done"``, so the required-terminal-event check
    must fire.
  - M5: the ``pipeline.start`` event's payload drops
    ``prompt_snapshot_hash``. The event schema's oneOf
    discriminator (Round 2's typed-event-payload contract)
    requires that field on ``pipeline.start``; schema
    validation must reject the line.
  - M6: ``gate.run.evidence_recorded.payload.fields_populated``
    claims ``determinism`` even though the canonical Run record
    does not populate it. Catches a regression in cross-check #3.
  - M7: ``Run.sandbox_image_ref`` removed from a done Run.
    Catches a regression in the required-for-done field check.

  Every mutation lands on a per-test ``tmp_path`` copy; the
  committed canonical sample on disk is never written. A positive
  guard test ``test_canonical_sample_validates_clean`` runs first so
  a real drift in the canonical sample surfaces as a sample bug, not
  as a chaos-test false alarm.

  CI runs the suite as the ``chaos-validation`` job in
  ``.github/workflows/run-evidence-gates.yml`` alongside the
  existing ``run-evidence-gates`` and ``replay-determinism`` jobs.
  The job carries no ``continue-on-error: true``. The job's proof
  tokens (``chaos-validation``,
  ``tests/factory/test_chaos_run_evidence.py``) join the
  ``REQUIRED_WORKFLOW_PROOFS`` registry in
  ``scripts/spec_check.py`` so a renamed or deleted job fails
  spec-check.
alternatives:
  - label: build the chaos suite as a stand-alone shell harness
      that subprocesses ``scripts/validate_run_evidence.py``
    rejected_because: |
      The validator's directory paths are module-level constants
      derived from ``Path(__file__).resolve().parents[1]``.
      Subprocessing the script would require also relocating the
      script file or threading the temp dir through every path
      constant via env vars. The existing test
      ``tests/factory/test_validate_run_evidence.py`` already uses
      ``importlib.reload`` plus ``monkeypatch.setattr`` to point
      ``EVENT_LEDGER_DIR`` / ``RUN_RECORDS_DIR`` at a temp dir; the
      chaos suite reuses the same pattern so the test rig stays
      consistent with the existing validator-test pattern.
  - label: cover the chaos cases inside
      ``tests/factory/test_validate_run_evidence.py`` instead of a
      new file
    rejected_because: |
      The existing test starts from a synthetic ``_baseline_done
      _run_with_ledger`` and mutates fields on synthetic baselines.
      The chaos suite's contract is "the canonical sample (the
      bytes committed to disk) plus a targeted mutation must fail
      validation". Mixing synthetic-baseline tests with
      canonical-sample-mutation tests in one file would conflate
      two different test contracts. A dedicated file keeps the
      catalog (M1..M7) discoverable and lets CI run the chaos job
      independently of the existing validator tests.
  - label: ship only the M1..M4 classes and defer M5..M7
    rejected_because: |
      The Workflow F brief named seven mutation classes and tied
      each one to a specific validator branch (cross-check 1..4,
      required-for-done, typed-event payload). Shipping a subset
      would leave validator branches uncovered and force a
      follow-up DEC to ship the rest. M5 in particular (the typed
      pipeline.start payload) is the only test in the suite that
      exercises Round 2's oneOf discriminator at the schema layer;
      dropping it would leave Round 2's typed-payload contract
      uncovered by the chaos suite.
  - label: skip the positive guard
      ``test_canonical_sample_validates_clean``
    rejected_because: |
      Without the positive guard, a real regression in the
      canonical sample would surface as seven cryptic chaos-test
      failures (each mutation would still fail, but for the wrong
      reason). The guard runs first and fails fast with a clear
      message, so a sample-drift bug surfaces as one named failure
      instead of seven. The cost is one extra test method; the
      payoff is debuggability.
rationale: |
  This DEC amends DEC-FACTORY-013. DEC-FACTORY-007 named the
  emission contract; DEC-FACTORY-008 added cross-checks;
  DEC-FACTORY-009 shipped the replay command; DEC-FACTORY-010
  ported to portable URIs; DEC-FACTORY-011 wired CI;
  DEC-FACTORY-012 installed the replay-determinism fixture;
  DEC-FACTORY-013 captured ``thread_id`` and fixed the timestamp
  collision. The remaining gap: the validator itself could regress
  silently.

  Every prior round added a validator branch. If any branch is
  weakened (a check turned into a no-op, a cross-check loop
  short-circuits early, a schema oneOf clause is dropped), the
  canonical sample still validates clean because the canonical
  sample is well-formed. The chaos suite closes that gap by
  asserting the validator rejects every targeted mutation: if a
  mutation slips past, the corresponding branch has regressed.

  The closing-pass framing matters. Without the chaos suite, the
  whole run-evidence-gates chain is one regression away from
  silently breaking: a refactor of ``cross_check_done_runs`` could
  remove a check and CI would still pass on every PR. With the
  chaos suite wired to CI, that refactor's PR fails the
  ``chaos-validation`` job and the regression surfaces before it
  lands.

  Reversibility is high. The only files added are the test, one
  DEC, the requirements/traceability/tasks rows, and two lines in
  the workflow + two tokens in spec_check.py. No production code
  changes; no schema changes; no canonical-sample changes. The
  rollback is purely additive-revert (drop the test file, drop the
  job, drop the spec rows, drop the DEC).
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: decision
    ref: decisions/DEC-FACTORY-013-factory-thread-id-capture-and-timestamp-fix.md
  - kind: decision
    ref: decisions/DEC-FACTORY-008-factory-run-evidence-cross-checks.md
  - kind: decision
    ref: decisions/DEC-FACTORY-007-factory-emits-conformant-run-evidence.md
  - kind: doc
    ref: scripts/validate_run_evidence.py
  - kind: doc
    ref: tests/factory/test_chaos_run_evidence.py
  - kind: doc
    ref: ops/run-records/run-960d6b107160.json
  - kind: doc
    ref: ops/event-ledger/run-960d6b107160.jsonl
rollback: |
  Drop ``tests/factory/test_chaos_run_evidence.py``. Drop the
  ``chaos-validation`` job from
  ``.github/workflows/run-evidence-gates.yml``. Remove the tokens
  ``chaos-validation`` and ``tests/factory/test_chaos_run_evidence.py``
  from ``scripts/spec_check.py::REQUIRED_WORKFLOW_PROOFS`` for the
  ``run-evidence-gates.yml`` entry. Drop
  ``R-FACTORY-RUN-EVIDENCE-029..031`` from
  ``specs/0009-factory-dev-control-plane/requirements.md`` and the
  matching rows from ``traceability.md`` plus the task entries from
  ``tasks.md``. The DEC-FACTORY-013 chain stays untouched.
owner: control.coordinator
systems_map: |
  Adversarial testing against a validator chain — the canonical
  sample is well-formed by construction, so any branch in the
  validator can be silently weakened without surface signal. The
  chaos suite is the negative-test mirror: one targeted mutation per
  validator branch turns each branch into an empirically-asserted
  contract.
transferable_principle: |
  For any validator that walks a multi-step contract (cross-checks,
  required-for-state fields, typed-payload oneOfs), ship a chaos test
  per branch. The catalog (one mutation class per branch) is the
  inverse of the validator's responsibility map; without it, a
  no-op'd branch passes the happy-path test silently.
falsification_test: |
  If a refactor of `scripts/validate_run_evidence.py` removes or
  weakens a check and the corresponding chaos-test mutation still
  passes the validator (the test goes green when it should go red),
  the chaos suite's coverage claim is falsified for that mutation
  class.
adoption_ladder:
  minimum_viable: |
    Seven mutation classes (M1..M7) wired against the canonical
    sample; positive guard test runs first; per-test tmp_path copy so
    canonical sample on disk is never written.
  mid_adoption: |
    `chaos-validation` CI job with no continue-on-error; proof tokens
    registered in `REQUIRED_WORKFLOW_PROOFS`; renamed/deleted job
    fails spec-check.
  full_adoption: |
    Mutation classes expand as new validator branches land; chaos
    suite is the standard pattern across every product repo's
    validate_run_evidence; mutation catalog drives a coverage report
    that maps validator branches to chaos tests.
  monitoring_signals:
    - "chaos-validation job pass/fail trend on main"
    - "new validator branches landed without a paired mutation class"
    - "canonical-sample positive guard failure rate"
---

## decision

procurement-negotiation-lab installs a chaos test suite at
``tests/factory/test_chaos_run_evidence.py`` that covers seven
mutation classes (M1..M7) verifying that
``scripts/validate_run_evidence.py`` catches each mutation. Every
test copies the canonical sample ``run-960d6b107160`` into a temp
dir, applies one targeted mutation, points the validator at the
temp dir via its module-level path constants, and asserts the
validator exits non-zero with stderr that names the specific check.
The committed canonical sample on disk is never written.

The CI workflow ``.github/workflows/run-evidence-gates.yml`` gains
an independent ``chaos-validation`` job that runs the suite under
``uv``. The job's proof tokens land in
``scripts/spec_check.py::REQUIRED_WORKFLOW_PROOFS`` so a renamed or
deleted job fails spec-check.

## alternatives

- Stand-alone shell harness that subprocesses
  ``validate_run_evidence.py``: rejected because the validator's
  directory paths are module-level constants; the existing
  validator test already uses ``importlib.reload`` plus
  ``monkeypatch.setattr`` to redirect them, and the chaos suite
  reuses that pattern for consistency.
- Fold the chaos cases into
  ``tests/factory/test_validate_run_evidence.py``: rejected because
  that file's tests start from synthetic baselines; mixing
  synthetic-baseline tests with canonical-sample-mutation tests in
  one file would conflate two different test contracts.
- Ship only M1..M4 and defer M5..M7: rejected because the brief
  tied each mutation class to a specific validator branch, and
  shipping a subset would leave Round 2's typed-payload contract
  (M5) and the required-for-done discipline (M7) uncovered by the
  chaos suite.
- Skip the positive guard
  ``test_canonical_sample_validates_clean``: rejected because
  without it a canonical-sample drift would surface as seven
  confusing chaos-test failures instead of one named guard failure.

## rationale

This DEC amends DEC-FACTORY-013. Every prior round added a
validator branch (DEC-FACTORY-007 emission, DEC-FACTORY-008
cross-checks, DEC-FACTORY-010 typed-URI resolution, DEC-FACTORY-012
determinism). Each branch could regress silently: the canonical
sample is well-formed, so a no-op'd check still produces an OK exit
code on the committed sample. The chaos suite closes that gap by
asserting the validator rejects every targeted mutation.

Without the chaos suite, the whole run-evidence-gates chain is one
regression away from silently breaking. With it wired to CI, a
refactor that weakens a check surfaces as a failed
``chaos-validation`` job before it lands.

Reversibility is high. No production code, no schema, no
canonical-sample changes. The rollback is purely additive-revert.

## evidence

- ``specs/0009-factory-dev-control-plane/requirements.md`` adds
  ``R-FACTORY-RUN-EVIDENCE-029..031``.
- ``decisions/DEC-FACTORY-013-factory-thread-id-capture-and-timestamp-fix.md``
  is the parent DEC.
- ``decisions/DEC-FACTORY-008-factory-run-evidence-cross-checks.md``
  defined the four cross-checks the chaos suite exercises.
- ``decisions/DEC-FACTORY-007-factory-emits-conformant-run-evidence.md``
  defined the emission contract the canonical sample conforms to.
- ``scripts/validate_run_evidence.py`` carries the branches the
  chaos suite catches.
- ``tests/factory/test_chaos_run_evidence.py`` is the new suite.
- ``ops/run-records/run-960d6b107160.json`` and
  ``ops/event-ledger/run-960d6b107160.jsonl`` are the canonical
  sample inputs the suite copies.

## rollback

Drop ``tests/factory/test_chaos_run_evidence.py``. Drop the
``chaos-validation`` job from
``.github/workflows/run-evidence-gates.yml``. Remove the proof
tokens ``chaos-validation`` and
``tests/factory/test_chaos_run_evidence.py`` from
``scripts/spec_check.py::REQUIRED_WORKFLOW_PROOFS``. Drop
``R-FACTORY-RUN-EVIDENCE-029..031`` from ``requirements.md``,
``traceability.md``, and ``tasks.md``. The DEC-FACTORY-013 chain
stays untouched.

## coverage

This DEC resolves the following requirements added to spec
``0009-factory-dev-control-plane``:

- ``R-FACTORY-RUN-EVIDENCE-029`` chaos test suite covers
  required-for-done plus the four cross-checks via seven mutation
  classes (M1..M7) applied to the canonical sample on a temp-dir
  copy.
- ``R-FACTORY-RUN-EVIDENCE-030`` chaos suite catches typed-payload
  regressions via M5 (``pipeline.start`` payload missing
  ``prompt_snapshot_hash``), exercising the event schema's oneOf
  discriminator at schema-validation time.
- ``R-FACTORY-RUN-EVIDENCE-031`` chaos suite runs on every PR and
  push to ``main`` as an independent ``chaos-validation`` job in
  ``.github/workflows/run-evidence-gates.yml``; the job's proof
  tokens are registered in
  ``scripts/spec_check.py::REQUIRED_WORKFLOW_PROOFS`` so a renamed
  or deleted job fails spec-check.
