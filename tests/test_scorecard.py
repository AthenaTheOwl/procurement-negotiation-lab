from __future__ import annotations

import json
from pathlib import Path

from procurement_lab.scorecard import (
    JSONL_NAME,
    MD_NAME,
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
        assert mechanism == _best_row(grouped[scenario_name])["mechanism"]
    assert set(grouped) == {name for name, _scenario in fixed_scenarios()}
    assert sum(len(scenario_rows) for scenario_rows in grouped.values()) == len(rows)


def _read_jsonl(path: Path) -> list[dict[str, object]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
