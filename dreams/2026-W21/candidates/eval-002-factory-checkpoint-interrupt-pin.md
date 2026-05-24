---
id: eval-002-factory-checkpoint-interrupt-pin
target_kind: test_generation
target_path: tests/factory/test_checkpoint_interrupts.py
week: 2026-W21
mode: eval_generation
human_review_required: true
evidence:
  - kind: decision
    ref: decisions/DEC-FACTORY-002-spec-tasks-expanded-into-review-gated-yaml.md
  - kind: decision
    ref: decisions/DEC-FACTORY-003-bounded-dual-review-conservative-aggregation.md
  - kind: doc
    ref: scripts/factory/pipeline.py
  - kind: doc
    ref: scripts/factory/task.py
  - kind: commit
    ref: 7500aa7
---

## proposal

Add a pytest module at `tests/factory/test_checkpoint_interrupts.py`
that asserts the checkpoint pause/resume contract end-to-end:

1. A task YAML with `checkpoints: [plan_review]` paused at
   `plan_review` emits a `checkpoint.paused` event with the
   expected payload and leaves the task row at
   `status='awaiting_approval'` and
   `awaiting_checkpoint='plan_review'`.
2. A resume call with `resume_from='plan_review'` emits a
   `checkpoint.resumed` event, reuses the stored plan artifact,
   and proceeds through the implement loop.
3. The same dance for `diff_review` and `pre_pr` checkpoints.
4. A reject call (`reject_task`) on a paused task emits
   `checkpoint.rejected` and marks the task `status='rejected'`.

The existing pytest factory suite covers parts of this path; the
new module pins the full pause/resume/reject contract in one place.

## why it earns its keep

DEC-FACTORY-002 makes `plan_review` and `diff_review` the default
checkpoints for every spec-expanded task. DEC-FACTORY-003 makes
the multi-reviewer aggregation hinge on the round-by-round event
stream. A regression that drops the pause (a refactor that
"simplifies" the awaiting-approval path) would turn the factory
into a no-checkpoints pipeline and skip every human review gate
silently. The factory tests pass today; one focused module that
walks the contract end-to-end turns the regression loud instead of
silent.

## evidence

- `decisions/DEC-FACTORY-002-spec-tasks-expanded-into-review-gated-yaml.md`
  — names plan/diff checkpoints as the default for generated tasks.
- `decisions/DEC-FACTORY-003-bounded-dual-review-conservative-aggregation.md`
  — names the per-reviewer `review.done` event as the aggregation
  input.
- `scripts/factory/pipeline.py` — `run_pipeline`'s checkpoint
  branches (`plan_review`, `diff_review`, `pre_pr`) and
  `reject_task`.
- `scripts/factory/task.py` — `VALID_CHECKPOINTS` and the
  checkpoint loader path.
- `7500aa7` — the W21 commit that landed the DECs the test would pin.

## promotion path

A `single-change` workflow run that adds the test file under
`tests/factory/`. Owner: `engineering.implementation`. Gates: the
existing `python -m uv run pytest` runs the new module; ruff and
mypy strict cover style and type correctness.

## risks if promoted blindly

- An end-to-end test that uses real subprocess calls would be slow
  and flaky. The test must use the `StubWorker` path (already
  available via `resolve_worker` with `allow_stub_fallback=True`)
  and a tmp-path SQLite store.
- Pinning every event name in the test makes the test brittle to
  legitimate event renames. The test should assert on a small,
  named subset (`checkpoint.paused`, `checkpoint.resumed`,
  `checkpoint.rejected`) and not on the full event stream.
