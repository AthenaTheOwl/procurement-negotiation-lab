"""Utility accounting — evaluate participant utility from formulas + scenario.

The runner builds a namespace per participant (their own quantity vector,
their parameters, plus scenario-derived constants like demand_mean and
risk_score) and evaluates the formula. Aggregating across participants
yields the global utility ledger.
"""

from __future__ import annotations

from procurement_lab.engine.formula import compile_formula
from procurement_lab.engine.schemas import (
    Participant,
    Scenario,
    UtilityLedger,
)


def evaluate_participant_utility(
    participant: Participant,
    scenario: Scenario,
    quantity_vector: list[float],
    *,
    overrides: dict[str, float] | None = None,
) -> float:
    """Evaluate one participant's utility formula for a given quantity vector.

    For n_periods=1 the formula is evaluated once with `q` bound to the scalar
    quantity. For multi-period, the formula is treated as the per-period
    utility and summed across t=0..n_periods-1, with `q` rebound each period
    and `t` exposed as the period index.

    `overrides` lets the information-modes layer mask or perturb scenario
    parameters (e.g. capacity-band shows only a band, not exact capacity).
    """

    if len(quantity_vector) != scenario.n_periods:
        raise ValueError(
            f"quantity_vector length {len(quantity_vector)} "
            f"!= n_periods {scenario.n_periods}"
        )

    product = scenario.products[0]  # v0: single product per scenario
    base_namespace: dict[str, float] = {
        "demand": product.demand_mean,
        "demand_mean": product.demand_mean,
        "demand_std": product.demand_std,
        "unit_value": product.unit_value,
        "risk_score": scenario.risk_score,
        "capacity": scenario.capacity.get(product.id, float("inf")),
        "n_periods": float(scenario.n_periods),
        **participant.parameters,
    }
    if overrides:
        base_namespace.update(overrides)

    compiled = compile_formula(participant.utility_formula)

    if scenario.n_periods == 1:
        namespace = {**base_namespace, "q": float(quantity_vector[0])}
        return float(compiled.evaluate(namespace))

    total = 0.0
    for t in range(scenario.n_periods):
        period_namespace = {
            **base_namespace,
            "q": float(quantity_vector[t]),
            "t": float(t),
        }
        total += float(compiled.evaluate(period_namespace))
    return total


def build_ledger(
    scenario: Scenario,
    quantities: dict[str, list[float]],
    *,
    overrides_per_participant: dict[str, dict[str, float]] | None = None,
) -> UtilityLedger:
    """Compute the local + global utility ledger for an outcome."""

    overrides_per_participant = overrides_per_participant or {}
    local: dict[str, float] = {}
    outside: dict[str, float] = {}
    feasible = True

    for participant in scenario.participants:
        if participant.id not in quantities:
            raise ValueError(f"missing quantity for participant {participant.id!r}")
        q_vec = quantities[participant.id]
        u = evaluate_participant_utility(
            participant,
            scenario,
            q_vec,
            overrides=overrides_per_participant.get(participant.id),
        )
        local[participant.id] = u
        outside[participant.id] = participant.outside_option

    # Capacity feasibility: total quantity per period <= capacity (if set).
    product_id = scenario.products[0].id
    cap = scenario.capacity.get(product_id, float("inf"))
    # The supplier role's quantity is the relevant one for capacity
    for p in scenario.participants:
        if p.role.value == "supplier":
            q_vec = quantities[p.id]
            if any(q > cap + 1e-6 for q in q_vec):
                feasible = False
                break

    return UtilityLedger(
        local=local,
        outside_options=outside,
        global_utility=sum(local.values()),
        feasible=feasible,
    )
