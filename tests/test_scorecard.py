from __future__ import annotations

import json
from pathlib import Path

import pytest

from procurement_lab.scorecard import (
    JSONL_NAME,
    MD_NAME,
    ScorecardRow,
    _best_row,
    _by_scenario,
    fixed_scenarios,
    run_scorecard,
)
from procurement_mechanism_sdk import DEFAULT_MECHANISMS

REQUIRED_COLUMNS = {
    "convergence",
    "failure",
    "final_residual",
    "global_utility",
    "mechanism",
    "oracle_gap",
    "scenario_id",
    "scenario_name",
    "transfer_feasible",
}


def test_row_count(tmp_path: Path) -> None:
    rows = run_scorecard(tmp_path)

    assert len(rows) == len(fixed_scenarios()) * len(DEFAULT_MECHANISMS)


def test_required_columns(tmp_path: Path) -> None:
    rows = run_scorecard(tmp_path)

    assert rows
    assert all(REQUIRED_COLUMNS <= row.keys() for row in rows)


def test_determinism(tmp_path: Path) -> None:
    first_dir = tmp_path / "first"
    second_dir = tmp_path / "second"

    run_scorecard(first_dir)
    run_scorecard(second_dir)

    assert (first_dir / JSONL_NAME).read_bytes() == (second_dir / JSONL_NAME).read_bytes()


def test_best_mechanism_line_matches_data(tmp_path: Path) -> None:
    rows = run_scorecard(tmp_path)
    report = (tmp_path / MD_NAME).read_text(encoding="utf-8")
    best_lines = [
        line for line in report.splitlines() if line.startswith("Best mechanism for ")
    ]

    grouped = _by_scenario(_read_jsonl(tmp_path / JSONL_NAME))
    assert len(best_lines) == len(grouped)
    for line in best_lines:
        prefix, mechanism = line.split(": ", maxsplit=1)
        scenario_name = prefix.removeprefix("Best mechanism for ")
        best = _best_row(grouped[scenario_name])
        if best is None:
            assert mechanism.startswith("none")
        else:
            assert mechanism == best["mechanism"]
    assert set(grouped) == {name for name, _scenario in fixed_scenarios()}
    assert sum(len(scenario_rows) for scenario_rows in grouped.values()) == len(rows)


@pytest.fixture(scope="module")
def scorecard_run(
    tmp_path_factory: pytest.TempPathFactory,
) -> tuple[list[ScorecardRow], str]:
    reports_dir = tmp_path_factory.mktemp("scorecard")
    rows = run_scorecard(reports_dir)
    return rows, (reports_dir / MD_NAME).read_text(encoding="utf-8")


def test_multi_party_mpc_no_deal_is_documented(
    scorecard_run: tuple[list[ScorecardRow], str],
) -> None:
    rows, report = scorecard_run
    mpc = next(
        row
        for row in rows
        if row["scenario_name"] == "multi_party" and row["mechanism"] == "weighted_nash_mpc"
    )

    # Two-party-only by contract (DEC-MPC-001): a structured no-deal whose
    # ledger is the walk-away allocation, not a negotiated outcome.
    assert mpc["convergence"] == "no_deal"
    assert mpc["failure_note"] is not None
    assert "N=2 only" in mpc["failure_note"]
    assert mpc["global_utility"] == -43000.0
    assert "walk-away allocation of zero units" in report
    note_line = (
        "- multi_party / weighted_nash_mpc (no_deal, no_feasible_allocation): "
        f"{mpc['failure_note']}"
    )
    assert note_line in report.splitlines()


def test_over_capacity_rows_are_unscored(
    scorecard_run: tuple[list[ScorecardRow], str],
) -> None:
    rows, report = scorecard_run
    tight = [row for row in rows if row["scenario_name"] == "tight_capacity"]

    for row in tight:
        if row["allocation_feasible"] is False:
            assert row["oracle_gap"] is None
        elif row["oracle_gap"] is not None:
            assert row["oracle_gap"] >= -1e-6
    assert all(row["oracle_gap"] is None or row["oracle_gap"] >= -1e-6 for row in rows)
    assert _best_row(tight) is None
    assert "Best mechanism for tight_capacity: none" in report


def _read_jsonl(path: Path) -> list[dict[str, object]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
