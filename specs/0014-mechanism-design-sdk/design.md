# design: mechanism-design SDK

## Package boundary

The SDK package is `src/procurement_mechanism_sdk`. It is deliberately thin:
it wraps the deterministic Python package already published by this repo.

```text
src/procurement_mechanism_sdk/
  __init__.py
  api.py
  demo.py
```

The package imports these existing modules:

- `procurement_lab.engine.schemas`
- `procurement_lab.algorithms.admm`
- `procurement_lab.algorithms.oracle`
- `procurement_lab.algorithms.simple`
- `procurement_lab.engine.cbt`

The TypeScript app engine under `packages/engine`, web surfaces under
`apps/web`, mobile surfaces under `apps/mobile`, and the factory subsystem
stay where they are.

## Public API

The SDK exports:

- `build_procurement_scenario()` for explicit deterministic scenario setup
- `sample_scenario()` for a stable base or risky sample case
- `solve_allocation()` for one mechanism run
- `compare_mechanisms()` for oracle-relative comparison runs
- `compute_participation_report()` for CBT no-worse-off and oracle-gap reporting

The SDK returns existing Pydantic engine objects where possible. Thin dataclass
containers are used only for comparison and participation reports.

## Demo

`python -m procurement_mechanism_sdk.demo` builds the base scenario, compares
the centralized oracle, ADMM, and consensus averaging, then prints JSON. It has
no web app or Streamlit dependency at runtime beyond the package dependencies
already present in the project.

## Sensitivity report

`procurement_lab.sensitivity` composes `build_procurement_scenario()` and
`compare_mechanisms()` without adding a solver or parser. It evaluates the
default mechanism registry over a fixed 2 x 2 x 2 grid, then writes a sorted
JSONL evidence stream and a Markdown rollup under `reports/`.

Recommendation is a narrow decision rule. A non-oracle mechanism qualifies
only when every cell converges and every transfer is feasible. Allocation
feasibility is recorded independently so a reader can see capacity failures
without silently changing the ratified recommendation rule. Ranking among
qualifying mechanisms uses worst oracle gap, mean oracle gap, then mechanism
name.
