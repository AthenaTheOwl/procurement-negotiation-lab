from __future__ import annotations

import json
from pathlib import Path
from typing import cast

import pytest

from procurement_lab.sensitivity import (
    JSONL_NAME,
    MD_NAME,
    SensitivityRow,
    build_stress_grid,
    ranked_qualifiers,
    recommendation,
    recommended_mechanisms,
    rollups,
    run_sensitivity,
)
from procurement_mechanism_sdk import DEFAULT_MECHANISMS


@pytest.fixture(scope="module")
def sensitivity_reports(
    tmp_path_factory: pytest.TempPathFactory,
) -> tuple[Path, Path, list[SensitivityRow]]:
    """Generate the two independent report directories needed by the contract."""

    first = tmp_path_factory.mktemp("sensitivity-first")
    second = tmp_path_factory.mktemp("sensitivity-second")
    rows = run_sensitivity(first)
    run_sensitivity(second)
    return first, second, rows


def test_row_count_is_derived_from_grid_and_registry(
    sensitivity_reports: tuple[Path, Path, list[SensitivityRow]],
) -> None:
    _first, _second, rows = sensitivity_reports

    assert len(rows) == len(build_stress_grid()) * len(DEFAULT_MECHANISMS)


def test_reports_are_byte_for_byte_deterministic(
    sensitivity_reports: tuple[Path, Path, list[SensitivityRow]],
) -> None:
    first, second, _rows = sensitivity_reports

    assert (first / JSONL_NAME).read_bytes() == (second / JSONL_NAME).read_bytes()
    assert (first / MD_NAME).read_bytes() == (second / MD_NAME).read_bytes()


def test_rollups_recompute_from_jsonl(
    sensitivity_reports: tuple[Path, Path, list[SensitivityRow]],
) -> None:
    first, _second, _generated_rows = sensitivity_reports
    rows = cast(list[SensitivityRow], [
        json.loads(line)
        for line in (first / JSONL_NAME).read_text(encoding="utf-8").splitlines()
    ])
    computed = {rollup["mechanism"]: rollup for rollup in rollups(rows)}

    assert set(computed) == set(DEFAULT_MECHANISMS)
    for mechanism, rollup in computed.items():
        mechanism_rows = [row for row in rows if row["mechanism"] == mechanism]
        assert rollup["scenario_count"] == len(mechanism_rows)
        assert rollup["convergence_count"] == sum(
            row["convergence"] == "converged" for row in mechanism_rows
        )
        assert rollup["transfer_feasible_count"] == sum(
            row["transfer_feasible"] is True for row in mechanism_rows
        )
        assert rollup["allocation_feasible_count"] == sum(
            row["allocation_feasible"] for row in mechanism_rows
        )
        assert rollup["convergence_rate"] == pytest.approx(
            rollup["convergence_count"] / len(mechanism_rows)
        )
        assert rollup["transfer_feasible_rate"] == pytest.approx(
            rollup["transfer_feasible_count"] / len(mechanism_rows)
        )
        assert rollup["allocation_feasible_rate"] == pytest.approx(
            rollup["allocation_feasible_count"] / len(mechanism_rows)
        )
        assert rollup["disclosure_limited_count"] == sum(
            row["disclosure_limited"] for row in mechanism_rows
        )
        gaps = [row["oracle_gap"] for row in mechanism_rows if row["oracle_gap"] is not None]
        utilities = [
            row["global_utility"]
            for row in mechanism_rows
            if row["global_utility"] is not None and row["allocation_feasible"]
        ]
        assert rollup["mean_oracle_gap"] == pytest.approx(sum(gaps) / len(gaps))
        assert rollup["worst_oracle_gap"] == (max(gaps) if gaps else None)
        assert rollup["mean_utility"] == pytest.approx(sum(utilities) / len(utilities))


def test_mean_utility_never_exceeds_the_oracle_on_the_same_cells(
    sensitivity_reports: tuple[Path, Path, list[SensitivityRow]],
) -> None:
    _first, _second, rows = sensitivity_reports
    oracle = {
        row["scenario_id"]: row["global_utility"]
        for row in rows
        if row["mechanism"] == "centralized_oracle"
    }

    for rollup in rollups(rows):
        if rollup["mean_utility"] is None:
            continue
        mechanism_rows = [
            row
            for row in rows
            if row["mechanism"] == rollup["mechanism"]
            and row["allocation_feasible"]
            and row["global_utility"] is not None
        ]
        same_cells = [oracle[row["scenario_id"]] for row in mechanism_rows]
        assert rollup["oracle_mean_utility"] == pytest.approx(
            sum(same_cells) / len(same_cells)
        )
        assert rollup["mean_utility"] <= rollup["oracle_mean_utility"] + 1e-6, rollup


def test_recommendation_requires_every_stress_cell_to_qualify(
    sensitivity_reports: tuple[Path, Path, list[SensitivityRow]],
) -> None:
    _first, _second, rows = sensitivity_reports
    selected = recommendation(rows)
    qualifying = {
        rollup["mechanism"]
        for rollup in rollups(rows)
        if rollup["mechanism"] != "centralized_oracle" and rollup["qualifies"]
    }

    assert selected is not None
    assert selected in qualifying
    selected_rows = [row for row in rows if row["mechanism"] == selected]
    assert len(selected_rows) == len(build_stress_grid())
    assert all(row["convergence"] == "converged" for row in selected_rows)
    assert all(row["transfer_feasible"] is True for row in selected_rows)

    degraded = [row.copy() for row in rows]
    failed_cell = next(row for row in degraded if row["mechanism"] == selected)
    failed_cell["convergence"] = "error"
    failed_cell["failure"] = "forced_test_failure"
    failed_cell["transfer_feasible"] = False

    assert recommendation(cast(list[SensitivityRow], degraded)) != selected


