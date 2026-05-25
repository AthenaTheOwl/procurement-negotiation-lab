from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from procurement_lab.algorithms.admm import ADMM
from procurement_lab.algorithms.oracle import CentralizedOracle
from procurement_mechanism_sdk import (
    compare_mechanisms,
    compute_participation_report,
    sample_scenario,
    solve_allocation,
)


def test_sample_scenario_exposes_reference_engine_shape() -> None:
    scenario = sample_scenario()

    assert scenario.id == "sdk-substrate-crunch"
    assert scenario.n_periods == 1
    assert [participant.role.value for participant in scenario.participants] == [
        "buyer",
        "supplier",
    ]
    assert scenario.capacity[scenario.products[0].id] == pytest.approx(800.0)


def test_solve_allocation_matches_existing_admm_behavior() -> None:
    scenario = sample_scenario()

    sdk_run = solve_allocation(
        scenario,
        mechanism="admm",
        max_iter=80,
        tolerance=0.5,
    )
    direct_run = ADMM().run(scenario, max_iter=80, tolerance=0.5)

    assert sdk_run.algorithm == "admm"
    assert sdk_run.iterations[-1].consensus == direct_run.iterations[-1].consensus
    assert sdk_run.ledger.global_utility == pytest.approx(direct_run.ledger.global_utility)


def test_compare_mechanisms_adds_oracle_gap_and_transfer() -> None:
    scenario = sample_scenario()

    comparison = compare_mechanisms(
        scenario,
        mechanisms=("admm", "consensus_averaging"),
        max_iter=80,
        tolerance=0.5,
    )
    admm_run = comparison.by_mechanism["admm"]

    assert comparison.oracle_run.algorithm == "centralized_oracle"
    assert admm_run.utility_gap_vs_oracle == pytest.approx(
        comparison.oracle_run.ledger.global_utility - admm_run.ledger.global_utility
    )
    assert admm_run.transfer is not None
    assert comparison.best_non_oracle in comparison.runs


def test_participation_report_uses_existing_cbt_logic() -> None:
    scenario = sample_scenario("risky")
    run = solve_allocation(scenario, mechanism="admm", max_iter=80, tolerance=0.5)
    oracle_run = CentralizedOracle().run(scenario)

    report = compute_participation_report(run, oracle_run=oracle_run)

    assert report.mechanism == "admm"
    assert report.oracle_gap == pytest.approx(
        oracle_run.ledger.global_utility - run.ledger.global_utility
    )
    assert report.feasible is True
    assert all(report.no_worse_off.values())


def test_cli_demo_runs_without_web_app() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    env["PYTHONPATH"] = os.pathsep.join(
        [str(repo_root / "src"), env.get("PYTHONPATH", "")]
    )

    result = subprocess.run(
        [sys.executable, "-m", "procurement_mechanism_sdk.demo"],
        check=True,
        capture_output=True,
        text=True,
        env=env,
    )
    payload = json.loads(result.stdout)

    assert payload["scenario_id"] == "sdk-substrate-crunch"
    assert {run["mechanism"] for run in payload["runs"]} == {
        "centralized_oracle",
        "admm",
        "consensus_averaging",
    }
    assert payload["admm_participation"]["feasible"] is True
