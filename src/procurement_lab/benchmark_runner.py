"""Benchmark matrix generation for app and tests."""

from __future__ import annotations

from procurement_lab.algorithms import run_algorithm_suite
from procurement_lab.information_modes import INFORMATION_MODES
from procurement_lab.scenario_loader import ScenarioSpec


def benchmark_scenario(scenario: ScenarioSpec) -> list[dict[str, float | str | int]]:
    rows: list[dict[str, float | str | int]] = []
    for mode in INFORMATION_MODES:
        traces = run_algorithm_suite(scenario, information_mode=mode)
        for trace in traces:
            rows.append(
                {
                    "algorithm": trace.algorithm,
                    "information_mode": trace.information_mode,
                    "iterations": trace.metrics.iterations,
                    "runtime_ms": round(trace.metrics.runtime_ms, 3),
                    "residual": round(trace.metrics.residual, 3),
                    "global_utility": round(trace.ledger.global_utility, 3),
                    "utility_gap_vs_oracle": round(trace.metrics.utility_gap_vs_oracle, 3),
                    "feasibility_violation": round(trace.metrics.feasibility_violation, 3),
                }
            )
    return rows
