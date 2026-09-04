"""Deterministic mechanism robustness report built on the public SDK."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from collections.abc import Sequence
from itertools import product
from pathlib import Path
from typing import TypedDict

from procurement_mechanism_sdk import (
    DEFAULT_MECHANISMS,
    MechanismName,
    Scenario,
    build_procurement_scenario,
    compare_mechanisms,
)

DEFAULT_REPORTS_DIR = Path("reports")
JSONL_NAME = "mechanism-sensitivity.jsonl"
MD_NAME = "mechanism-sensitivity.md"
MAX_ITER = 80
TOLERANCE = 0.5

DEMAND_VOLATILITIES = (40.0, 140.0)
CAPACITIES = (360.0, 800.0)
SUPPLIER_RISKS = (0.1, 0.7)
BASE_DEMAND_MEAN = 500.0


class StressCell(TypedDict):
    """One deterministic set of scenario inputs in the stress grid."""

    scenario_name: str
    demand_volatility: float
    stress_demand: float
    capacity: float
    supplier_risk: float


class SensitivityRow(StressCell):
    """Serializable mechanism result for a single stress cell."""

    scenario_id: str
    mechanism: str
    convergence: str
    failure: str | None
    final_residual: float | None
    global_utility: float | None
    oracle_gap: float | None
    transfer_feasible: bool | None
    allocation_feasible: bool


class MechanismRollup(TypedDict):
    """Aggregate reliability and performance metrics for one mechanism."""

    mechanism: str
    scenario_count: int
    convergence_count: int
    convergence_rate: float
    transfer_feasible_count: int
    transfer_feasible_rate: float
    allocation_feasible_count: int
    allocation_feasible_rate: float
    mean_oracle_gap: float | None
    worst_oracle_gap: float | None
    mean_utility: float | None
    qualifies: bool


def build_stress_grid() -> tuple[StressCell, ...]:
    """Return the stable 2 x 2 x 2 demand, capacity, and risk stress grid."""

    return tuple(
        {
            "scenario_name": (
                f"volatility_{int(demand_volatility)}_"
                f"capacity_{int(capacity)}_risk_{int(supplier_risk * 100)}"
            ),
            "demand_volatility": demand_volatility,
            # The reference engine's canonical utility formulas consume
            # ``demand_mean`` rather than uncertainty directly. Model each
            # volatility level as the deterministic stressed demand outcome
            # ``base forecast + volatility`` while retaining it as
            # ``demand_std`` for SDK consumers that use uncertainty.
            "stress_demand": BASE_DEMAND_MEAN + demand_volatility,
            "capacity": capacity,
            "supplier_risk": supplier_risk,
        }
        for demand_volatility, capacity, supplier_risk in product(
            DEMAND_VOLATILITIES,
            CAPACITIES,
            SUPPLIER_RISKS,
        )
    )


def run_sensitivity(reports_dir: Path = DEFAULT_REPORTS_DIR) -> list[SensitivityRow]:
    """Run every public SDK mechanism in every cell and write both reports."""

    rows = _sensitivity_rows()
    reports_dir.mkdir(parents=True, exist_ok=True)
    (reports_dir / JSONL_NAME).write_text(
        "".join(f"{json.dumps(row, sort_keys=True)}\n" for row in rows),
        encoding="utf-8",
    )
    (reports_dir / MD_NAME).write_text(_markdown_report(rows), encoding="utf-8")
    return rows


def rollups(rows: Sequence[SensitivityRow]) -> tuple[MechanismRollup, ...]:
    """Recompute deterministic mechanism rollups from report rows."""

    grouped: dict[str, list[SensitivityRow]] = defaultdict(list)
    for row in rows:
        grouped[row["mechanism"]].append(row)
    return tuple(_rollup(mechanism, grouped[mechanism]) for mechanism in DEFAULT_MECHANISMS)


def recommendation(rows: Sequence[SensitivityRow]) -> str | None:
    """Return the best all-cells-qualified non-oracle mechanism, if any."""

    qualified = [
        rollup
        for rollup in rollups(rows)
        if rollup["mechanism"] != "centralized_oracle" and rollup["qualifies"]
    ]
    if not qualified:
        return None
    return min(
        qualified,
        key=lambda rollup: (
            _sort_metric(rollup["worst_oracle_gap"]),
            _sort_metric(rollup["mean_oracle_gap"]),
            rollup["mechanism"],
        ),
    )["mechanism"]


def main(argv: Sequence[str] | None = None) -> int:
    """CLI entry point for ``python -m procurement_lab.sensitivity``."""

    parser = argparse.ArgumentParser(description="Write a mechanism sensitivity report.")
    parser.add_argument("--reports-dir", type=Path, default=DEFAULT_REPORTS_DIR)
    args = parser.parse_args(argv)
    try:
        rows = run_sensitivity(args.reports_dir)
        selected = recommendation(rows)
        print(f"wrote {len(rows)} rows; recommendation: {selected or 'none'}")
    except Exception as exc:  # pragma: no cover - exercised by shell gates
        print(f"ERROR[sensitivity]: {exc}", file=sys.stderr)
        return 1
    return 0


def _sensitivity_rows() -> list[SensitivityRow]:
    rows: list[SensitivityRow] = []
    for cell in build_stress_grid():
        scenario = build_procurement_scenario(
            scenario_id=f"sensitivity-{cell['scenario_name']}",
            title=f"Mechanism sensitivity: {cell['scenario_name']}",
            demand_mean=cell["stress_demand"],
            demand_std=cell["demand_volatility"],
            capacity=cell["capacity"],
            risk_score=cell["supplier_risk"],
            evidence_ids=("mechanism-sensitivity-grid",),
        )
        for mechanism in DEFAULT_MECHANISMS:
            rows.append(_row_for_mechanism(cell, scenario.id, scenario, mechanism))
    return rows


def _row_for_mechanism(
    cell: StressCell,
    scenario_id: str,
    scenario: Scenario,
    mechanism: MechanismName,
) -> SensitivityRow:
    try:
        comparison = compare_mechanisms(
            scenario,
            mechanisms=(mechanism,),
            max_iter=MAX_ITER,
            tolerance=TOLERANCE,
        )
        run = comparison.by_mechanism[mechanism]
    except Exception as exc:
        return {
            **cell,
            "scenario_id": scenario_id,
            "mechanism": mechanism,
            "convergence": "error",
            "failure": type(exc).__name__,
            "final_residual": None,
            "global_utility": None,
            "oracle_gap": None,
            "transfer_feasible": False,
            "allocation_feasible": False,
        }
    failure = None if run.failure is None else run.failure.reason.value
    if failure is None and not run.ledger.feasible:
        failure = "capacity_exceeded"
    return {
        **cell,
        "scenario_id": scenario_id,
        "mechanism": mechanism,
        "convergence": run.convergence.value,
        "failure": failure,
        "final_residual": run.final_residual,
        "global_utility": run.ledger.global_utility,
        "oracle_gap": run.utility_gap_vs_oracle,
        "transfer_feasible": None if run.transfer is None else run.transfer.feasible,
        "allocation_feasible": run.ledger.feasible,
    }


def _rollup(mechanism: str, rows: Sequence[SensitivityRow]) -> MechanismRollup:
    count = len(rows)
    convergence_count = sum(row["convergence"] == "converged" for row in rows)
    transfer_count = sum(row["transfer_feasible"] is True for row in rows)
    allocation_count = sum(row["allocation_feasible"] for row in rows)
    gaps = [row["oracle_gap"] for row in rows if row["oracle_gap"] is not None]
    utilities = [row["global_utility"] for row in rows if row["global_utility"] is not None]
    return {
        "mechanism": mechanism,
        "scenario_count": count,
        "convergence_count": convergence_count,
        "convergence_rate": convergence_count / count if count else 0.0,
        "transfer_feasible_count": transfer_count,
        "transfer_feasible_rate": transfer_count / count if count else 0.0,
        "allocation_feasible_count": allocation_count,
        "allocation_feasible_rate": allocation_count / count if count else 0.0,
        "mean_oracle_gap": sum(gaps) / len(gaps) if gaps else None,
        "worst_oracle_gap": max(gaps) if gaps else None,
        "mean_utility": sum(utilities) / len(utilities) if utilities else None,
        "qualifies": count > 0 and convergence_count == count and transfer_count == count,
    }


def _markdown_report(rows: Sequence[SensitivityRow]) -> str:
    selected = recommendation(rows)
    lines = [
        "# Mechanism Sensitivity Report",
        "",
        (
            "Eight deterministic stress cells vary demand volatility, capacity, and "
            "supplier risk. Volatility produces a deterministic stressed demand outcome "
            "of base forecast plus volatility."
        ),
        "",
        (
            "| Mechanism | Scenarios | Converged | Transfer feasible | "
            "Allocation feasible | Mean oracle gap | "
            "Worst oracle gap | Mean utility | Qualifies |"
        ),
        "| --- | ---: | --- | --- | --- | ---: | ---: | ---: | --- |",
    ]
    for rollup in rollups(rows):
        lines.append(
            "| {mechanism} | {scenario_count} | {convergence_count} ({convergence_rate:.0%}) | "
            "{transfer_feasible_count} ({transfer_feasible_rate:.0%}) | "
            "{allocation_feasible_count} ({allocation_feasible_rate:.0%}) | "
            "{mean_gap} | {worst_gap} | "
            "{mean_utility} | {qualifies} |".format(
                mechanism=rollup["mechanism"],
                scenario_count=rollup["scenario_count"],
                convergence_count=rollup["convergence_count"],
                convergence_rate=rollup["convergence_rate"],
                transfer_feasible_count=rollup["transfer_feasible_count"],
                transfer_feasible_rate=rollup["transfer_feasible_rate"],
                allocation_feasible_count=rollup["allocation_feasible_count"],
                allocation_feasible_rate=rollup["allocation_feasible_rate"],
                mean_gap=_format_metric(rollup["mean_oracle_gap"]),
                worst_gap=_format_metric(rollup["worst_oracle_gap"]),
                mean_utility=_format_metric(rollup["mean_utility"]),
                qualifies=rollup["qualifies"],
            )
        )
    lines.extend(
        [
            "",
            (
                "Interpretation: oracle gap is the SDK field `oracle utility - "
                "mechanism utility`. A negative value means the mechanism scored "
                "higher under the current utility accounting; it is not a certified "
                "global-optimality result."
            ),
            "",
            (
                f"Recommendation: {selected}."
                if selected is not None
                else (
                    "Recommendation: none; no non-oracle mechanism converged, had feasible "
                    "transfers in every stress cell."
                )
            ),
            "",
        ]
    )
    return "\n".join(lines)


def _sort_metric(value: float | None) -> float:
    return float("inf") if value is None else value


def _format_metric(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.4f}"


if __name__ == "__main__":
    raise SystemExit(main())
