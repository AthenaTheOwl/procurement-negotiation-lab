"""Standalone SDK demo.

Run with:
    python -m procurement_mechanism_sdk.demo
"""

from __future__ import annotations

import json

from procurement_mechanism_sdk.api import (
    compare_mechanisms,
    compute_participation_report,
    sample_scenario,
)


def main() -> int:
    scenario = sample_scenario("base")
    comparison = compare_mechanisms(
        scenario,
        mechanisms=("centralized_oracle", "admm", "consensus_averaging"),
        max_iter=80,
        tolerance=0.5,
    )
    admm_run = comparison.by_mechanism["admm"]
    report = compute_participation_report(
        admm_run,
        oracle_run=comparison.oracle_run,
    )
    payload = {
        "scenario_id": scenario.id,
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
        "admm_participation": {
            "feasible": report.feasible,
            "no_worse_off": report.no_worse_off,
            "surplus": round(report.transfer.surplus, 2),
            "oracle_gap": None if report.oracle_gap is None else round(report.oracle_gap, 2),
        },
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
