# Mechanism Sensitivity Report

Eight deterministic stress cells vary demand volatility, capacity, and supplier risk. Volatility produces a deterministic stressed demand outcome of base forecast plus volatility.

| Mechanism | Scenarios | Converged | Transfer feasible | Allocation feasible | Disclosure-limited | Mean oracle gap | Worst oracle gap | Mean utility (fits capacity) | Qualifies |
| --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| centralized_oracle | 8 | 8 (100%) | 0 (0%) | 8 (100%) | 0 | 0.0000 | 0.0000 | 21840.0000 | False |
| admm | 8 | 8 (100%) | 8 (100%) | 4 (50%) | 0 | 0.0000 | 0.0000 | 39412.0000 | True |
| alternating_best_response | 8 | 0 (0%) | 8 (100%) | 4 (50%) | 0 | 2199.5000 | 2328.0000 | 37212.5000 | False |
| price_only_dual | 8 | 0 (0%) | 8 (100%) | 4 (50%) | 0 | 21392.0000 | 23668.0000 | 18020.0000 | False |
| consensus_averaging | 8 | 0 (0%) | 8 (100%) | 2 (25%) | 0 | 6077.0000 | 6431.0000 | 29995.0000 | False |
| weighted_nash_plaintext | 8 | 8 (100%) | 8 (100%) | 4 (50%) | 0 | 0.0000 | 0.0000 | 39412.0000 | True |
| weighted_nash_bounded | 8 | 8 (100%) | 8 (100%) | 4 (50%) | 8 | 558.9362 | 641.6223 | 38853.0638 | True |
| weighted_nash_mpc | 8 | 8 (100%) | 8 (100%) | 4 (50%) | 8 | 0.0000 | 0.0000 | 39412.0000 | True |

Interpretation: oracle gap is the SDK field `oracle utility - mechanism utility`. The oracle searches every whole unit from zero to capacity plus the demand and capacity breakpoints, which is the exact optimum for these utility formulas, so no scored gap is negative. A cell whose allocation exceeds capacity is not scored: its oracle gap is null in the JSONL and its utility is left out of the mean.

Ranking rule (DEC-SDK-005): a mechanism qualifies when it converges with a feasible transfer in every cell. Qualifying mechanisms rank by allocation-feasible cells (more first), worst oracle gap, mean oracle gap, then disclosure-limited cells (more first). A tie that survives every key is reported as a tie, never broken by mechanism name.

Ranking of qualifying mechanisms:

1. weighted_nash_mpc
2. admm, weighted_nash_plaintext (tied)
4. weighted_nash_bounded

Recommendation: weighted_nash_mpc. It fits capacity in 4 of 8 cells; the other cells are unscored because the allocation exceeds capacity.
