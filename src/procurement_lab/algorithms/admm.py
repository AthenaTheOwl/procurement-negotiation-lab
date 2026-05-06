"""ADMM — Alternating Direction Method of Multipliers.

Each participant solves a local subproblem augmented with a quadratic
proximal penalty pulling them toward the consensus z. After each round,
z is the average of participants' preferred quantities and the dual
variables update by the constraint violation. Standard recipe; see
Boyd et al., *Distributed Optimization via ADMM* (2011).

v0: discrete grid search per subproblem (2 participants, n_periods=1).
v1 will add gradient-based subproblem solvers and multi-party support.
"""

from __future__ import annotations

import time
from collections.abc import Callable

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


class ADMM:
    """Classical 2-block ADMM for buyer-supplier consensus."""

    name = "admm"

    def __init__(
        self,
        *,
        rho: float = 1.5,
        grid_step: float = 25.0,
    ) -> None:
        self.rho = rho
        self.grid_step = grid_step

    def run(
        self,
        scenario: Scenario,
        *,
        information_mode: InformationMode = InformationMode.FULL_ORACLE,
        max_iter: int = 50,
        tolerance: float = 0.01,
    ) -> AlgorithmRun:
        started = time.perf_counter()
        overrides = overrides_for_mode(scenario, information_mode)

        if scenario.n_periods != 1:
            raise NotImplementedError("ADMM v0 supports n_periods=1 only")
        if len(scenario.participants) != 2:
            raise NotImplementedError("ADMM v0 supports 2 participants only")

        product = scenario.products[0]
        cap = scenario.capacity.get(product.id, product.demand_mean * 2.0)
        upper = max(cap, product.demand_mean * 1.5)
        grid = _grid(0.0, upper, self.grid_step)

        z = product.demand_mean * 0.8  # start near forecast
        duals: dict[str, float] = {p.id: 0.0 for p in scenario.participants}
        rho = self.rho
        records: list[IterationRecord] = []

        def make_subproblem(
            participant: object,  # Participant; using object to avoid circular imports
            lam: float,
            z_consensus: float,
            rho_param: float,
        ) -> Callable[[float], float]:
            """Build the augmented Lagrangian objective for one participant."""

            def objective(q: float) -> float:
                return (
                    evaluate_participant_utility(
                        participant,  # type: ignore[arg-type]
                        scenario,
                        [q],
                        overrides=overrides.get(participant.id),  # type: ignore[attr-defined]
                    )
                    - lam * q
                    - 0.5 * rho_param * (q - z_consensus) ** 2
                )

            return objective

        convergence = Convergence.NOT_CONVERGED
        for it in range(max_iter):
            # Each participant solves its subproblem: maximize
            #     u_i(q) - lambda_i * q - 0.5 * rho * (q - z)^2
            new_quantities: dict[str, float] = {}
            for p in scenario.participants:
                best_q = _argmax(grid, make_subproblem(p, duals[p.id], z, rho))
                new_quantities[p.id] = best_q

            # Consensus update: average
            qs = list(new_quantities.values())
            new_z = sum(qs) / len(qs)
            residual = max(abs(q - new_z) for q in qs)

            # Dual update
            for pid, q in new_quantities.items():
                duals[pid] += rho * (q - new_z)

            records.append(
                IterationRecord(
                    iteration=it,
                    quantities={pid: [q] for pid, q in new_quantities.items()},
                    consensus=[new_z],
                    residual=residual,
                    price_signal=sum(duals.values()) / len(duals),
                )
            )

            z = new_z
            if residual <= tolerance:
                convergence = Convergence.CONVERGED
                break
        else:
            # max_iter reached without convergence; check if oscillating
            recent = records[-5:] if len(records) >= 5 else records
            residuals = [r.residual for r in recent]
            if max(residuals) - min(residuals) < tolerance and max(residuals) > tolerance:
                convergence = Convergence.OSCILLATING
            else:
                convergence = Convergence.NOT_CONVERGED

        # Final ledger uses the consensus quantity for both participants
        final_z = records[-1].consensus[0]
        final_quantities = {p.id: [final_z] for p in scenario.participants}
        ledger = build_ledger(
            scenario, final_quantities, overrides_per_participant=overrides
        )

        runtime_ms = (time.perf_counter() - started) * 1000
        return AlgorithmRun(
            scenario_id=scenario.id,
            algorithm=self.name,
            information_mode=information_mode,
            convergence=convergence,
            iterations=records,
            ledger=ledger,
            transfer=None,
            runtime_ms=runtime_ms,
            final_residual=records[-1].residual,
            utility_gap_vs_oracle=None,  # filled in by the lab when comparing
        )


def _argmax(grid: list[float], fn: Callable[[float], float]) -> float:
    best_q = grid[0]
    best_v = fn(best_q)
    for q in grid[1:]:
        v = fn(q)
        if v > best_v:
            best_q = q
            best_v = v
    return best_q


def _grid(lo: float, hi: float, step: float) -> list[float]:
    if step <= 0:
        raise ValueError(f"step must be > 0 (got {step})")
    n = int((hi - lo) / step) + 1
    return [round(lo + i * step, 6) for i in range(n + 1)]
