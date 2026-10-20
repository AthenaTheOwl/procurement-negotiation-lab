"""Centralized oracle — brute-force search for the global optimum.

Educational baseline: pretends a benevolent central planner sees everyone's
utility functions and picks the joint quantity vector that maximizes
sum-of-utilities subject to capacity. Other algorithms are graded against
this oracle's global utility.

v1 supports N>=2 participants and n_periods=1 via search over a single
consensus quantity. The candidate set is every ``grid_step`` (default 1
unit) from 0 up to the product's capacity, plus the forecast demand and
the capacity itself. Quantities above capacity are never candidates, so
an allocation the ledger would mark infeasible cannot score.

Why 1 unit is enough: every shipped utility formula is piecewise linear
in ``q`` on ``[0, capacity]`` (the story supplier's quadratic overtime
term only applies above capacity, outside the search range), with kinks
only at ``demand``, at whole-unit parameters such as a packager's
``soft_capacity``, or at the capacity bound. A concave
piecewise-linear sum peaks on a kink or a bound, and all of those are in
the candidate set, so the search returns the exact optimum for those
formulas. For an arbitrary authored formula it is a 1-unit search.

Multi-period oracle is a later extension that can move to a proper
LP/MIP via SciPy or HiGHS once the allocation vector has more than one
decision variable.
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

    def __init__(self, *, grid_step: float = 1.0) -> None:
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
        # Capacity is a hard constraint: the search never leaves [0, capacity].
        # Without a declared capacity the ledger has no bound, so search up to
        # twice the forecast as before.
        upper = scenario.capacity.get(product.id, product.demand_mean * 2.0)
        grid = _candidates(upper, self.grid_step, breakpoints=(product.demand_mean,))

        # W4 lifts participant count; this remains single-period.
        if scenario.n_periods != 1:
            raise NotImplementedError("oracle v0 supports n_periods=1 only")

        # search: pick the consensus quantity that maximizes sum of utilities
        # (assuming both participants must agree on the same quantity).
        # Ties keep the smaller quantity because candidates ascend.
        best_q = grid[0]
        best_u = -float("inf")
        for q in grid:
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


def _candidates(
    upper: float,
    step: float,
    *,
    breakpoints: tuple[float, ...] = (),
) -> list[float]:
    """Return ascending candidates in [0, upper]: a ``step`` grid, the bound
    itself, and any breakpoints that fall inside the range."""

    if step <= 0:
        raise ValueError(f"step must be > 0 (got {step})")
    if upper < 0:
        raise ValueError(f"upper ({upper}) must be >= 0")
    n = int(upper / step + 1e-9)
    points = {round(i * step, 6) for i in range(n + 1)}
    points.add(upper)
    points.update(b for b in breakpoints if 0.0 <= b <= upper)
    return sorted(points)
