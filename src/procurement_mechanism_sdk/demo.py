"""Standalone SDK demo.

Run with:
    python -m procurement_mechanism_sdk.demo
"""

from __future__ import annotations

import json
from argparse import ArgumentParser

from procurement_mechanism_sdk.api import (
    DEFAULT_MECHANISMS,
    compare_mechanisms,
    compute_participation_report,
    sample_scenario,
    select_mechanism,
)


def main() -> int:
    parser = ArgumentParser(description="Run deterministic SDK mechanism demos.")
    parser.add_argument(
        "--sample",
        choices=("base", "risky", "multi_party"),
        default="base",
        help="sample scenario to run",
    )
    parser.add_argument(
        "--mechanism",
        action="append",
        choices=DEFAULT_MECHANISMS,
        dest="mechanisms",
        help="mechanism to include; repeat for multiple mechanisms",
    )
    args = parser.parse_args()

    scenario = sample_scenario(args.sample)
    if args.mechanisms:
        mechanisms = tuple(args.mechanisms)
    elif args.sample == "multi_party":
        mechanisms = None
    else:
        mechanisms = ("centralized_oracle", "admm", "consensus_averaging")
    comparison = compare_mechanisms(
        scenario,
        mechanisms=mechanisms,
        max_iter=80,
        tolerance=0.5,
    )
    report_run = comparison.best_non_oracle or comparison.runs[-1]
    report = compute_participation_report(
        report_run,
        oracle_run=comparison.oracle_run,
    )
    selection = select_mechanism(
        scenario,
        mechanisms=mechanisms,
        max_iter=80,
        tolerance=0.5,
    )
    payload = {
        "scenario_id": scenario.id,
        "participant_count": len(scenario.participants),
        "runs": [
            {
                "mechanism": run.algorithm,
                "convergence": run.convergence.value,
                "global_utility": round(run.ledger.global_utility, 2),
                "oracle_gap": None
                if run.utility_gap_vs_oracle is None
                else round(run.utility_gap_vs_oracle, 2),
                "final_residual": round(run.final_residual, 4),
            }
            for run in comparison.runs
        ],
        "participation": {
            "mechanism": report.mechanism,
            "feasible": report.feasible,
            "no_worse_off": report.no_worse_off,
            "surplus": round(report.transfer.surplus, 2),
            "oracle_gap": None if report.oracle_gap is None else round(report.oracle_gap, 2),
        },
        "selection": {
            "recommended": None
            if selection.recommended is None
            else selection.recommended.mechanism,
            "ranking": [
                {
                    "rank": score.rank,
                    "mechanism": score.mechanism,
                    "eligible": score.eligible,
                    "convergence": score.convergence,
                    "global_utility": round(score.global_utility, 2),
                    "oracle_gap": None
                    if score.oracle_gap is None
                    else round(score.oracle_gap, 2),
                    "final_residual": round(score.final_residual, 4),
                    "transfer_feasible": score.transfer_feasible,
                    "reasons": list(score.reasons),
                }
                for score in selection.ranking
            ],
        },
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
