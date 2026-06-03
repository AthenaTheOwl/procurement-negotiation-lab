"""Centralized oracle — brute-force search for the global optimum.

Educational baseline: pretends a benevolent central planner sees everyone's
utility functions and picks the joint quantity vector that maximizes
sum-of-utilities subject to capacity. Other algorithms are graded against
this oracle's global utility.

v1 supports N>=2 participants and n_periods=1 via grid search over a
single consensus quantity. Multi-period oracle is a later extension
that can move to a proper LP/MIP via SciPy or HiGHS once the allocation
vector has more than one decision variable.
"""

from __future__ import annotations

import time

from procurement_lab.engine.information import overrides_for_mode
from procurement_lab.engine.schemas import (
    AlgorithmRun,
    Convergence,
    InformationMode,
    IterationRecord,
    Scenario,
)
from procurement_lab.engine.utility import (
    build_ledger,
    evaluate_participant_utility,
)


class CentralizedOracle:
    """The educational gold-standard. NOT a deployable mechanism."""

    name = "centralized_oracle"

    def __init__(self, *, grid_step: float = 25.0) -> None:
        self.grid_step = grid_step

    def run(
        self,
        scenario: Scenario,
        *,
        information_mode: InformationMode = InformationMode.FULL_ORACLE,
        max_iter: int = 1,  # unused; oracle is one-shot
        tolerance: float = 0.01,  # unused
    ) -> AlgorithmRun:
        started = time.perf_counter()
        overrides = overrides_for_mode(scenario, information_mode)

        product = scenario.products[0]
        cap = scenario.capacity.get(product.id, product.demand_mean * 2.0)
        upper = max(cap, product.demand_mean * 1.5)
        # build a discrete grid of candidate quantities per period
        grid = _grid(0.0, upper, self.grid_step)

        # W4 lifts participant count; this remains single-period.
        if scenario.n_periods != 1:
            raise NotImplementedError("oracle v0 supports n_periods=1 only")

        # search: pick the consensus quantity that maximizes sum of utilities
        # (assuming both participants must agree on the same quantity)
        best_q = grid[0]
        best_u = -float("inf")
        for q in grid:
            quantities = {p.id: [q] for p in scenario.participants}
            total = sum(
                evaluate_participant_utility(
                    p, scenario, [q], overrides=overrides.get(p.id)
                )
                for p in scenario.participants
            )
            if total > best_u:
                best_u = total
                best_q = q

        quantities = {p.id: [best_q] for p in scenario.participants}
        ledger = build_ledger(
            scenario, quantities, overrides_per_participant=overrides
        )

        iteration = IterationRecord(
            iteration=0,
            quantities=quantities,
            consensus=[best_q],
            residual=0.0,
            price_signal=0.0,
        )

        runtime_ms = (time.perf_counter() - started) * 1000
        return AlgorithmRun(
            scenario_id=scenario.id,
            algorithm=self.name,
            information_mode=information_mode,
            convergence=Convergence.CONVERGED,
            iterations=[iteration],
            ledger=ledger,
            transfer=None,  # oracle doesn't need a transfer; it already maximized joint utility
            runtime_ms=runtime_ms,
            final_residual=0.0,
            utility_gap_vs_oracle=0.0,  # oracle vs itself
        )


def _grid(lo: float, hi: float, step: float) -> list[float]:
    if step <= 0:
        raise ValueError(f"step must be > 0 (got {step})")
    if hi < lo:
        raise ValueError(f"hi ({hi}) must be >= lo ({lo})")
    n = int((hi - lo) / step) + 1
    return [round(lo + i * step, 6) for i in range(n + 1)]