def _rows_for(
    rows: list[SensitivityRow], mechanism: str
) -> list[SensitivityRow]:
    return [row for row in rows if row["mechanism"] == mechanism]


def test_no_scored_mechanism_beats_the_oracle(
    sensitivity_reports: tuple[Path, Path, list[SensitivityRow]],
) -> None:
    _first, _second, rows = sensitivity_reports

    for row in rows:
        if row["allocation_feasible"] and row["convergence"] != "error":
            assert row["oracle_gap"] is not None, row
            assert row["oracle_gap"] >= -1e-6, row
        else:
            assert row["oracle_gap"] is None, row


def test_capacity_binds_the_oracle(
    sensitivity_reports: tuple[Path, Path, list[SensitivityRow]],
) -> None:
    _first, _second, rows = sensitivity_reports
    oracle_rows = _rows_for(rows, "centralized_oracle")

    assert all(row["allocation_feasible"] for row in oracle_rows)
    for tight in (row for row in oracle_rows if row["capacity"] == 360.0):
        loose = next(
            row
            for row in oracle_rows
            if row["capacity"] == 800.0
            and row["demand_volatility"] == tight["demand_volatility"]
            and row["supplier_risk"] == tight["supplier_risk"]
        )
        assert tight["global_utility"] is not None
        assert loose["global_utility"] is not None
        assert tight["global_utility"] < loose["global_utility"]


def test_ranking_puts_allocation_feasibility_before_gap(
    sensitivity_reports: tuple[Path, Path, list[SensitivityRow]],
) -> None:
    _first, _second, rows = sensitivity_reports
    edited = [row.copy() for row in rows]
    # Give weighted_nash_bounded (worse gap) one more feasible cell than anyone.
    tight_cell = next(
        row
        for row in edited
        if row["mechanism"] == "weighted_nash_bounded" and not row["allocation_feasible"]
    )
    tight_cell["allocation_feasible"] = True
    tight_cell["oracle_gap"] = 5000.0

    assert recommendation(cast(list[SensitivityRow], edited)) == "weighted_nash_bounded"


def test_ties_are_reported_never_broken_by_name(
    sensitivity_reports: tuple[Path, Path, list[SensitivityRow]],
) -> None:
    _first, _second, rows = sensitivity_reports
    # Make plaintext indistinguishable from MPC on every ranking key.
    edited = [
        {**row, "disclosure_limited": True}
        if row["mechanism"] == "weighted_nash_plaintext"
        else row.copy()
        for row in rows
    ]
    edited_rows = cast(list[SensitivityRow], edited)

    assert recommendation(edited_rows) is None
    assert set(recommended_mechanisms(edited_rows)) == {
        "weighted_nash_mpc",
        "weighted_nash_plaintext",
    }
    # Swapping two mechanisms' labels swaps their places: rank follows data.
    swap = {"weighted_nash_mpc": "admm", "admm": "weighted_nash_mpc"}
    swapped = [{**row, "mechanism": swap.get(row["mechanism"], row["mechanism"])} for row in rows]
    swapped_ranked = ranked_qualifiers(cast(list[SensitivityRow], swapped))

    assert swapped_ranked[0] == ("admm",)
    assert set(swapped_ranked[1]) == {"weighted_nash_mpc", "weighted_nash_plaintext"}


def test_committed_recommendation_reason_is_disclosure_not_name(
    sensitivity_reports: tuple[Path, Path, list[SensitivityRow]],
) -> None:
    _first, _second, rows = sensitivity_reports
    ranked = ranked_qualifiers(rows)

    assert ranked[0] == ("weighted_nash_mpc",)
    assert set(ranked[1]) == {"admm", "weighted_nash_plaintext"}


def test_volatility_changes_the_engine_effective_demand(
    sensitivity_reports: tuple[Path, Path, list[SensitivityRow]],
) -> None:
    _first, _second, rows = sensitivity_reports
    oracle_rows = [row for row in rows if row["mechanism"] == "centralized_oracle"]
    low = next(
        row
        for row in oracle_rows
        if row["demand_volatility"] == min(row["demand_volatility"] for row in oracle_rows)
        and row["capacity"] == 800.0
        and row["supplier_risk"] == 0.1
    )
    high = next(
        row
        for row in oracle_rows
        if row["demand_volatility"] == max(row["demand_volatility"] for row in oracle_rows)
        and row["capacity"] == 800.0
        and row["supplier_risk"] == 0.1
    )

    assert low["stress_demand"] != high["stress_demand"]
    assert low["global_utility"] != high["global_utility"]


def test_cli_unhappy_path_has_no_traceback(tmp_path: Path, capsys) -> None:
    from procurement_lab.sensitivity import main

    not_a_directory = tmp_path / "not-a-directory"
    not_a_directory.write_text("x", encoding="utf-8")

    assert main(["--reports-dir", str(not_a_directory / "child")]) == 1
    captured = capsys.readouterr()
    assert "ERROR[sensitivity]:" in captured.err
    assert "Traceback" not in captured.err


def test_report_explains_gap_and_ranking_rule(
    sensitivity_reports: tuple[Path, Path, list[SensitivityRow]],
) -> None:
    first, _second, _rows = sensitivity_reports
    report = (first / MD_NAME).read_text(encoding="utf-8")

    assert "oracle utility - mechanism utility" in report
    assert "no scored gap is negative" in report
    assert "never broken by mechanism name" in report
    assert "Recommendation: weighted_nash_mpc. It fits capacity in 4 of 8 cells" in report
