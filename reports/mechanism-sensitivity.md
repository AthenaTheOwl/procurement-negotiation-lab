# Mechanism Sensitivity Report

Eight deterministic stress cells vary demand volatility, capacity, and supplier risk. Volatility produces a deterministic stressed demand outcome of base forecast plus volatility.

| Mechanism | Scenarios | Converged | Transfer feasible | Allocation feasible | Mean oracle gap | Worst oracle gap | Mean utility | Qualifies |
| --- | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| centralized_oracle | 8 | 8 (100%) | 0 (0%) | 4 (50%) | 0.0000 | 0.0000 | 39000.0000 | False |
| admm | 8 | 8 (100%) | 8 (100%) | 4 (50%) | 455.0000 | 1820.0000 | 38545.0000 | True |
| alternating_best_response | 8 | 0 (0%) | 8 (100%) | 4 (50%) | 1787.5000 | 1940.0000 | 37212.5000 | False |
| price_only_dual | 8 | 0 (0%) | 8 (100%) | 4 (50%) | 20980.0000 | 23280.0000 | 18020.0000 | False |
| consensus_averaging | 8 | 0 (0%) | 8 (100%) | 2 (25%) | 6180.0000 | 7085.0000 | 32820.0000 | False |
| weighted_nash_plaintext | 8 | 8 (100%) | 8 (100%) | 4 (50%) | -412.0000 | -388.0000 | 39412.0000 | True |
| weighted_nash_bounded | 8 | 8 (100%) | 8 (100%) | 4 (50%) | 146.9362 | 205.6223 | 38853.0638 | True |
| weighted_nash_mpc | 8 | 8 (100%) | 8 (100%) | 4 (50%) | -412.0000 | -388.0000 | 39412.0000 | True |

Interpretation: oracle gap is the SDK field `oracle utility - mechanism utility`. A negative value means the mechanism scored higher under the current utility accounting; it is not a certified global-optimality result.

Recommendation: weighted_nash_mpc.
