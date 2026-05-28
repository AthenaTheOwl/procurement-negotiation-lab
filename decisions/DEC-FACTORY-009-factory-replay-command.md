---
id: DEC-FACTORY-009-factory-replay-command
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-RUN-EVIDENCE-011
date: 2026-05-28
status: approved
reversible: true
amends: DEC-FACTORY-008-factory-run-evidence-cross-checks
decision: |
  The factory ships `scripts/replay_run.py`, a per-repo equivalence
  replay command. Invocation is
  `python scripts/replay_run.py --run-id run-<id>`. The script loads
  the recorded Run record at `ops/run-records/<run-id>.json` and its
  matching ledger at `ops/event-ledger/<run-id>.jsonl`, verifies the
  current git HEAD matches the recorded sandbox SHA pulled from
  `Run.sandbox_image_ref` (format `<worktree>@<sha>`), re-runs the
  factory entry against the recorded task path under `--dry-run` in a
  tmp scratch directory so the committed evidence dirs stay clean, and
  compares three replay-equivalence fields between recorded and fresh:
  `prompt_snapshot_hash`, `tool_schemas_snapshot_hash`, and
  `gate_results_summary`. All three must match for
  `replay_equivalent` to be true.

  HEAD verification is strict. On mismatch the script exits 1 with the
  `git checkout <sha>` command the caller needs to run first. Missing
  Run record or missing ledger is a hard error (exit 1).

  `replay_method` is always `"equivalence"` because the factory shells
  out to LLM workers when not in dry-run; even when dry-run substitutes
  deterministic stub workers, the SHAPE of the pipeline is an LLM
  pipeline. Equivalence framing acknowledges that bit-deterministic
  replay is not the contract; matching hashes plus matching gate
  results is.

  On every replay the script appends a `run.evidence.replayed` event
  to a NEW per-replay ledger at
  `ops/event-ledger/replay-<run-id>-<ISO-timestamp>.jsonl` and writes
  a detailed comparison report at
  `ops/replay-records/<run-id>/<replay-event-id>.json`. The event
  payload uses the typed schema added in Round 2: required `run_id`,
  `packet_ref`, `replay_equivalent`; optional `replay_method`
  populated as `"equivalence"`.

  Exit code is 0 when the three fields match, 1 on any divergence or
  precondition failure.
alternatives:
  - label: ship only a deterministic byte-replay command
    rejected_because: |
      The factory's worker layer calls `claude` and `codex` CLIs whose
      outputs are not byte-deterministic. Bit-deterministic replay
      would either require pinning a recorded transcript (which is a
      different artifact slice and a different contract) or refusing
      to claim replay at all. Equivalence framing matches the actual
      runtime: same inputs plus same emitter plus same HEAD plus same
      gates produces the same hashes and the same rollup. That is the
      strongest claim the factory can honestly ship today.
  - label: leave HEAD verification soft
    rejected_because: |
      A soft check (warn but proceed) lets a replay run claim
      equivalence while executing against a different tree than the
      one the recorded sample was produced from. Cross-repo packet
      consumers cannot tell the difference from the recorded
      `sandbox_image_ref`, so a soft check would silently invalidate
      the trust the packet carries. Strict HEAD verification keeps the
      packet's sandbox claim honest at the cost of one extra
      `git checkout` step before replay.
  - label: write the replay event into the same ledger as the original run
    rejected_because: |
      Appending the replay event to
      `ops/event-ledger/<run-id>.jsonl` would mix the original run's
      timeline with replay metadata. The validator's done-cross-checks
      compare `pipeline.start` hashes against the Run record; sneaking
      a `run.evidence.replayed` event into the same file does not
      break those checks today, but it confuses cross-repo consumers
      that key off the per-run ledger as the run's immutable timeline.
      The separate `replay-<run-id>-<timestamp>.jsonl` ledger makes
      the replay an independent record without touching the source.
  - label: omit the detailed comparison report
    rejected_because: |
      The single `run.evidence.replayed` event carries only a boolean
      `replay_equivalent`. When a replay diverges, a reviewer needs
      per-field detail to find the cause (which hash drifted, what
      were the two values). The report at
      `ops/replay-records/<run-id>/<event-id>.json` carries the full
      field comparison plus both run summaries; the event's
      `packet_ref` points at it so downstream consumers can fetch the
      detail when needed.
rationale: |
  This DEC amends DEC-FACTORY-008. DEC-FACTORY-007 named the emission
  contract, DEC-FACTORY-008 named the cross-check discipline that
  binds Run records to ledgers, and this DEC closes the
  engineering-grade replay claim by shipping the command that
  EXERCISES that discipline end-to-end.

  Before this slice, the factory wrote a conformant ledger plus a
  conformant Run record on every run, and the validator gate kept the
  two in lockstep. What was missing was the third leg: a way to
  RE-EXECUTE a recorded run and confirm the recorded hashes still
  hold. Without that step, the replay-equivalence fields are evidence
  of what a single run produced but not evidence that the run is
  reproducible.

  The equivalence framing is load-bearing. The factory's non-dry-run
  workers shell out to live LLMs whose outputs vary; bit-deterministic
  replay would be a lie even with identical inputs. Dry-run replaces
  workers with deterministic stubs (the test surface), so the actual
  COMPUTATION inside this replay is bit-deterministic. The shape it
  exercises — plan, implement, gate, review — is the LLM pipeline
  shape. Equivalence is the honest contract: the same inputs plus the
  same emitter plus the same HEAD reproduces the same hashes and the
  same gate rollup, whether or not the inner worker calls would have
  produced byte-identical text.

  Strict HEAD verification is the cheap way to make the packet's
  `sandbox_image_ref` honest. The recorded SHA on the Run record names
  the exact tree the run executed against; a replay at a different
  HEAD might pass equivalence today on a stable codebase but would
  silently mask drift the moment the pipeline or emitter changes.
  Failing fast with a `git checkout <sha>` instruction is the right
  tradeoff: it costs one extra step before replay, and it preserves
  the audit trail.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: decision
    ref: decisions/DEC-FACTORY-008-factory-run-evidence-cross-checks.md
  - kind: doc
    ref: scripts/replay_run.py
  - kind: doc
    ref: tests/factory/test_replay_run.py
  - kind: run
    ref: ops/run-records/run-16a7bf515611.json
  - kind: artifact
    ref: ops/event-ledger/replay-run-16a7bf515611-2026-05-28T12-23-12Z.jsonl
  - kind: artifact
    ref: ops/replay-records/run-16a7bf515611/05c783cb-b12d-427c-beb2-2a77c34cd339.json
