"""Simple coordination baselines for the Lab surface.

These are intentionally small educational algorithms. They are not meant to
beat ADMM in every case. They give the simulator a comparison set so learners
can see that ADMM is one coordination rule, not the answer by definition.
"""

from __future__ import annotations

import time
from collections.abc import Callable, Iterable

from procurement_lab.engine.information import overrides_for_mode
from procurement_lab.engine.schemas import (
    AlgorithmRun,
    Convergence,
    InformationMode,
    IterationRecord,
    Scenario,
)
from procurement_lab.engine.utility import build_ledger, evaluate_participant_utility

QuantityUtility = Callable[[float], float]


class AlternatingBestResponse:
    """Each participant reacts to the previous counterparty quantity."""

    name = "alternating_best_response"

    def __init__(self, *, grid_step: float = 25.0, proximity_weight: float = 0.08) -> None:
        self.grid_step = grid_step
        self.proximity_weight = proximity_weight

    def run(
        self,
        scenario: Scenario,
        *,
        information_mode: InformationMode = InformationMode.FULL_ORACLE,
        max_iter: int = 50,
        tolerance: float = 0.01,
    ) -> AlgorithmRun:
        started = time.perf_counter()
        _check_v0_shape(scenario, self.name)
        overrides = overrides_for_mode(scenario, information_mode)
        grid = _scenario_grid(scenario, self.grid_step)
        participants = scenario.participants

        quantities = {
            participant.id: _argmax(
                grid,
                _participant_objective(participant.id, scenario, information_mode),
            )
            for participant in participants
        }
        records: list[IterationRecord] = []
        convergence = Convergence.NOT_CONVERGED

        for iteration in range(max_iter):
            for participant in participants:
                target = _mean(
                    q for pid, q in quantities.items() if pid != participant.id
                )
                local = _participant_objective(participant.id, scenario, information_mode)

                def proximal_objective(
                    q: float,
                    local: QuantityUtility = local,
                    target: float = target,
                ) -> float:
                    return local(q) - self.proximity_weight * (q - target) ** 2

                quantities[participant.id] = _argmax(grid, proximal_objective)
            consensus = _mean(quantities.values())
            residual = max(abs(q - consensus) for q in quantities.values())
            records.append(
                _record(iteration, quantities, consensus, residual, price_signal=0.0)
            )
            if residual <= tolerance:
                convergence = Convergence.CONVERGED
                break

        final_consensus = records[-1].consensus[0]
        ledger = build_ledger(
            scenario,
            {p.id: [final_consensus] for p in participants},
            overrides_per_participant=overrides,
        )
        return _run(
            scenario=scenario,
            name=self.name,
            information_mode=information_mode,
            convergence=convergence,
            records=records,
            ledger=ledger,
            started=started,
        )


class PriceOnlyDual:
    """A price-like signal moves until buyer/supplier quantities meet."""

    name = "price_only_dual"

    def __init__(self, *, grid_step: float = 25.0, learning_rate: float = 0.35) -> None:
        self.grid_step = grid_step
        self.learning_rate = learning_rate

    def run(
        self,
        scenario: Scenario,
        *,
        information_mode: InformationMode = InformationMode.FULL_ORACLE,
        max_iter: int = 50,
        tolerance: float = 0.01,
    ) -> AlgorithmRun:
        started = time.perf_counter()
        _check_v0_shape(scenario, self.name)
        overrides = overrides_for_mode(scenario, information_mode)
        grid = _scenario_grid(scenario, self.grid_step)
        participants = scenario.participants
        price = 0.0
        records: list[IterationRecord] = []
        convergence = Convergence.NOT_CONVERGED

        for iteration in range(max_iter):
            quantities: dict[str, float] = {}
            for participant in participants:
                local = _participant_objective(participant.id, scenario, information_mode)
                sign = -1.0 if participant.role.value == "buyer" else 1.0

                def price_objective(
                    q: float,
                    local: QuantityUtility = local,
                    sign: float = sign,
                    price: float = price,
                ) -> float:
                    return local(q) + sign * price * q

                quantities[participant.id] = _argmax(grid, price_objective)
            consensus = _mean(quantities.values())
            residual = max(abs(q - consensus) for q in quantities.values())
            buyer_q = next(
                q
                for pid, q in quantities.items()
                if scenario.participant(pid).role.value == "buyer"
            )
            supplier_q = next(
                q
                for pid, q in quantities.items()
                if scenario.participant(pid).role.value == "supplier"
            )
            price += self.learning_rate * (buyer_q - supplier_q)
            records.append(_record(iteration, quantities, consensus, residual, price))
            if residual <= tolerance:
                convergence = Convergence.CONVERGED
                break

        final_consensus = records[-1].consensus[0]
        ledger = build_ledger(
            scenario,
            {p.id: [final_consensus] for p in participants},
            overrides_per_participant=overrides,
        )
        return _run(
            scenario=scenario,
            name=self.name,
            information_mode=information_mode,
            convergence=convergence,
            records=records,
            ledger=ledger,
            started=started,
        )


