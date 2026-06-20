# Spec 0018 — Acceptance

## Gates that must pass before this spec is shipped

```bash
cd e:/claude_code/random-apps/procurement-negotiation-lab

# v2-lite tests
python -m pytest tests/factory/test_v2_lite.py -q
# expect: 14 passed

# Full factory suite stays green
python -m pytest tests/factory/ -q
# expect: 135 passed, 1 skipped

# Migration is idempotent: reopen a fresh + a populated DB
python -c "from scripts.factory.state import Store; \
import tempfile, os; \
d=tempfile.mkdtemp(); \
p=os.path.join(d,'factory.db'); \
s1=Store(path=p); s1.upsert_task('t','t','t'); s1.close(); \
s2=Store(path=p); r=s2.get_task('t'); assert r.phase is None; s2.close()"
# expect: no error; reopened row has phase=None (pre-v2 row, unset)

# voice_lint clean on new files
python scripts/voice_lint.py specs/0018-factory-v2-lite-pilot/
# expect: 0 hits

# spec_check passes
python scripts/spec_check.py 0018
# expect: spec 0018 is well-formed
```

## Pilot acceptance (per pilot repo, before the DEC writes "go")

```bash
# Each pilot repo's 3 task YAMLs load cleanly
python -m scripts.factory.run --task ops/factory-tasks/pilot-<slug>/design-review.yaml --dry-run
python -m scripts.factory.run --task ops/factory-tasks/pilot-<slug>/impl.yaml --dry-run
python -m scripts.factory.run --task ops/factory-tasks/pilot-<slug>/test-matrix.yaml --dry-run

# After real runs, each pilot's repo should be runnable:
cd e:/claude_code/random-apps/<slug>
python -m pytest tests/ -q          # for python repos
# OR
node scripts/render_cards.js        # for promotion-vs-pip / oulipo-memory-deck
```

## Kill-or-continue criteria (all four must hold to scale to 39)

1. **Caught real defects**: For each pilot, the dual-persona review (architecture-lens + security-lens) found at least one issue that a single-reviewer run would have missed. Evidence: side-by-side run logs comparing single vs dual.
2. **Produced runnable code**: For each pilot, `python -m <pkg>` (or equivalent) works on a fresh clone; unit tests pass.
3. **Cost acceptable**: Total spend across all 3 pilots ≤ $50 USD. Per-repo wall-clock ≤ 4 hrs.
4. **Output became more useful**: Each pilot produced one concrete artifact (a script, a dataset row, a card YAML, an export) that a human would actually use — not "more documentation about what we will eventually build."

## Out of scope

- Performance benchmarks
- Cross-pilot comparisons beyond the 4 criteria above
- Any change to the existing replay-determinism cross-check
