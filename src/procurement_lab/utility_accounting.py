"""Utility accounting in dollars."""

from __future__ import annotations

from procurement_lab.formula_engine import FormulaError, evaluate_formula
from procurement_lab.scenario_loader import ParticipantSpec, ScenarioSpec, scenario_to_context
from procurement_lab.trace_schema import UtilityLedger


def participant_utility(
    participant: ParticipantSpec,
    scenario: ScenarioSpec,
    *,
    quantity: float,
    overrides: dict[str, float] | None = None,
) -> float:
    context = scenario_to_context(scenario, quantity=quantity, overrides=overrides)
    try:
        return evaluate_formula(participant.formula, context)
    except FormulaError:
        return float("-inf")


def ledger_for_quantity(
    scenario: ScenarioSpec,
    *,
    quantity: float,
    evaluation_overrides: dict[str, float] | None = None,
) -> UtilityLedger:
    buyer = next(p for p in scenario.participants if p.role == "buyer")
    supplier = next(p for p in scenario.participants if p.role == "supplier")
    buyer_utility = participant_utility(
        buyer, scenario, quantity=quantity, overrides=evaluation_overrides
    )
    supplier_utility = participant_utility(
        supplier, scenario, quantity=quantity, overrides=evaluation_overrides
    )
    product = scenario.products[0]
    supplier_spec = scenario.suppliers[0]
    feasible = quantity <= supplier_spec.capacity * 1.05 and quantity >= 0
    if quantity < product.demand_mean * 0.45:
        feasible = False
    return UtilityLedger(
        buyer_utility=buyer_utility,
        supplier_utility=supplier_utility,
        global_utility=buyer_utility + supplier_utility,
        buyer_outside_option=buyer.outside_option,
        supplier_outside_option=supplier.outside_option,
        feasible=feasible,
        quantity=quantity,
    )


def baseline_utility(scenario: ScenarioSpec) -> float:
    buyer = next(p for p in scenario.participants if p.role == "buyer")
    supplier = next(p for p in scenario.participants if p.role == "supplier")
    return buyer.outside_option + supplier.outside_option
