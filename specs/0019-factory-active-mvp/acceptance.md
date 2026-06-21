# Spec 0019 — Acceptance

## Gates per PR

```bash
cd e:/claude_code/random-apps/procurement-negotiation-lab

# Lane A (Codex) PRs
python -m pytest tests/factory/ -q              # full factory suite must stay green
python -m pytest tests/factory/test_active_mvp_contract.py -v
python -m pytest tests/factory/test_handoff_packet.py -v
python -m pytest tests/factory/test_templates.py -v
python -m pytest tests/factory/test_privacy_canary.py -v
python -m pytest tests/factory/test_replay_run.py -v     # fixture regen must make this green

# Lane B (Claude) PRs
python scripts/voice_lint.py scripts/factory/templates/CONTRACT.md
python scripts/voice_lint.py scripts/factory/templates/*/task.yaml.tmpl
ls scripts/factory/templates/data-report/
ls scripts/factory/templates/product-control-plane/
```

## Pilot acceptance (kill-or-continue)

```bash
# Codex pilot: binding-constraint
python -m scripts.factory.run --new-task --template data-report \
  --repo binding-constraint --task-id pilot-fam-binding-constraint
# operator edits the generated YAML to fill goal + expected_artifacts
python -m scripts.factory.run --task ops/factory-tasks/pilot-fam-binding-constraint.yaml
# expected: status: done; all 6 contract artifacts present in AthenaTheOwl/binding-constraint

# Claude pilot: brief-calibration
python -m scripts.factory.run --new-task --template product-control-plane \
  --repo brief-calibration --task-id pilot-fam-brief-calibration
# operator edits
python -m scripts.factory.run --task ops/factory-tasks/pilot-fam-brief-calibration.yaml
# expected: same
```

For each pilot, verify in the target repo:

```bash
cd e:/claude_code/random-apps/<repo>
test -f PRODUCT_BRIEF.md            # R-FAM-V1-001
test -f SYSTEM_MAP.md               # R-FAM-V1-002
test -f specs/0002-design/requirements.md  # R-FAM-V1-003
test -f STATUS.md                   # R-FAM-V1-004
grep -E "## Current state|## Known limits|## Next feature queue" STATUS.md  # all 3 sections
# One real artifact (path varies; for data-report: reports/*.jsonl OR data/*.jsonl):
ls reports/ data/ examples/ 2>/dev/null | head
# Validation command in README:
grep -E "## How to run|python -m|npm test|node scripts" README.md
```

Plus check the factory ops side:

```bash
cd e:/claude_code/random-apps/procurement-negotiation-lab
test -f ops/handoffs/pilot-fam-binding-constraint.md       # handoff packet
test -f ops/factory-defects/pilot-fam-binding-constraint.jsonl  # defect log (may be empty array)
# next_feature_queue check:
grep "Next feature queue" e:/claude_code/random-apps/binding-constraint/STATUS.md
```

## 4-criterion pilot gate (R-FAM-V1-051)

All four MUST hold to proceed to batch 3:

1. **All 6 contract artifacts** present in both pilot repos
2. **No manual merges** — each phase's `commit.done` event fired without operator intervention
3. **Per-repo wall-clock ≤ 30 min** (lower than batch-2's per-phase cost because templates pre-fill more)
4. **next_feature_queue has ≥ 2 concrete entries** per pilot repo

If 4/4 → R-FAM-V1-060 fires. If 3/4 → R-FAM-V1-061. If ≤ 2/4 → R-FAM-V1-062.

## Schema-convergence check (before Lane A PR 1 merges)

Claude reviews Lane A PR 1's task.py additions against Lane B PR 1's template YAMLs. Both sides agree the field names + types match. Captured as a single review comment + thumbs-up before merge.