class ConsensusAveraging:
    """Move a fixed fraction from local ideals toward the shared average."""

    name = "consensus_averaging"

    def __init__(self, *, grid_step: float = 25.0, inertia: float = 0.65) -> None:
        self.grid_step = grid_step
        self.inertia = inertia

    def run(
        self,
        scenario: Scenario,
        *,
        information_mode: InformationMode = InformationMode.FULL_ORACLE,
        max_iter: int = 50,
        tolerance: float = 0.01,
    ) -> AlgorithmRun:
        started = time.perf_counter()
        _check_v0_shape(scenario, self.name)
        overrides = overrides_for_mode(scenario, information_mode)
        grid = _scenario_grid(scenario, self.grid_step)
        participants = scenario.participants
        ideals = {
            participant.id: _argmax(
                grid,
                _participant_objective(participant.id, scenario, information_mode),
            )
            for participant in participants
        }
        consensus = _mean(ideals.values())
        records: list[IterationRecord] = []
        convergence = Convergence.NOT_CONVERGED

        for iteration in range(max_iter):
            quantities = {
                pid: self.inertia * consensus + (1.0 - self.inertia) * ideal
                for pid, ideal in ideals.items()
            }
            consensus = _mean(quantities.values())
            residual = max(abs(q - consensus) for q in quantities.values())
            records.append(_record(iteration, quantities, consensus, residual, 0.0))
            if residual <= tolerance:
                convergence = Convergence.CONVERGED
                break

        ledger = build_ledger(
            scenario,
            {p.id: [records[-1].consensus[0]] for p in participants},
            overrides_per_participant=overrides,
        )
        return _run(
            scenario=scenario,
            name=self.name,
            information_mode=information_mode,
            convergence=convergence,
            records=records,
            ledger=ledger,
            started=started,
        )


def _participant_objective(
    participant_id: str,
    scenario: Scenario,
    information_mode: InformationMode,
) -> QuantityUtility:
    participant = scenario.participant(participant_id)
    overrides = overrides_for_mode(scenario, information_mode)

    def objective(q: float) -> float:
        return evaluate_participant_utility(
            participant,
            scenario,
            [q],
            overrides=overrides.get(participant.id),
        )

    return objective


def _scenario_grid(scenario: Scenario, step: float) -> list[float]:
    product = scenario.products[0]
    cap = scenario.capacity.get(product.id, product.demand_mean * 2.0)
    upper = max(cap, product.demand_mean * 1.5)
    return _grid(0.0, upper, step)


def _argmax(grid: list[float], fn: QuantityUtility) -> float:
    best_q = grid[0]
    best_v = fn(best_q)
    for q in grid[1:]:
        value = fn(q)
        if value > best_v:
            best_q = q
            best_v = value
    return best_q


def _grid(lo: float, hi: float, step: float) -> list[float]:
    if step <= 0:
        raise ValueError(f"step must be > 0 (got {step})")
    n = int((hi - lo) / step) + 1
    return [round(lo + index * step, 6) for index in range(n + 1)]


def _mean(values: Iterable[float]) -> float:
    items = list(values)
    if not items:
        raise ValueError("cannot average empty values")
    return sum(float(item) for item in items) / len(items)


def _record(
    iteration: int,
    quantities: dict[str, float],
    consensus: float,
    residual: float,
    price_signal: float,
) -> IterationRecord:
    return IterationRecord(
        iteration=iteration,
        quantities={pid: [q] for pid, q in quantities.items()},
        consensus=[consensus],
        residual=residual,
        price_signal=price_signal,
    )


def _run(
    *,
    scenario: Scenario,
    name: str,
    information_mode: InformationMode,
    convergence: Convergence,
    records: list[IterationRecord],
    ledger: object,
    started: float,
) -> AlgorithmRun:
    return AlgorithmRun(
        scenario_id=scenario.id,
        algorithm=name,
        information_mode=information_mode,
        convergence=convergence,
        iterations=records,
        ledger=ledger,  # type: ignore[arg-type]
        transfer=None,
        runtime_ms=(time.perf_counter() - started) * 1000,
        final_residual=records[-1].residual,
        utility_gap_vs_oracle=None,
    )


def _check_v0_shape(scenario: Scenario, algorithm: str) -> None:
    if scenario.n_periods != 1:
        raise NotImplementedError(f"{algorithm} v0 supports n_periods=1 only")
    if len(scenario.participants) != 2:
        raise NotImplementedError(f"{algorithm} v0 supports 2 participants only")
