# acceptance: engine property test battery

## Acceptance gates

### Test battery

- `python -m uv run pytest tests/property/` passes locally and in
  CI with the full battery active.
- Every R-PROP-* requirement maps to a passing test file; spec_check
  passes against the spec.
- The Hypothesis seed is fixed; rerunning the battery on the same
  commit yields identical pass/fail outcomes.
- On a deliberate counterexample seed, the battery fails red and
  uploads the `.hypothesis/` directory as a CI artifact (manual proof
  during W2 ship; can be re-executed by a code-reviewer).

### Mechanism coverage

- The mechanism registry under `tests/property/registry.py` lists
  every mechanism identifier the SDK exposes (spec 0015 R-NASH-009).
- Adding a new mechanism to the registry causes every applicable
  property test to cover it without further changes.

### Workflow

- `.github/workflows/engine-properties.yml` runs on PRs touching
  `src/procurement_lab/`, `packages/engine/`, or `tests/property/`.
- The workflow caps at 10 minutes; `pytest-timeout` enforces per-test
  ceilings.
- The workflow's CI artifact upload activates on red runs only.

### Documentation + governance

- `docs/algorithms.md` references the property battery as the
  proof-of-claims layer for every mathematical claim the lab makes.
- DEC-PROP-001 is approved with all four systems-thinking fields
  populated.
- `python scripts/voice_lint.py` clean across docs touched by the
  spec.
- `python scripts/spec_check.py` clean.
- `npm.cmd run build` passes (TS engine mirror compiles for the
  parity test).
- Browser QA pass not required by this spec; spec 0017 is engine
  + test layer.
