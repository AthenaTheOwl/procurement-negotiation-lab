---
id: DEC-FACTORY-020-scheduled-replay-freshness-commit
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-RUN-EVIDENCE-036
date: 2026-10-12
status: approved
reversible: true
amends: DEC-FACTORY-011-procurement-negotiation-lab-ci-enforces-run-evidence-chain
decision: |
  procurement-negotiation-lab adds `.github/workflows/replay-freshness.yml`,
  a scheduled workflow (`cron: "17 6 1,15 * *"` plus
  `workflow_dispatch`) that replays the canonical sample
  `run-960d6b107160` and commits the dated replay record.

  The replay steps are the ones in `run-evidence-gates.yml`,
  unchanged: install the sibling trace-to-eval-harness, save
  today's finalized `ops/run-records/run-960d6b107160.json` and
  `scripts/replay_run.py`, check out the recorded sandbox SHA
  (`a76e337`), restore the two saved files, and run
  `python scripts/replay_run.py --run-id run-960d6b107160`. The
  replay runs in the checked-out clone, not a `git worktree`,
  because `replay_run.py` is HEAD-strict and resolves `src/` from
  the clone it runs in.

  Only a replay that exits 0 is committed. The workflow then finds
  the one new report under `ops/replay-records/run-960d6b107160/`
  and the one new `ops/event-ledger/replay-run-960d6b107160-*.jsonl`,
  checks that the ledger event's `packet_ref` names that report and
  that the report says `replay_equivalent: true` and carries
  `finished_at`, restores the two overlaid paths, returns to `main`,
  and stages exactly the report and the ledger. The commit is made
  as `github-actions[bot]` and pushed with the workflow's
  `GITHUB_TOKEN` (`permissions: contents: write`). A failed run
  commits nothing and opens an issue.

  Only `run-960d6b107160` is replayed. It is the one Run record with
  dry-run-shaped gate results; the Run records that carry `@PENDING`
  stay PENDING, and the workflow does not touch them.
alternatives:
  - label: grant contents write to the existing run-evidence-gates job
    rejected_because: |
      `run-evidence-gates.yml` runs on every pull request and every
      push. Committing from it would add a bot commit per push and
      would need write access on pull-request runs, which a contract
      gate should not hold. Replay freshness is a calendar property,
      so it belongs on a schedule.
  - label: keep replaying by hand when the evidence window closes
    rejected_because: |
      The newest replay record before 2026-10-12 was dated
      2026-09-12, so the 30-day window closed and the evidence-quorum
      check failed before the hand replay landed. A schedule shorter
      than the window removes the gap.
  - label: replay in a git worktree so the main checkout never moves
    rejected_because: |
      `replay_run.py` is HEAD-strict and the factory dry-run it drives
      resolves `src/` from the clone the editable install points at.
      A worktree at the sandbox SHA would run today's `src/`, so the
      replay would not test the recorded code.
rationale: |
  DEC-FACTORY-011 made the replay a contract gate, and it already
  replays the canonical sample on every push, but under
  `contents: read`, so the record it writes is discarded with the
  runner. The committed records are what an outside reader can
  check, and the newest of them ages: athena-site's evidence-quorum
  check counts a repo only when it has a replay record dated within
  30 days, read from `finished_at`. Running the same replay twice a
  month and keeping the record closes that gap without changing what
  the replay proves.

  The workflow commits two files and no others. `git add -A` would
  also pick up anything the replay or the pip install left behind,
  so the step stages the report and its ledger by name, then
  compares the staged set against those two paths before committing.
  The report does not name its ledger, so the ledger is matched by
  the event's `packet_ref` instead. A push made with `GITHUB_TOKEN`
  does not start other workflows, so the bot commit does not re-run
  the gates.
