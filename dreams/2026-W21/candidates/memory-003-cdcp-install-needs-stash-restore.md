---
id: memory-003-cdcp-install-needs-stash-restore
target_kind: memory_update
target_path: .agents/AGENTS.md
week: 2026-W21
mode: memory_consolidation
human_review_required: true
status: promoted
promotion_date: 2026-05-24
evidence:
  - kind: commit
    ref: 3cd9314
  - kind: doc
    ref: decisions/DEC-CDCP-001-install-cdcp-governance.md
  - kind: doc
    ref: ops/event-log/2026-05-24.jsonl
  - kind: doc
    ref: .agents/AGENTS.md
---

## proposal

Add a short paragraph to `.agents/AGENTS.md` under "Workflow
conventions" that records the stash-and-restore precondition for
any future agent-install workflow. Suggested text:

> An agent-install workflow (CDCP-style install, role install,
> skill install) requires a clean working tree on entry. If
> uncommitted work is present, the workflow should `git stash`
> before the install, run the install on the clean tree, then
> `git stash pop` after. Refuse to run on a dirty tree without
> the stash step instead of committing the WIP alongside the
> install. The W21 CDCP install (commit `3cd9314`) landed on a
> clean tree by luck; the next install should make the
> precondition explicit.

## why it earns its keep

The CDCP install in commit `3cd9314` brought in 12 new files (the
governance scaffold). If it had landed on a tree with uncommitted
WIP, the WIP would either have ridden in on the install commit
(making the commit message lie) or been silently lost on a checkout.
A future role install or skill install will hit the same precondition;
recording it now means the next install workflow has the rule loaded.

## evidence

- `3cd9314 spec 0013: install full CDCP (base + operating model)` —
  the W21 install commit.
- `decisions/DEC-CDCP-001-install-cdcp-governance.md` — the decision
  that bundles the install pattern.
- `ops/event-log/2026-05-24.jsonl` line 1 — the `cdcp.installed`
  event that lists the 13 artifacts the install added.
- `.agents/AGENTS.md` — the file this candidate proposes to extend.

## promotion path

A `single-change` workflow run that edits `.agents/AGENTS.md` to
add the paragraph. Owner: `engineering.implementation`. Gates:
`voice_lint`, `spec_check.py`, standard push gates. A follow-on
backlog item could codify the precondition in a script
(`scripts/check_clean_tree.py`) but that is out of scope for the
memory update itself.

## risks if promoted blindly

- The "refuse to run on a dirty tree" rule is the safe default but
  can frustrate an operator who knows the install is independent of
  the WIP. The note should say "refuse without the stash step,"
  not "refuse outright."
- Future installs may have legitimate reasons to bundle WIP (a
  hotfix that depends on the install). The convention should
  describe the default, not forbid the exception.
