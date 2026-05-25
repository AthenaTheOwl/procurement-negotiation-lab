# mechanism-design SDK

`procurement_mechanism_sdk` is a thin Python package over the lab's
deterministic engine. It is for notebooks, scripts, and small demos that need
the reusable mechanism logic without starting the React app or Streamlit
compatibility entrypoint.

## Boundary

The SDK wraps these existing primitives:

- `procurement_lab.engine.schemas` for scenarios, participants, runs, and
  transfer plans
- `procurement_lab.algorithms.admm.ADMM`
- `procurement_lab.algorithms.oracle.CentralizedOracle`
- `procurement_lab.algorithms.simple` for educational comparison mechanisms
- `procurement_lab.engine.cbt.compute_transfer`

It does not move the TypeScript app engine, web levels, mobile screens,
factory subsystem, or browser-only sandbox code.

## Use

```python
from procurement_mechanism_sdk import (
    compare_mechanisms,
    compute_participation_report,
    sample_scenario,
)

scenario = sample_scenario("base")
comparison = compare_mechanisms(
    scenario,
    mechanisms=("centralized_oracle", "admm", "consensus_averaging"),
    max_iter=80,
    tolerance=0.5,
)
admm = comparison.by_mechanism["admm"]
report = compute_participation_report(admm, oracle_run=comparison.oracle_run)

print(admm.utility_gap_vs_oracle)
print(report.no_worse_off)
```

Standalone demo:

```powershell
python -m procurement_mechanism_sdk.demo
```

Installed command:

```powershell
procurement-mechanism-sdk-demo
```

The demo prints JSON with scenario id, mechanism results, oracle gap, residual,
and no-worse-off transfer status.
