from __future__ import annotations

from procurement_lab.scenario_loader import ScenarioSpec, scenario_to_context


def test_scenarios_load(scenarios: list[ScenarioSpec]) -> None:
    assert len(scenarios) >= 3
    assert all(scenario.participants for scenario in scenarios)


def test_context_contains_formula_variables(scenario: ScenarioSpec) -> None:
    context = scenario_to_context(scenario, quantity=10)
    expected = {
        "quantity",
        "demand",
        "price",
        "unit_value",
        "unit_cost",
        "capacity",
        "risk_score",
        "shortage_penalty",
        "holding_cost",
        "cancellation_penalty",
        "risk_penalty",
        "uncertainty",
    }
    assert expected.issubset(context)
