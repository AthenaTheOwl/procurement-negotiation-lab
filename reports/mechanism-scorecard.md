# Mechanism Scorecard

| Scenario | Mechanism | Convergence | Oracle gap | Residual | Utility | Transfer | Failure |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| base | centralized_oracle | converged | 0.0000 | 0.0000 | 35000.0000 | n/a | n/a |
| base | admm | converged | 0.0000 | 0.0000 | 35000.0000 | True | n/a |
| base | alternating_best_response | not_converged | 1900.0000 | 50.0000 | 33100.0000 | True | n/a |
| base | price_only_dual | not_converged | 13650.0000 | 412.5000 | 21350.0000 | True | n/a |
| base | consensus_averaging | not_converged | 6175.0000 | 56.8750 | 28825.0000 | True | n/a |
| base | weighted_nash_plaintext | converged | 301.5873 | 0.0000 | 34698.4127 | True | n/a |
| base | weighted_nash_bounded | converged | 432.3747 | 0.0000 | 34567.6253 | True | n/a |
| base | weighted_nash_mpc | converged | 301.5873 | 0.0000 | 34698.4127 | True | n/a |
| risky | centralized_oracle | converged | 0.0000 | 0.0000 | 32200.0000 | n/a | n/a |
| risky | admm | converged | 0.0000 | 0.0000 | 32200.0000 | True | n/a |
| risky | alternating_best_response | not_converged | 1635.0000 | 37.5000 | 30565.0000 | True | n/a |
| risky | price_only_dual | not_converged | 13160.0000 | 412.5000 | 19040.0000 | True | n/a |
| risky | consensus_averaging | not_converged | 7085.0000 | 56.8750 | 25115.0000 | True | n/a |
| risky | weighted_nash_plaintext | converged | 346.0317 | 0.0000 | 31853.9683 | True | n/a |
| risky | weighted_nash_bounded | converged | 496.0931 | 0.0000 | 31703.9069 | True | n/a |
| risky | weighted_nash_mpc | converged | 346.0317 | 0.0000 | 31853.9683 | True | n/a |
| multi_party | centralized_oracle | converged | 0.0000 | 0.0000 | 39500.0000 | n/a | n/a |
| multi_party | admm | converged | 0.0000 | 0.0000 | 39500.0000 | True | n/a |
| multi_party | alternating_best_response | error | n/a | n/a | n/a | False | NotImplementedError |
| multi_party | price_only_dual | error | n/a | n/a | n/a | False | NotImplementedError |
| multi_party | consensus_averaging | error | n/a | n/a | n/a | False | NotImplementedError |
| multi_party | weighted_nash_plaintext | converged | 3310.4762 | 0.0000 | 36189.5238 | True | n/a |
| multi_party | weighted_nash_bounded | converged | 9120.0000 | 0.0000 | 30380.0000 | True | n/a |
| multi_party | weighted_nash_mpc | no_deal | 82500.0000 | 0.0000 | -43000.0000 | False | no_feasible_allocation |
| tight_capacity | centralized_oracle | converged | 0.0000 | 0.0000 | 41960.0000 | n/a | n/a |
| tight_capacity | admm | converged | 0.0000 | 0.0000 | 41960.0000 | True | n/a |
| tight_capacity | alternating_best_response | not_converged | 2000.0000 | 50.0000 | 39960.0000 | True | n/a |
| tight_capacity | price_only_dual | not_converged | 22130.0000 | 475.0000 | 19830.0000 | True | n/a |
| tight_capacity | consensus_averaging | not_converged | 6500.0000 | 56.8750 | 35460.0000 | True | n/a |
| tight_capacity | weighted_nash_plaintext | converged | -200.0000 | 0.0000 | 42160.0000 | True | n/a |
| tight_capacity | weighted_nash_bounded | converged | 370.2492 | 0.0000 | 41589.7508 | True | n/a |
| tight_capacity | weighted_nash_mpc | converged | -200.0000 | 0.0000 | 42160.0000 | True | n/a |

Best mechanism for base: admm
Best mechanism for risky: admm
Best mechanism for multi_party: admm
Best mechanism for tight_capacity: weighted_nash_mpc
