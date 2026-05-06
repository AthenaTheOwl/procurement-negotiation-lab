from __future__ import annotations

from procurement_lab.algorithms import run_algorithm, run_algorithm_suite
from procurement_lab.benchmark_runner import benchmark_scenario
from procurement_lab.information_modes import INFORMATION_MODES
from procurement_lab.scenario_loader import ScenarioSpec


def test_every_algorithm_returns_trace(scenario: ScenarioSpec) -> None:
    traces = run_algorithm_suite(scenario, information_mode="forecast_band")
    assert {trace.algorithm for trace in traces} == {
        "centralized_oracle",
        "admm",
        "alternating_best_response",
        "price_only_dual",
        "consensus_averaging",
    }
    assert all(trace.iterations for trace in traces)
    assert all(trace.metrics.iterations >= 1 for trace in traces)


def test_algorithm_metrics_compare_to_oracle(scenario: ScenarioSpec) -> None:
    oracle = run_algorithm(scenario, algorithm="centralized_oracle", information_mode="full_oracle")
    admm = run_algorithm(scenario, algorithm="admm", information_mode="full_oracle")
    assert oracle.metrics.utility_gap_vs_oracle == 0
    assert admm.metrics.utility_gap_vs_oracle >= -1e-6


def test_all_information_modes_benchmark(scenario: ScenarioSpec) -> None:
    rows = benchmark_scenario(scenario)
    assert len(rows) == len(INFORMATION_MODES) * 5
    assert all("global_utility" in row for row in rows)