evidence:
  - kind: decision
    ref: decisions/DEC-FACTORY-011-procurement-negotiation-lab-ci-enforces-run-evidence-chain.md
  - kind: doc
    ref: .github/workflows/replay-freshness.yml
  - kind: doc
    ref: .github/workflows/run-evidence-gates.yml
  - kind: doc
    ref: scripts/replay_run.py
  - kind: doc
    ref: scripts/spec_check.py
  - kind: doc
    ref: ops/run-records/run-960d6b107160.json
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
rollback: |
  Delete `.github/workflows/replay-freshness.yml`, drop its entry
  from `REQUIRED_WORKFLOW_PROOFS` in `scripts/spec_check.py`, and
  remove `R-FACTORY-RUN-EVIDENCE-036` from `requirements.md`,
  `traceability.md`, and `tasks.md`. Replay records the workflow
  already committed stay; they are ordinary replay artifacts.
  `run-evidence-gates.yml` keeps running.
owner: control.coordinator
systems_map: |
  An evidence chain whose proof artifacts expire on a calendar but
  are produced only on demand. The replay already ran on every push;
  the record it produced was thrown away, so freshness depended on a
  person noticing the window had closed.
transferable_principle: |
  When a check reads the age of an artifact, the artifact needs a
  producer on a schedule shorter than the window, and the producer
  should commit only the artifact, not whatever else the run left in
  the tree.
falsification_test: |
  If the evidence-quorum check reports this repo as failing while
  the workflow is enabled and its last scheduled run succeeded, the
  schedule or the commit step is not doing what this DEC claims.
adoption_ladder:
  minimum_viable: |
    One scheduled workflow that replays the canonical sample and
    commits the record and its ledger after a successful replay.
  mid_adoption: |
    An issue opens on a failed replay, and the same workflow runs in
    every repo the evidence-quorum check watches.
  full_adoption: |
    The quorum check reads the workflow's last run as well as the
    record dates, so a disabled schedule shows up before the window
    closes.
  monitoring_signals:
    - replay-freshness run status per scheduled run
    - age of the newest record under ops/replay-records/
    - issues opened by the failure step
---

## decision

procurement-negotiation-lab adds `.github/workflows/replay-freshness.yml`.
On the 1st and 15th of each month (and on manual dispatch) it runs
the replay sequence from `run-evidence-gates.yml` against the
canonical sample `run-960d6b107160` at its sandbox SHA, then commits
the new replay record and its per-replay ledger to `main` as
`github-actions[bot]`. Nothing is committed unless the replay exits
0, the record carries `replay_equivalent: true` and `finished_at`,
and the ledger event points at that record. A failed run opens an
issue. The `@PENDING` Run records are not replayed.

## alternatives

- Grant write access to the existing run-evidence-gates job:
  rejected, because it runs on every pull request and push, and a
  contract gate should not hold write access.
- Keep replaying by hand: rejected, because the 2026-09-12 record
  aged out before the 2026-10-12 hand replay landed.
- Replay in a `git worktree`: rejected, because the replay has to
  run the recorded `src/`, which only the checked-out clone carries.

## rationale

The replay gate already proves the sandbox SHA reproduces the
recorded run on every push, but the record it writes leaves with the
runner. Committing one record twice a month keeps a dated,
inspectable proof in `ops/replay-records/` inside the 30-day window
that athena-site's evidence-quorum check reads. The workflow stages
two named paths and checks the staged set before committing, so the
bot commit never carries more than the replay produced.

## evidence

- `.github/workflows/replay-freshness.yml` is the new workflow.
- `.github/workflows/run-evidence-gates.yml` carries the replay
  sequence the new workflow copies.
- `scripts/spec_check.py` registers the new workflow's proof tokens
  in `REQUIRED_WORKFLOW_PROOFS`.
- `scripts/replay_run.py` writes the report with `started_at` and
  `finished_at`, and the ledger event's `packet_ref` names it.

## rollback

Delete `.github/workflows/replay-freshness.yml`, drop its
`REQUIRED_WORKFLOW_PROOFS` entry, and remove
`R-FACTORY-RUN-EVIDENCE-036` from the spec files. Records already
committed stay.

## coverage

This DEC resolves the following requirement added to spec 0009:

- `R-FACTORY-RUN-EVIDENCE-036` a scheduled workflow replays the
  canonical sample and commits only the new replay record and its
  ledger after a replay that exits 0.
