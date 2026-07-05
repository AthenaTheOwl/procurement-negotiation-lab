---
id: backlog-001-bgw-mpc-needs-golden-test-coverage
target_kind: backlog_item
target_path: specs/0016-negotiate-surface-engine-reconnect/traceability.md
week: 2026-W23
mode: golden_test_generation
direction: reconcile
cost: small
risk: low
timeline: next procurement-product pass
human_review_required: true
status: proposed
evidence:
  - kind: commit
    ref: "20e8456 W5: BGW MPC weighted-Nash mechanism (DEC-MPC-001)"
  - kind: commit
    ref: "da4e7cb property: complete the R-PROP-* invariant battery (4 new tests, 20 cases)"
  - kind: test
    ref: tests/test_weighted_nash_mpc.py::test_mpc_matches_plaintext_within_tolerance
  - kind: doc
    ref: specs/0016-negotiate-surface-engine-reconnect/traceability.md
systems_map: "Mechanism tests, spec traceability rows, and rendered-path proofs should describe the same MPC coverage boundary."
transferable_principle: "When a mechanism lands with tests, the next backlog item should reconcile evidence surfaces before adding duplicate tests."
falsification_test: "If spec 0016 already marks the MPC selector and two-tab proof complete with links to the shipped tests, this backlog item is stale."
adoption_ladder:
  minimum_viable: "Update traceability to distinguish existing unit golden parity from any still-missing rendered MPC proof."
  mid_adoption: "Add or link a single smoke/e2e proof only if the rendered path remains uncovered."
  full_adoption: "Keep future mechanism launches on a typed matrix tying DEC, unit parity, property battery, SDK, and rendered proof together."
  monitoring_signals:
    - "Traceability rows with planned or partial status after matching tests exist."
    - "New mechanism identifiers registered without a rendered-path proof decision."
---

## idea

Reconcile the BGW MPC evidence chain after the W23 product spike.
The current tree already has unit-level golden parity coverage for
`weighted_nash_mpc`; the actionable gap is not "write the first MPC
golden test." The actionable gap is to make traceability say exactly
which MPC coverage exists and whether the visible negotiation surface
still needs an end-to-end proof.

## why

Commit `20e8456` made the BGW MPC mechanism real, and commit
`da4e7cb` expanded the R-PROP-* battery. The test file
`tests/test_weighted_nash_mpc.py` contains a parity test against the
plaintext mechanism, leakage-report checks, determinism coverage, and
failure-boundary checks. That is meaningful evidence.

Spec 0016 still contains MPC integration rows that read as pending or
partial in places. The user-visible learning lab should not let a
stale traceability row imply missing engine evidence, and it should
not let engine evidence imply the rendered path is covered if it is
not. Split those claims.

## cost

Small. One later docs/spec pass can update the traceability wording
and decide whether a Playwright MPC path proof is still needed. If it
is needed, create that as a separate test-generation item with a
clear rendered-path target.

## risk

Low. The main risk is overcorrecting and marking user-visible MPC
coverage complete based only on unit tests. Keep the unit, property,
SDK, and rendered proof surfaces separate.

## promotion path

Route through a normal procurement-product backlog pass. Do not edit
specs from this backfill task; this candidate only records the
evidence and the reconciliation work.
