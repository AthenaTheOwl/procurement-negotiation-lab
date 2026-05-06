"""Coordination algorithms with a common trace schema."""

from __future__ import annotations

import time
from collections.abc import Callable

from procurement_lab.cbt import compute_transfer
from procurement_lab.information_modes import information_profile
from procurement_lab.scenario_loader import ScenarioSpec, scenario_to_context
from procurement_lab.trace_schema import (
    AlgorithmMetrics,
    AlgorithmName,
    CoordinationTrace,
    InformationMode,
    IterationRecord,
)
from procurement_lab.utility_accounting import ledger_for_quantity, participant_utility

QuantityUtility = Callable[[float], float]


def quantity_grid(scenario: ScenarioSpec, step: float = 4.0) -> list[float]:
    product = scenario.products[0]
    supplier = scenario.suppliers[0]
    upper = max(product.demand_mean * 1.5, supplier.capacity * 1.25, 20.0)
    count = int(upper / step) + 1
    return [round(index * step, 6) for index in range(count + 1)]


def run_algorithm(
    scenario: ScenarioSpec,
    *,
    algorithm: AlgorithmName,
    information_mode: InformationMode = "full_oracle",
    max_iter: int = 24,
    rho: float = 1.5,
) -> CoordinationTrace:
    started = time.perf_counter()
    actual_context = scenario_to_context(scenario, quantity=0)
    profile = information_profile(information_mode, actual_context)
    buyer = next(p for p in scenario.participants if p.role == "buyer")
    supplier = next(p for p in scenario.participants if p.role == "supplier")

    def buyer_utility(q: float) -> float:
        return participant_utility(buyer, scenario, quantity=q, overrides=profile.buyer_overrides)

    def supplier_utility(q: float) -> float:
        return participant_utility(
            supplier, scenario, quantity=q, overrides=profile.supplier_overrides
        )

    oracle_quantity = _centralized_quantity(scenario)
    oracle_ledger = ledger_for_quantity(scenario, quantity=oracle_quantity)

    if algorithm == "centralized_oracle":
        iterations = [
            IterationRecord(
                iteration=0,
                buyer_quantity=oracle_quantity,
                supplier_quantity=oracle_quantity,
                consensus_quantity=oracle_quantity,
                price_signal=0.0,
                residual=0.0,
            )
        ]
    elif algorithm == "admm":
        iterations = _run_admm(
            buyer_utility, supplier_utility, scenario, max_iter=max_iter, rho=rho
        )
    elif algorithm == "alternating_best_response":
        iterations = _run_alternating(buyer_utility, supplier_utility, scenario, max_iter=max_iter)
    elif algorithm == "price_only_dual":
        iterations = _run_price_dual(buyer_utility, supplier_utility, scenario, max_iter=max_iter)
    elif algorithm == "consensus_averaging":
        iterations = _run_consensus_average(
            buyer_utility, supplier_utility, scenario, max_iter=max_iter
        )
    else:
        raise ValueError(f"unknown algorithm: {algorithm}")

    final = iterations[-1]
    ledger = ledger_for_quantity(scenario, quantity=final.consensus_quantity)
    transfer = compute_transfer(ledger)
    runtime_ms = (time.perf_counter() - started) * 1000
    violation = max(0.0, final.consensus_quantity - scenario.suppliers[0].capacity)
    metrics = AlgorithmMetrics(
        algorithm=algorithm,
        information_mode=information_mode,
        iterations=len(iterations),
        runtime_ms=runtime_ms,
        residual=final.residual,
        utility_gap_vs_oracle=oracle_ledger.global_utility - ledger.global_utility,
        feasibility_violation=violation,
        explanation_quality=0.85 if algorithm != "centralized_oracle" else 0.95,
    )
    citations = scenario.suppliers[0].evidence_ids
    return CoordinationTrace(
        scenario_id=scenario.id,
        algorithm=algorithm,
        information_mode=information_mode,
        product_id=scenario.products[0].id,
        period=1,
        iterations=iterations,
        ledger=ledger,
        transfer=transfer,
        metrics=metrics,
        citations=citations,
    )


def run_algorithm_suite(
    scenario: ScenarioSpec,
    information_mode: InformationMode = "forecast_band",
) -> list[CoordinationTrace]:
    algorithms: tuple[AlgorithmName, ...] = (
        "centralized_oracle",
        "admm",
        "alternating_best_response",
        "price_only_dual",
        "consensus_averaging",
    )
    return [
        run_algorithm(scenario, algorithm=algorithm, information_mode=information_mode)
        for algorithm in algorithms
    ]


def _argmax(grid: list[float], fn: QuantityUtility) -> float:
    best_q = grid[0]
    best_v = fn(best_q)
    for q in grid[1:]:
        value = fn(q)
        if value > best_v:
            best_q = q
            best_v = value
    return best_q


def _admm_objective(base: QuantityUtility, *, dual: float, z: float, rho: float) -> QuantityUtility:
    def objective(q: float) -> float:
        return base(q) - dual * q - 0.5 * rho * (q - z) ** 2

    return objective


def _proximity_objective(
    base: QuantityUtility, *, target: float, weight: float
) -> QuantityUtility:
    def objective(q: float) -> float:
        return base(q) - weight * (q - target) ** 2

    return objective


