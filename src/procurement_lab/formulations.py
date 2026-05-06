"""Single and multi-period formulation helpers."""

from __future__ import annotations

from procurement_lab.algorithms import run_algorithm
from procurement_lab.scenario_loader import ProductSpec, ScenarioSpec
from procurement_lab.trace_schema import AlgorithmName, InformationMode


def run_plan_matrix(
    scenario: ScenarioSpec,
    *,
    algorithm: AlgorithmName,
    information_mode: InformationMode,
) -> list[dict[str, float | str | int]]:
    """Run independent product-period dimensions and aggregate them for Arena.

    This v1 lab keeps cross-product coupling out of the solver so the teaching
    mechanics stay legible. Capacity coupling is exposed in docs as a v2 bridge.
    """

    rows: list[dict[str, float | str | int]] = []
    for product in scenario.products:
        for period in range(1, scenario.periods + 1):
            period_product = _product_for_period(product, period, scenario.periods)
            subscenario = scenario.model_copy(update={"products": [period_product], "periods": 1})
            trace = run_algorithm(
                subscenario,
                algorithm=algorithm,
                information_mode=information_mode,
            )
            rows.append(
                {
                    "product": product.id,
                    "period": period,
                    "algorithm": algorithm,
                    "information_mode": information_mode,
                    "quantity": round(trace.ledger.quantity, 3),
                    "global_utility": round(trace.ledger.global_utility, 3),
                    "residual": round(trace.metrics.residual, 3),
                    "feasible": str(trace.ledger.feasible),
                }
            )
    return rows


def _product_for_period(product: ProductSpec, period: int, periods: int) -> ProductSpec:
    horizon_factor = 1.0 - 0.18 * ((period - 1) / max(periods - 1, 1))
    uncertainty_factor = 1.0 + 0.12 * (period - 1)
    return product.model_copy(
        update={
            "demand_mean": max(1.0, product.demand_mean * horizon_factor),
            "demand_sigma": product.demand_sigma * uncertainty_factor,
        }
    )
