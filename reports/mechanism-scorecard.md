# Mechanism Scorecard

| Scenario | Mechanism | Convergence | Oracle gap | Residual | Utility | Fits capacity | Transfer | Failure |
| --- | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| base | centralized_oracle | converged | 0.0000 | 0.0000 | 35000.0000 | True | n/a | n/a |
| base | admm | converged | 0.0000 | 0.0000 | 35000.0000 | True | True | n/a |
| base | alternating_best_response | not_converged | 1900.0000 | 50.0000 | 33100.0000 | True | True | n/a |
| base | price_only_dual | not_converged | 13650.0000 | 412.5000 | 21350.0000 | True | True | n/a |
| base | consensus_averaging | not_converged | 6175.0000 | 56.8750 | 28825.0000 | True | True | n/a |
| base | weighted_nash_plaintext | converged | 301.5873 | 0.0000 | 34698.4127 | True | True | n/a |
| base | weighted_nash_bounded | converged | 432.3747 | 0.0000 | 34567.6253 | True | True | n/a |
| base | weighted_nash_mpc | converged | 301.5873 | 0.0000 | 34698.4127 | True | True | n/a |
| risky | centralized_oracle | converged | 0.0000 | 0.0000 | 32200.0000 | True | n/a | n/a |
| risky | admm | converged | 0.0000 | 0.0000 | 32200.0000 | True | True | n/a |
| risky | alternating_best_response | not_converged | 1635.0000 | 37.5000 | 30565.0000 | True | True | n/a |
| risky | price_only_dual | not_converged | 13160.0000 | 412.5000 | 19040.0000 | True | True | n/a |
| risky | consensus_averaging | not_converged | 7085.0000 | 56.8750 | 25115.0000 | True | True | n/a |
| risky | weighted_nash_plaintext | converged | 346.0317 | 0.0000 | 31853.9683 | True | True | n/a |
| risky | weighted_nash_bounded | converged | 496.0931 | 0.0000 | 31703.9069 | True | True | n/a |
| risky | weighted_nash_mpc | converged | 346.0317 | 0.0000 | 31853.9683 | True | True | n/a |
| multi_party | centralized_oracle | converged | 0.0000 | 0.0000 | 39500.0000 | True | n/a | n/a |
| multi_party | admm | converged | 0.0000 | 0.0000 | 39500.0000 | True | True | n/a |
| multi_party | alternating_best_response | error | n/a | n/a | n/a | n/a | False | NotImplementedError |
| multi_party | price_only_dual | error | n/a | n/a | n/a | n/a | False | NotImplementedError |
| multi_party | consensus_averaging | error | n/a | n/a | n/a | n/a | False | NotImplementedError |
| multi_party | weighted_nash_plaintext | converged | 3310.4762 | 0.0000 | 36189.5238 | True | True | n/a |
| multi_party | weighted_nash_bounded | converged | 9120.0000 | 0.0000 | 30380.0000 | True | True | n/a |
| multi_party | weighted_nash_mpc | no_deal | 82500.0000 | 0.0000 | -43000.0000 | True | False | no_feasible_allocation |
| tight_capacity | centralized_oracle | converged | 0.0000 | 0.0000 | 2120.0000 | True | n/a | n/a |
| tight_capacity | admm | converged | n/a | 0.0000 | 42160.0000 | False | True | n/a |
| tight_capacity | alternating_best_response | not_converged | n/a | 50.0000 | 39960.0000 | False | True | n/a |
| tight_capacity | price_only_dual | not_converged | n/a | 475.0000 | 19830.0000 | False | True | n/a |
| tight_capacity | consensus_averaging | not_converged | n/a | 56.8750 | 35460.0000 | False | True | n/a |
| tight_capacity | weighted_nash_plaintext | converged | n/a | 0.0000 | 42160.0000 | False | True | n/a |
| tight_capacity | weighted_nash_bounded | converged | n/a | 0.0000 | 41589.7508 | False | True | n/a |
| tight_capacity | weighted_nash_mpc | converged | n/a | 0.0000 | 42160.0000 | False | True | n/a |

Oracle gap is `oracle utility - mechanism utility`. The oracle is the capacity-constrained optimum, so a scored gap is never negative. A row whose allocation does not fit capacity has no gap (n/a): its utility describes a plan the supplier cannot deliver.

A no_deal row reports the ledger at the walk-away allocation of zero units, so its utility is the cost of not trading (shortage and stockout penalties), not a negotiated outcome. An error row is a mechanism that does not run on that scenario shape. Both mark a mechanism outside its contract: the MPC path is two-party only by design (DEC-MPC-001), as are the simple baselines.

Failure notes:

- multi_party / alternating_best_response (error, NotImplementedError): alternating_best_response v0 supports 2 participants only
- multi_party / price_only_dual (error, NotImplementedError): price_only_dual v0 supports 2 participants only
- multi_party / consensus_averaging (error, NotImplementedError): consensus_averaging v0 supports 2 participants only
- multi_party / weighted_nash_mpc (no_deal, no_feasible_allocation): MPC mode supports N=2 only; N>=3 lands in a follow-up DEC adopting MP-SPDZ as the cryptographic backend

Best mechanism for base: admm
Best mechanism for risky: admm
Best mechanism for multi_party: admm
Best mechanism for tight_capacity: none (no non-oracle allocation fits capacity)