def _price_objective(base: QuantityUtility, *, price: float, sign: float) -> QuantityUtility:
    def objective(q: float) -> float:
        return base(q) + sign * price * q

    return objective


def _centralized_quantity(scenario: ScenarioSpec) -> float:
    grid = quantity_grid(scenario)
    buyer = next(p for p in scenario.participants if p.role == "buyer")
    supplier = next(p for p in scenario.participants if p.role == "supplier")
    return _argmax(
        grid,
        lambda q: participant_utility(buyer, scenario, quantity=q)
        + participant_utility(supplier, scenario, quantity=q),
    )


def _run_admm(
    buyer_utility: QuantityUtility,
    supplier_utility: QuantityUtility,
    scenario: ScenarioSpec,
    *,
    max_iter: int,
    rho: float,
) -> list[IterationRecord]:
    grid = quantity_grid(scenario)
    z = scenario.products[0].demand_mean * 0.8
    buyer_dual = 0.0
    supplier_dual = 0.0
    rows: list[IterationRecord] = []
    for iteration in range(max_iter):
        buyer_q = _argmax(grid, _admm_objective(buyer_utility, dual=buyer_dual, z=z, rho=rho))
        supplier_q = _argmax(
            grid, _admm_objective(supplier_utility, dual=supplier_dual, z=z, rho=rho)
        )
        z = (buyer_q + supplier_q) / 2.0
        buyer_dual += rho * (buyer_q - z)
        supplier_dual += rho * (supplier_q - z)
        residual = abs(buyer_q - supplier_q)
        rows.append(
            IterationRecord(
                iteration=iteration,
                buyer_quantity=buyer_q,
                supplier_quantity=supplier_q,
                consensus_quantity=z,
                price_signal=(buyer_dual - supplier_dual) / 2.0,
                residual=residual,
            )
        )
        if residual <= 0.01:
            break
    return rows


def _run_alternating(
    buyer_utility: QuantityUtility,
    supplier_utility: QuantityUtility,
    scenario: ScenarioSpec,
    *,
    max_iter: int,
) -> list[IterationRecord]:
    grid = quantity_grid(scenario)
    buyer_q = _argmax(grid, buyer_utility)
    supplier_q = _argmax(grid, _proximity_objective(supplier_utility, target=buyer_q, weight=0.1))
    rows: list[IterationRecord] = []
    for iteration in range(max_iter):
        buyer_q = _argmax(
            grid, _proximity_objective(buyer_utility, target=supplier_q, weight=0.12)
        )
        supplier_q = _argmax(
            grid, _proximity_objective(supplier_utility, target=buyer_q, weight=0.12)
        )
        z = (buyer_q + supplier_q) / 2.0
        residual = abs(buyer_q - supplier_q)
        rows.append(
            IterationRecord(
                iteration=iteration,
                buyer_quantity=buyer_q,
                supplier_quantity=supplier_q,
                consensus_quantity=z,
                price_signal=0.0,
                residual=residual,
            )
        )
        if residual <= 0.01:
            break
    return rows


def _run_price_dual(
    buyer_utility: QuantityUtility,
    supplier_utility: QuantityUtility,
    scenario: ScenarioSpec,
    *,
    max_iter: int,
) -> list[IterationRecord]:
    grid = quantity_grid(scenario)
    price_signal = 0.0
    rows: list[IterationRecord] = []
    for iteration in range(max_iter):
        buyer_q = _argmax(grid, _price_objective(buyer_utility, price=price_signal, sign=-1.0))
        supplier_q = _argmax(
            grid, _price_objective(supplier_utility, price=price_signal, sign=1.0)
        )
        residual = abs(buyer_q - supplier_q)
        z = (buyer_q + supplier_q) / 2.0
        price_signal += 0.35 * (buyer_q - supplier_q)
        rows.append(
            IterationRecord(
                iteration=iteration,
                buyer_quantity=buyer_q,
                supplier_quantity=supplier_q,
                consensus_quantity=z,
                price_signal=price_signal,
                residual=residual,
            )
        )
        if residual <= 0.01:
            break
    return rows


def _run_consensus_average(
    buyer_utility: QuantityUtility,
    supplier_utility: QuantityUtility,
    scenario: ScenarioSpec,
    *,
    max_iter: int,
) -> list[IterationRecord]:
    grid = quantity_grid(scenario)
    buyer_ideal = _argmax(grid, buyer_utility)
    supplier_ideal = _argmax(grid, supplier_utility)
    z = (buyer_ideal + supplier_ideal) / 2.0
    rows: list[IterationRecord] = []
    for iteration in range(max_iter):
        buyer_q = 0.65 * z + 0.35 * buyer_ideal
        supplier_q = 0.65 * z + 0.35 * supplier_ideal
        z = (buyer_q + supplier_q) / 2.0
        residual = abs(buyer_q - supplier_q)
        rows.append(
            IterationRecord(
                iteration=iteration,
                buyer_quantity=buyer_q,
                supplier_quantity=supplier_q,
                consensus_quantity=z,
                price_signal=0.0,
                residual=residual,
            )
        )
        if residual <= 0.01:
            break
    return rows
