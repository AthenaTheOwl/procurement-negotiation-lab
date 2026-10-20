from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from procurement_lab.algorithms.admm import ADMM
from procurement_lab.algorithms.oracle import CentralizedOracle
from procurement_lab.scorecard import fixed_scenarios
from procurement_lab.sensitivity import build_stress_grid
from procurement_mechanism_sdk import (
    DEFAULT_MECHANISMS,
    InformationMode,
    Scenario,
    build_procurement_scenario,
    compare_mechanisms,
    compute_participation_report,
    sample_scenario,
    select_mechanism,
    solve_allocation,
)


def _tight_capacity_scenario() -> Scenario:
    return build_procurement_scenario(
        scenario_id="sdk-tight-capacity-test",
        demand_mean=620.0,
        capacity=360.0,
        risk_score=0.25,
    )


def _report_scenarios() -> list[Scenario]:
    scenarios = [scenario for _name, scenario in fixed_scenarios()]
    for cell in build_stress_grid():
        scenarios.append(
            build_procurement_scenario(
                scenario_id=f"sdk-test-{cell['scenario_name']}",
                demand_mean=cell["stress_demand"],
                demand_std=cell["demand_volatility"],
                capacity=cell["capacity"],
                risk_score=cell["supplier_risk"],
            )
        )
    return scenarios


def test_sample_scenario_exposes_reference_engine_shape() -> None:
    scenario = sample_scenario()

    assert scenario.id == "sdk-substrate-crunch"
    assert scenario.n_periods == 1
    assert [participant.role.value for participant in scenario.participants] == [
        "buyer",
        "supplier",
    ]
    assert scenario.capacity[scenario.products[0].id] == pytest.approx(800.0)


def test_multi_party_sample_exposes_three_party_shape() -> None:
    scenario = sample_scenario("multi_party")

    assert scenario.id == "sdk-substrate-crunch-multi-party"
    assert len(scenario.participants) == 3
    assert [participant.role.value for participant in scenario.participants] == [
        "buyer",
        "supplier",
        "packager",
    ]


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


@pytest.mark.parametrize("demand", [537.5, 512.3, 362.5])
def test_admm_reaches_a_non_integer_demand_optimum_exactly(demand: float) -> None:
    scenario = build_procurement_scenario(demand_mean=demand, capacity=800, risk_score=0.3)

    comparison = compare_mechanisms(scenario, mechanisms=("centralized_oracle", "admm"))
    admm_run = comparison.by_mechanism["admm"]

    assert admm_run.convergence.value == "converged"
    assert admm_run.iterations[-1].consensus == [pytest.approx(demand)]
    assert admm_run.utility_gap_vs_oracle == pytest.approx(0.0)


def test_sdk_runs_weighted_nash_bounded_on_multi_party_sample() -> None:
    scenario = sample_scenario("multi_party")

    run = solve_allocation(
        scenario,
        mechanism="weighted_nash_bounded",
        information_mode=InformationMode.PRIVATE,
    )

    assert run.algorithm == "weighted_nash_bounded"
    assert run.failure is None
    assert run.leakage_report is not None
    assert len(run.leakage_report.per_party) == 3
    assert set(run.ledger.local) == {
        "buyer-northstar",
        "supplier-cinder",
        "packager-orion",
    }


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


def test_compare_mechanisms_accepts_weighted_nash_ids_on_multi_party_sample() -> None:
    scenario = sample_scenario("multi_party")

    comparison = compare_mechanisms(
        scenario,
        mechanisms=("weighted_nash_plaintext", "weighted_nash_bounded"),
    )

    assert set(comparison.by_mechanism) == {
        "weighted_nash_plaintext",
        "weighted_nash_bounded",
    }
    assert comparison.by_mechanism["weighted_nash_bounded"].leakage_report is not None
    assert comparison.best_non_oracle is not None


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


