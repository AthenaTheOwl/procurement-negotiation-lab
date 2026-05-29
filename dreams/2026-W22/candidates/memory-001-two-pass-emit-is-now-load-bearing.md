---
id: memory-001-two-pass-emit-is-now-load-bearing
target_kind: memory_update
target_path: .agents/AGENTS.md
week: 2026-W22
mode: memory_consolidation
direction: anchor
cost: small
risk: low
timeline: next sprint
human_review_required: true
status: proposed
evidence:
  - kind: decision
    ref: decisions/DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration.md
  - kind: doc
    ref: scripts/finalize_sandbox_ref.py
  - kind: doc
    ref: scripts/replay_run.py
  - kind: commit
    ref: 7211c10
  - kind: commit
    ref: fd45fc4
  - kind: commit
    ref: 9fa7400
---

## idea

Add a paragraph to `.agents/AGENTS.md` under "Lessons promoted from
weekly dreams" that names the two-pass emit (`PENDING` placeholder
on first emit + `scripts/finalize_sandbox_ref.py` after the
sample-containing commit lands) as the canonical pattern for any
artifact that records its own producing commit's SHA.

## why

The `sandbox_image_ref` off-by-one bit four Round-5 agents
independently before DEC-FACTORY-010 made the fix structural. The
next agent that touches the run-evidence emitter (or implements a
similar self-referential SHA field in a sibling repo) will either
re-discover the bug or read the memory note and walk in with the
two-pass pattern already loaded. Closing a recurring trap is
exactly what `memory_consolidation` is for.

## cost

Small. One paragraph under the existing "Lessons promoted from
weekly dreams" section in `.agents/AGENTS.md`. Voice-lint and the
BOM gate cover style. No code change.

## risk

Low. The note targets `.agents/AGENTS.md` which the agent reads
first; an overlong note dilutes signal. Mitigation: keep it to
one paragraph that names the bug class, the structural fix, and
the two file pointers (`scripts/finalize_sandbox_ref.py` +
`scripts/replay_run.py::_extract_recorded_sha`). The pattern could
also drift if a future DEC changes the placeholder string or the
finalize-helper interface; that is an acceptable risk for a
structural fix that ships with its own DEC and rollback path.

## timeline

Next sprint (W23). One commit. Owner: `engineering.implementation`
via the `single-change` workflow.

## evidence

- `decisions/DEC-FACTORY-010-procurement-lab-portable-repo-uri-migration.md`
  names the bug class and the structural fix.
- `scripts/finalize_sandbox_ref.py` is the post-commit helper.
- `scripts/replay_run.py::_extract_recorded_sha` is the consumer
  that hard-errors on a PENDING placeholder.
- Commits `7211c10` (emit PENDING), `fd45fc4` (resolve + finalize),
  `9fa7400` (finalize sample) are the three-commit landing path
  the note points at.

## promotion path

A `single-change` workflow run that edits `.agents/AGENTS.md`
to add the paragraph. Gates: `voice_lint`, `check_no_bom`,
`spec_check`, the standard push gates. No code change.
