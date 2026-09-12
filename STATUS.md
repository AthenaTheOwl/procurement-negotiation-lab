# Status

## Current state

The headless mechanism-sensitivity report runs the public SDK across eight deterministic stress cells and writes reproducible JSONL and Markdown artifacts. Recommendations follow the ratified rule: convergence and transfer feasibility in every cell. The report shows allocation-capacity feasibility separately rather than silently changing that rule.

## Known limits

The report is a learning-lab stress test with public synthetic inputs; it is not a production procurement recommendation system.
The SDK's oracle-gap field is a comparison under the current utility accounting,
not a certified global upper bound. Negative values therefore require model
interpretation rather than an optimality claim.

## Next feature queue

- Add user-facing visualization only after a matching active specification is approved.
- Reconcile weighted-Nash and centralized-oracle utility semantics before using
  the gap as an optimality claim.
