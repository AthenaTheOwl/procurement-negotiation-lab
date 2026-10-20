# acceptance: mechanism-design SDK

## Package

- `src/procurement_mechanism_sdk` exists and is included in `pyproject.toml`.
- The SDK imports existing deterministic primitives instead of moving app code.
- `procurement-mechanism-sdk-demo` is registered as a Python project script.

## API

- `sample_scenario()` and `build_procurement_scenario()` return engine
  `Scenario` objects.
- `solve_allocation()` delegates to existing mechanisms.
- `compare_mechanisms()` returns oracle-relative runs with gap and transfer
  data attached.
- `compute_participation_report()` reports CBT no-worse-off status and optional
  oracle gap.

## Proof gates

- `python -m uv run pytest`
- `python -m procurement_mechanism_sdk.demo`
- `python scripts/spec_check.py`
- `python scripts/voice_lint.py`
- `npm.cmd run build`
- Browser QA remains required before production readiness, but this SDK change
  does not add a new browser surface.

## Sensitivity report

- `python -m uv run python -m procurement_lab.sensitivity` writes 64 JSONL rows
  for the current eight-cell grid and eight-mechanism registry.
- Repeating the command with identical inputs produces byte-identical JSONL and
  Markdown artifacts.
- The Markdown rollup is recomputable from the JSONL rows.
- Recommendation eligibility depends only on all-cell convergence and transfer
  feasibility. Allocation feasibility and typed capacity failures remain
  visible as separate evidence.
- Qualifying mechanisms rank by allocation-feasible cells, worst gap, mean gap,
  then disclosure-limited cells; relabelling two mechanisms swaps their ranks
  and an exact tie is reported as a tie.
- No row has a negative oracle gap, and the oracle's capacity-360 utility is
  below its capacity-800 utility for the same demand and risk.
- An invalid report path exits one with `ERROR[sensitivity]:` and no traceback.
