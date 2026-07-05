"""Headless mechanism benchmark scorecard built on the public SDK."""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from collections.abc import Sequence
from pathlib import Path
from typing import TypedDict

from procurement_mechanism_sdk import (
    DEFAULT_MECHANISMS,
    MechanismName,
    Scenario,
    build_procurement_scenario,
    compare_mechanisms,
    sample_scenario,
)

DEFAULT_REPORTS_DIR = Path("reports")
JSONL_NAME = "mechanism-scorecard.jsonl"
MD_NAME = "mechanism-scorecard.md"
MAX_ITER = 80
TOLERANCE = 0.5


class ScorecardRow(TypedDict):
    """Serializable row written to the JSONL and Markdown reports."""

    scenario_name: str
    scenario_id: str
    mechanism: str
    convergence: str
    failure: str | None
    final_residual: float | None
    global_utility: float | None
    oracle_gap: float | None
    transfer_feasible: bool | None


def fixed_scenarios() -> tuple[tuple[str, Scenario], ...]:
    """Return the deterministic benchmark scenarios in report order."""

    return (
        ("base", sample_scenario("base")),
        ("risky", sample_scenario("risky")),
        ("multi_party", sample_scenario("multi_party")),
        (
            "tight_capacity",
            build_procurement_scenario(
                scenario_id="sdk-substrate-crunch-tight-capacity",
                title="SDK substrate crunch under tight capacity",
                demand_mean=620.0,
                demand_std=90.0,
                capacity=360.0,
                risk_score=0.25,
                evidence_ids=("scorecard-tight-capacity",),
            ),
        ),
    )


def run_scorecard(reports_dir: Path = DEFAULT_REPORTS_DIR) -> list[ScorecardRow]:
    """Run the fixed scorecard and write JSONL plus Markdown artifacts."""

    rows = _scorecard_rows()
    reports_dir.mkdir(parents=True, exist_ok=True)
    jsonl_path = reports_dir / JSONL_NAME
    md_path = reports_dir / MD_NAME
    jsonl_path.write_text(
        "".join(f"{json.dumps(row, sort_keys=True)}\n" for row in rows),
        encoding="utf-8",
    )
    md_path.write_text(_markdown_report(rows), encoding="utf-8")
    return rows


def overall_best_mechanism(rows: Sequence[ScorecardRow]) -> str:
    """Return the best non-oracle mechanism by scenario wins."""

    winners = [
        _best_row(scenario_rows)["mechanism"]
        for scenario_rows in _by_scenario(rows).values()
    ]
    return Counter(winners).most_common(1)[0][0]


def main() -> int:
    """CLI entry point for ``python -m procurement_lab.scorecard``."""

    try:
        rows = run_scorecard()
        print(
            f"wrote {len(rows)} rows to {DEFAULT_REPORTS_DIR / JSONL_NAME} "
            f"and {DEFAULT_REPORTS_DIR / MD_NAME}; "
            f"overall best mechanism: {overall_best_mechanism(rows)}"
        )
    except Exception as exc:  # pragma: no cover - exercised by shell gates
        print(f"ERROR[scorecard]: {exc}", file=sys.stderr)
        return 1
    return 0


def _scorecard_rows() -> list[ScorecardRow]:
    rows: list[ScorecardRow] = []
    for scenario_name, scenario in fixed_scenarios():
        for mechanism in DEFAULT_MECHANISMS:
            rows.append(_row_for_mechanism(scenario_name, scenario, mechanism))
    return rows


def _row_for_mechanism(
    scenario_name: str,
    scenario: Scenario,
    mechanism: MechanismName,
) -> ScorecardRow:
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
            "scenario_name": scenario_name,
            "scenario_id": scenario.id,
            "mechanism": mechanism,
            "convergence": "error",
            "failure": type(exc).__name__,
            "final_residual": None,
            "global_utility": None,
            "oracle_gap": None,
            "transfer_feasible": False,
        }

    failure = None if run.failure is None else run.failure.reason.value
    transfer_feasible = None if run.transfer is None else run.transfer.feasible
    return {
        "scenario_name": scenario_name,
        "scenario_id": scenario.id,
        "mechanism": mechanism,
        "convergence": run.convergence.value,
        "failure": failure,
        "final_residual": run.final_residual,
        "global_utility": run.ledger.global_utility,
        "oracle_gap": run.utility_gap_vs_oracle,
        "transfer_feasible": transfer_feasible,
    }


def _markdown_report(rows: Sequence[ScorecardRow]) -> str:
    lines = [
        "# Mechanism Scorecard",
        "",
        (
            "| Scenario | Mechanism | Convergence | Oracle gap | Residual | "
            "Utility | Transfer | Failure |"
        ),
        "| --- | --- | --- | ---: | ---: | ---: | --- | --- |",
    ]
    for row in rows:
        lines.append(
            "| {scenario_name} | {mechanism} | {convergence} | {oracle_gap} | "
            "{final_residual} | {global_utility} | {transfer_feasible} | {failure} |".format(
                scenario_name=row["scenario_name"],
                mechanism=row["mechanism"],
                convergence=row["convergence"],
                oracle_gap=_format_metric(row["oracle_gap"]),
                final_residual=_format_metric(row["final_residual"]),
                global_utility=_format_metric(row["global_utility"]),
                transfer_feasible=_format_optional(row["transfer_feasible"]),
                failure=_format_optional(row["failure"]),
            )
        )
    lines.append("")
    for scenario_name, scenario_rows in _by_scenario(rows).items():
        best = _best_row(scenario_rows)
        lines.append(f"Best mechanism for {scenario_name}: {best['mechanism']}")
    lines.append("")
    return "\n".join(lines)


def _best_row(rows: Sequence[ScorecardRow]) -> ScorecardRow:
    candidates = [
        row
        for row in rows
        if row["mechanism"] != "centralized_oracle" and row["oracle_gap"] is not None
    ]
    if not candidates:
        candidates = [row for row in rows if row["oracle_gap"] is not None]
    return min(
        candidates,
        key=_best_sort_key,
    )


def _best_sort_key(row: ScorecardRow) -> tuple[float, float, float, str]:
    oracle_gap = row["oracle_gap"]
    final_residual = row["final_residual"]
    global_utility = row["global_utility"]
    if oracle_gap is None or final_residual is None or global_utility is None:
        return (float("inf"), float("inf"), float("inf"), row["mechanism"])
    return (
        max(oracle_gap, 0.0),
        final_residual,
        -global_utility,
        row["mechanism"],
    )


def _by_scenario(rows: Sequence[ScorecardRow]) -> dict[str, list[ScorecardRow]]:
    grouped: dict[str, list[ScorecardRow]] = defaultdict(list)
    for row in rows:
        grouped[row["scenario_name"]].append(row)
    return dict(grouped)


def _format_metric(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{float(value):.4f}"


def _format_optional(value: bool | str | None) -> str:
    if value is None:
        return "n/a"
    return str(value)


if __name__ == "__main__":
    raise SystemExit(main())
