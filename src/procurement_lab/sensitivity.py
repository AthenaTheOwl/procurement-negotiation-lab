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
    InformationMode,
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
    disclosure_limited: bool


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
    disclosure_limited_count: int
    mean_oracle_gap: float | None
    worst_oracle_gap: float | None
    mean_utility: float | None
    oracle_mean_utility: float | None
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
    oracle_utility = {
        row["scenario_id"]: utility
        for row in grouped["centralized_oracle"]
        if (utility := row["global_utility"]) is not None and row["allocation_feasible"]
    }
    return tuple(
        _rollup(mechanism, grouped[mechanism], oracle_utility)
        for mechanism in DEFAULT_MECHANISMS
    )


def ranked_qualifiers(rows: Sequence[SensitivityRow]) -> tuple[tuple[str, ...], ...]:
    """Rank qualifying non-oracle mechanisms into tie groups, best first.

    Qualification (DEC-SDK-004): converged with a feasible transfer in every
    cell. Ranking (DEC-SDK-005), each key breaking ties left by the previous:

    1. more cells whose allocation fits capacity;
    2. lower worst oracle gap over those cells;
    3. lower mean oracle gap over those cells;
    4. more cells run disclosure-limited (private mode with a transcript-
       exposure report), because equal outcomes reached while revealing less
       leave participants better off.

    Mechanisms equal on every key share a group. The rule never orders
    mechanisms by name; within a group they keep registry order for display.
    """

    qualified = [
        rollup
        for rollup in rollups(rows)
        if rollup["mechanism"] != "centralized_oracle" and rollup["qualifies"]
    ]
    groups: dict[tuple[float, float, float, int], list[str]] = defaultdict(list)
    for rollup in qualified:
        groups[_rank_key(rollup)].append(rollup["mechanism"])
    return tuple(tuple(groups[key]) for key in sorted(groups))


def recommended_mechanisms(rows: Sequence[SensitivityRow]) -> tuple[str, ...]:
    """Return every qualifying mechanism tied for first place, or ``()``."""

    ranked = ranked_qualifiers(rows)
    return ranked[0] if ranked else ()


def recommendation(rows: Sequence[SensitivityRow]) -> str | None:
    """Return the single top-ranked qualifying mechanism.

    Returns ``None`` when no mechanism qualifies or when the ranking rule
    leaves a tie for first place; ``recommended_mechanisms`` names the tie.
    """

    top = recommended_mechanisms(rows)
    return top[0] if len(top) == 1 else None


def main(argv: Sequence[str] | None = None) -> int:
    """CLI entry point for ``python -m procurement_lab.sensitivity``."""

    parser = argparse.ArgumentParser(description="Write a mechanism sensitivity report.")
    parser.add_argument("--reports-dir", type=Path, default=DEFAULT_REPORTS_DIR)
    args = parser.parse_args(argv)
    try:
        rows = run_sensitivity(args.reports_dir)
        top = recommended_mechanisms(rows)
        label = " = ".join(top) if top else "none"
        print(f"wrote {len(rows)} rows; recommendation: {label}")
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
            "disclosure_limited": False,
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
        "disclosure_limited": (
            run.information_mode == InformationMode.PRIVATE
            and run.leakage_report is not None
        ),
    }


def _rollup(
    mechanism: str,
    rows: Sequence[SensitivityRow],
    oracle_utility: dict[str, float],
) -> MechanismRollup:
    count = len(rows)
    convergence_count = sum(row["convergence"] == "converged" for row in rows)
    transfer_count = sum(row["transfer_feasible"] is True for row in rows)
    allocation_count = sum(row["allocation_feasible"] for row in rows)
    disclosure_count = sum(row["disclosure_limited"] for row in rows)
    # The SDK leaves oracle_gap unset for allocations above capacity, and the
    # utility of such a plan is not achievable, so neither one is averaged.
    gaps = [row["oracle_gap"] for row in rows if row["oracle_gap"] is not None]
    scored = [
        row for row in rows if row["global_utility"] is not None and row["allocation_feasible"]
    ]
    utilities = [
        utility for row in scored if (utility := row["global_utility"]) is not None
    ]
    # The oracle's mean over the same cells, so a row's mean utility is only
    # ever compared with the oracle on the cells that row was scored on.
    oracle_utilities = [
        oracle_utility[row["scenario_id"]]
        for row in scored
        if row["scenario_id"] in oracle_utility
    ]
    return {
        "mechanism": mechanism,
        "scenario_count": count,
        "convergence_count": convergence_count,
        "convergence_rate": convergence_count / count if count else 0.0,
        "transfer_feasible_count": transfer_count,
        "transfer_feasible_rate": transfer_count / count if count else 0.0,
        "allocation_feasible_count": allocation_count,
        "allocation_feasible_rate": allocation_count / count if count else 0.0,
        "disclosure_limited_count": disclosure_count,
        "mean_oracle_gap": sum(gaps) / len(gaps) if gaps else None,
        "worst_oracle_gap": max(gaps) if gaps else None,
        "mean_utility": sum(utilities) / len(utilities) if utilities else None,
        "oracle_mean_utility": (
            sum(oracle_utilities) / len(oracle_utilities) if oracle_utilities else None
        ),
        "qualifies": count > 0 and convergence_count == count and transfer_count == count,
    }