def test_select_mechanism_recommends_best_eligible_non_oracle() -> None:
    scenario = sample_scenario()

    selection = select_mechanism(
        scenario,
        mechanisms=("centralized_oracle", "admm", "consensus_averaging"),
        max_iter=80,
        tolerance=0.5,
    )

    assert selection.scenario_id == "sdk-substrate-crunch"
    assert selection.recommended is not None
    assert selection.recommended.mechanism == "admm"
    assert selection.recommended.eligible is True
    assert selection.ranking[0].oracle_gap == pytest.approx(0.0)
    assert selection.ranking[-1].mechanism == "consensus_averaging"
    assert selection.ranking[-1].eligible is False
    assert "not_converged:not_converged" in selection.ranking[-1].reasons


def test_no_mechanism_beats_the_oracle_in_any_report_scenario() -> None:
    """Every scored run sits at or below the oracle; over-capacity runs are unscored."""
    checked = 0
    for scenario in _report_scenarios():
        for mechanism in DEFAULT_MECHANISMS:
            try:
                comparison = compare_mechanisms(
                    scenario, mechanisms=(mechanism,), max_iter=80, tolerance=0.5
                )
            except NotImplementedError:
                continue  # two-party baselines do not run on the multi-party sample
            run = comparison.by_mechanism[mechanism]
            oracle_utility = comparison.oracle_run.ledger.global_utility
            assert comparison.oracle_run.ledger.feasible is True
            if not run.ledger.feasible:
                assert run.utility_gap_vs_oracle is None, (scenario.id, mechanism)
                continue
            assert run.utility_gap_vs_oracle is not None
            assert run.utility_gap_vs_oracle >= -1e-6, (scenario.id, mechanism)
            assert run.ledger.global_utility <= oracle_utility + 1e-6
            checked += 1

    assert checked > 0


def test_over_capacity_allocation_is_not_scored() -> None:
    scenario = _tight_capacity_scenario()

    comparison = compare_mechanisms(
        scenario,
        mechanisms=("admm", "weighted_nash_plaintext"),
        max_iter=80,
        tolerance=0.5,
    )
    admm_run = comparison.by_mechanism["admm"]
    report = compute_participation_report(admm_run, oracle_run=comparison.oracle_run)

    assert comparison.oracle_run.iterations[0].consensus[0] == pytest.approx(360.0)
    assert admm_run.ledger.feasible is False
    assert admm_run.ledger.global_utility > comparison.oracle_run.ledger.global_utility
    assert admm_run.utility_gap_vs_oracle is None
    assert report.oracle_gap is None
    assert comparison.best_non_oracle is None


def test_select_mechanism_never_recommends_an_over_capacity_plan() -> None:
    selection = select_mechanism(
        _tight_capacity_scenario(),
        mechanisms=("centralized_oracle", "admm", "weighted_nash_plaintext"),
        max_iter=80,
        tolerance=0.5,
    )

    assert selection.recommended is None
    assert all(not score.eligible for score in selection.ranking)
    assert all("allocation_infeasible" in score.reasons for score in selection.ranking)


def test_select_mechanism_can_rank_non_converged_when_allowed() -> None:
    scenario = sample_scenario()

    selection = select_mechanism(
        scenario,
        mechanisms=("consensus_averaging",),
        max_iter=80,
        tolerance=0.5,
        require_converged=False,
    )

    assert selection.recommended is not None
    assert selection.recommended.mechanism == "consensus_averaging"
    assert selection.recommended.eligible is True
    assert "eligible" in selection.recommended.reasons


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
    assert payload["participation"]["feasible"] is True
    assert payload["selection"]["recommended"] == "admm"
    assert [row["mechanism"] for row in payload["selection"]["ranking"]][:2] == [
        "admm",
        "consensus_averaging",
    ]


def test_cli_demo_exercises_multi_party_weighted_nash() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    env["PYTHONPATH"] = os.pathsep.join(
        [str(repo_root / "src"), env.get("PYTHONPATH", "")]
    )

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "procurement_mechanism_sdk.demo",
            "--sample",
            "multi_party",
            "--mechanism",
            "weighted_nash_bounded",
        ],
        check=True,
        capture_output=True,
        text=True,
        env=env,
    )
    payload = json.loads(result.stdout)

    assert payload["participant_count"] == 3
    assert payload["runs"][0]["mechanism"] == "weighted_nash_bounded"
    assert payload["participation"]["mechanism"] == "weighted_nash_bounded"
    assert payload["participation"]["feasible"] is True