rollback: |
  Delete `scripts/replay_run.py` and `tests/factory/test_replay_run.py`.
  Drop the `R-FACTORY-RUN-EVIDENCE-011..014` requirements and their
  traceability rows from
  `specs/0009-factory-dev-control-plane/requirements.md`,
  `acceptance.md`, `tasks.md`, `STATUS.md`, and `traceability.md`.
  Delete the committed replay artifacts under
  `ops/event-ledger/replay-*.jsonl` and `ops/replay-records/`. Restore
  the committed sample's `sandbox_image_ref` back to its prior SHA if
  the refresh in commit `edfebb7` is also being undone. Delete this
  DEC. No data migration is needed because the records are append-only
  audit trails.
owner: control.coordinator
---

## decision

The factory ships `scripts/replay_run.py` for equivalence replay. The
script loads a recorded Run + ledger, verifies the current HEAD
matches the recorded sandbox SHA, re-runs the factory in dry-run mode
against the recorded task path, and compares three
replay-equivalence fields between recorded and fresh. `replay_method`
is `"equivalence"`. On every replay the script emits a
`run.evidence.replayed` event into a per-replay ledger and writes a
detailed comparison report; exit code is 0 when the three fields
match and 1 on any divergence or precondition failure.

## alternatives

- Ship only a deterministic byte-replay command: rejected because the
  worker layer calls LLM CLIs whose outputs are not byte-deterministic.
  Equivalence framing matches the actual runtime contract.
- Leave HEAD verification soft: rejected because a soft check lets a
  replay claim equivalence against a different tree than the recorded
  one, silently invalidating the packet's `sandbox_image_ref` trust.
- Write the replay event into the same ledger as the original run:
  rejected because mixing replay metadata into the run's timeline
  confuses cross-repo consumers that key off the per-run ledger as
  the run's immutable timeline.
- Omit the detailed comparison report: rejected because a single
  boolean leaves no debugging surface when replay diverges.

## rationale

This DEC amends DEC-FACTORY-008. DEC-FACTORY-007 named the emission
contract, DEC-FACTORY-008 named the cross-check discipline that binds
Run records to ledgers, and this DEC ships the command that EXERCISES
that discipline end-to-end. The equivalence framing acknowledges that
non-dry-run workers call live LLMs whose outputs vary; the shape they
exercise is the LLM pipeline shape, and matching hashes plus matching
gate rollup is the strongest claim the factory can honestly ship
today.

## evidence

- `specs/0009-factory-dev-control-plane/requirements.md` adds the
  `R-FACTORY-RUN-EVIDENCE-011..014` requirements this DEC resolves.
- `decisions/DEC-FACTORY-008-factory-run-evidence-cross-checks.md` is
  the parent DEC this one amends.
- `scripts/replay_run.py` is the replay command itself.
- `tests/factory/test_replay_run.py` covers the positive replay path
  plus four negative cases (HEAD mismatch, missing Run record,
  missing ledger, synthetic divergence).
- `ops/run-records/run-16a7bf515611.json` is the committed sample the
  replay was first run against.
- `ops/event-ledger/replay-run-16a7bf515611-2026-05-28T12-23-12Z.jsonl`
  is the first committed replay ledger.
- `ops/replay-records/run-16a7bf515611/05c783cb-b12d-427c-beb2-2a77c34cd339.json`
  is the matching replay report.

## rollback

Delete the replay script + tests, drop the
`R-FACTORY-RUN-EVIDENCE-011..014` requirements + traceability rows,
delete the committed replay artifacts, restore the sample's
`sandbox_image_ref` if reverting that refresh, and delete this DEC.
No data migration needed because the records are append-only audit
trails.

## coverage

This DEC resolves the following requirements added to spec
`0009-factory-dev-control-plane`:

- `R-FACTORY-RUN-EVIDENCE-011` factory ships `scripts/replay_run.py`
  with the documented CLI.
- `R-FACTORY-RUN-EVIDENCE-012` replay command performs strict HEAD
  verification against `Run.sandbox_image_ref` and exits 1 with a
  `git checkout` instruction on mismatch.
- `R-FACTORY-RUN-EVIDENCE-013` replay emits a `run.evidence.replayed`
  event to `ops/event-ledger/replay-<run-id>-<ISO-timestamp>.jsonl`
  with `replay_method == "equivalence"` and a `packet_ref` to the
  report.
- `R-FACTORY-RUN-EVIDENCE-014` replay writes a detailed comparison
  report at `ops/replay-records/<run-id>/<replay-event-id>.json`
  carrying the per-field comparison for `prompt_snapshot_hash`,
  `tool_schemas_snapshot_hash`, and `gate_results_summary`.