def _markdown_report(rows: Sequence[SensitivityRow]) -> str:
    ranked = ranked_qualifiers(rows)
    by_mechanism = {rollup["mechanism"]: rollup for rollup in rollups(rows)}
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
            "Allocation feasible | Disclosure-limited | Mean oracle gap | "
            "Worst oracle gap | Mean utility (fits capacity) | "
            "Oracle mean utility (same cells) | Qualifies |"
        ),
        "| --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ]
    for rollup in rollups(rows):
        lines.append(
            "| {mechanism} | {scenario_count} | {convergence_count} ({convergence_rate:.0%}) | "
            "{transfer_feasible_count} ({transfer_feasible_rate:.0%}) | "
            "{allocation_feasible_count} ({allocation_feasible_rate:.0%}) | "
            "{disclosure_limited_count} | {mean_gap} | {worst_gap} | "
            "{mean_utility} | {oracle_mean_utility} | {qualifies} |".format(
                mechanism=rollup["mechanism"],
                scenario_count=rollup["scenario_count"],
                convergence_count=rollup["convergence_count"],
                convergence_rate=rollup["convergence_rate"],
                transfer_feasible_count=rollup["transfer_feasible_count"],
                transfer_feasible_rate=rollup["transfer_feasible_rate"],
                allocation_feasible_count=rollup["allocation_feasible_count"],
                allocation_feasible_rate=rollup["allocation_feasible_rate"],
                disclosure_limited_count=rollup["disclosure_limited_count"],
                mean_gap=_format_metric(rollup["mean_oracle_gap"]),
                worst_gap=_format_metric(rollup["worst_oracle_gap"]),
                mean_utility=_format_metric(rollup["mean_utility"]),
                oracle_mean_utility=_format_metric(rollup["oracle_mean_utility"]),
                qualifies=rollup["qualifies"],
            )
        )
    lines.extend(
        [
            "",
            (
                "Interpretation: oracle gap is the SDK field `oracle utility - "
                "mechanism utility`. The oracle searches every whole unit from zero "
                "to capacity plus the demand and capacity breakpoints, which is the "
                "exact optimum for these utility formulas, so no scored gap is "
                "negative. A cell whose allocation exceeds capacity is not scored: "
                "its oracle gap is null in the JSONL and its utility is left out of "
                "the mean. Each row's mean utility covers only the cells where that "
                "row fits capacity, so rows cover different cells; the oracle mean "
                "beside it is taken over the same cells and is the figure to compare "
                "against."
            ),
            "",
            (
                "Ranking rule (DEC-SDK-005): a mechanism qualifies when it converges "
                "with a feasible transfer in every cell. Qualifying mechanisms rank by "
                "allocation-feasible cells (more first), worst oracle gap, mean oracle "
                "gap, then disclosure-limited cells (more first). A tie that survives "
                "every key is reported as a tie, never broken by mechanism name."
            ),
            "",
        ]
    )
    if ranked:
        lines.append("Ranking of qualifying mechanisms:")
        lines.append("")
        position = 1
        for group in ranked:
            tied = " (tied)" if len(group) > 1 else ""
            lines.append(f"{position}. {', '.join(group)}{tied}")
            position += len(group)
        lines.append("")
    top = ranked[0] if ranked else ()
    if not top:
        lines.append(
            "Recommendation: none; no non-oracle mechanism converged with feasible "
            "transfers in every stress cell."
        )
    else:
        fits = by_mechanism[top[0]]["allocation_feasible_count"]
        cells = by_mechanism[top[0]]["scenario_count"]
        named = (
            top[0] if len(top) == 1 else "tie between " + ", ".join(top)
        )
        caveat = (
            f" It fits capacity in {fits} of {cells} cells; the other cells are "
            "unscored because the allocation exceeds capacity."
            if fits < cells
            else ""
        )
        lines.append(f"Recommendation: {named}.{caveat}")
    lines.append("")
    return "\n".join(lines)


def _rank_key(rollup: MechanismRollup) -> tuple[float, float, float, int]:
    return (
        -rollup["allocation_feasible_count"],
        _sort_metric(rollup["worst_oracle_gap"]),
        _sort_metric(rollup["mean_oracle_gap"]),
        -rollup["disclosure_limited_count"],
    )


def _sort_metric(value: float | None) -> float:
    return float("inf") if value is None else value


def _format_metric(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.4f}"


if __name__ == "__main__":
    raise SystemExit(main())
