# Status

## Current state

The headless mechanism-sensitivity report runs the public SDK across eight deterministic stress cells and writes reproducible JSONL and Markdown artifacts. Recommendations follow the ratified rule: convergence and transfer feasibility in every cell. The report shows allocation-capacity feasibility separately rather than silently changing that rule. Qualifying mechanisms rank by allocation-feasible cells, worst oracle gap, mean oracle gap, then disclosure-limited cells (DEC-SDK-005); a tie that survives every key is reported, never broken by name.

## Known limits

The report is a learning-lab stress test with public synthetic inputs; it is not a production procurement recommendation system.
The centralized oracle searches every whole unit from zero to capacity plus the
demand and capacity breakpoints. That is the exact optimum for the shipped
piecewise-linear utilities and a 1-unit search for an arbitrary authored
formula. Allocations above capacity carry no oracle gap, so no scored gap is
negative.
No non-oracle mechanism enforces capacity in its own search, so every one of
them is unscored in the capacity-360 stress cells.

## Next feature queue

- Add user-facing visualization only after a matching active specification is approved.
- Give the non-oracle mechanisms a local capacity constraint so the
  feasibility ranking key can separate them.
