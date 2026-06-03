"""Weighted-Nash bargaining solver (DEC-NASH-001 + DEC-NASH-002).

Implements the lab's flagship bargaining mechanism: maximize the
weighted product of utility gains above each party's BATNA. Two
algorithms ship in this module:

- ``WeightedNashPlaintext``: reference solver that grid-searches the
  feasible set and returns the allocation maximizing
  ``prod_p (max(u_p(x) - d_p, 0)) ** alpha_p``. The aggregator sees
  every party's utility function. Use this for the centralized-
  oracle-style comparison baseline.
- ``WeightedNashBounded``: same objective, but solved through the
  bounded-leakage iterative protocol (engine.privacy) when
  ``information_mode=PRIVATE``. The aggregator never sees utility
  functions or values; parties exchange only ternary direction
  vectors and bounded step proposals. Returns a LeakageReport with
  the run.

Both share parameters from DEC-NASH-001 (NASH_QUANTIZATION_LEVELS,
tie-breaking rule, infeasibility reason codes, mechanism identifiers).
Parameters are mirrored to packages/engine/src/weighted_nash_params.json
for the TS engine mirror (DEC-NASH-001 W2 Codex lane T-NASH-009).

The MPC mechanism (DEC-MPC-001, W5) registers under
``weighted_nash_mpc`` in a future module; this file ships the
plaintext + bounded-leakage variants only.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass

from procurement_lab.engine.information import overrides_for_mode
from procurement_lab.engine.privacy import (
    PROTOCOL_VERSION,
    ProtocolOutcome,
    run_bounded_leakage_protocol,
)
from procurement_lab.engine.schemas import (
    AlgorithmRun,
    Convergence,
    InformationMode,
    IterationRecord,
    LeakageReport,
    MechanismFailure,
    MechanismFailureReason,
    Scenario,
)
from procurement_lab.engine.utility import (
    build_ledger,
    evaluate_participant_utility,
)


# --- DEC-NASH-001 parameters (mirrored to weighted_nash_params.json) -------


NASH_QUANTIZATION_LEVELS = 64
TIE_BREAK_TOLERANCE = 1e-9
PLAINTEXT_NUMERICAL_TOLERANCE = 1e-4
PROTOCOL_NUMERICAL_TOLERANCE = 1e-3


# --- Plaintext reference solver --------------------------------------------


@dataclass(frozen=True)
class WeightedNashSolution:
    """Internal type returned by the plaintext grid search."""

    allocation: list[float]
    nash_product: float
    feasible: bool
    reason: MechanismFailureReason | None = None


def compute_nash_product(
    scenario: Scenario,
    allocation: list[float],
    *,
    weights: dict[str, float],
) -> float:
    """Compute prod_p (max(u_p - d_p, 0)) ** alpha_p for one allocation.

    Returns 0.0 if any party falls strictly below its BATNA after the
    ``max(.., 0)`` clamp on that party's contribution; the clamp is
    deliberate per DEC-NASH-001 so the solver excludes infeasible
    candidates from the argmax search without short-circuiting.
    """
    product = 1.0
    for party in scenario.participants:
        u = evaluate_participant_utility(party, scenario, allocation)
        gain = max(0.0, u - party.outside_option)
        alpha = weights.get(party.id, 1.0)
        if gain == 0.0 and alpha > 0:
            return 0.0
        product *= gain ** alpha
    return product


def plaintext_argmax(
    scenario: Scenario,
    *,
    weights: dict[str, float],
    upper_bound: float,
) -> WeightedNashSolution:
    """Grid-search the feasible single-product allocation for the Nash maximum.

    Uses ``NASH_QUANTIZATION_LEVELS`` levels from 0 to ``upper_bound``.
    Tie-breaking is lexicographic on the allocation values per
    DEC-NASH-001 (deterministic; never relies on dict ordering).
    Returns a ``WeightedNashSolution`` whose ``feasible`` field is
    False if no candidate gives a positive Nash product (i.e., every
    candidate puts at least one party below BATNA).
    """
    if scenario.n_periods != 1:
        return WeightedNashSolution(
            allocation=[0.0],
            nash_product=0.0,
            feasible=False,
            reason=MechanismFailureReason.NO_FEASIBLE_ALLOCATION,
        )
    if upper_bound <= 0:
        return WeightedNashSolution(
            allocation=[0.0],
            nash_product=0.0,
            feasible=False,
            reason=MechanismFailureReason.CAPACITY_EXCEEDED,
        )

    grid = [
        upper_bound * i / (NASH_QUANTIZATION_LEVELS - 1)
        for i in range(NASH_QUANTIZATION_LEVELS)
    ]

    best_product = -1.0
    best_allocation: list[float] | None = None
    any_feasible = False
    for q in grid:
        allocation = [q]
        product = compute_nash_product(scenario, allocation, weights=weights)
        if product > 0:
            any_feasible = True
        # Lexicographic tie-break: strict > picks the smaller q on ties
        # because we iterate ascending; documented in DEC-NASH-001.
        if product > best_product + TIE_BREAK_TOLERANCE:
            best_product = product
            best_allocation = allocation

    if not any_feasible or best_allocation is None:
        return WeightedNashSolution(
            allocation=[grid[0]],
            nash_product=0.0,
            feasible=False,
            reason=MechanismFailureReason.BATNA_FLOOR_UNREACHABLE,
        )

    return WeightedNashSolution(
        allocation=best_allocation,
        nash_product=best_product,
        feasible=True,
    )


# --- Algorithm wrappers (Algorithm protocol from base.py) ------------------


def _default_weights(scenario: Scenario) -> dict[str, float]:
    """Equal bargaining weights for every party. DEC-NASH-001 lets the
    caller override; the default is the symmetric Nash solution."""
    return {p.id: 1.0 for p in scenario.participants}


def _upper_bound(scenario: Scenario) -> float:
    product = scenario.products[0]
    cap = scenario.capacity.get(product.id, product.demand_mean * 2.0)
    return max(cap, product.demand_mean * 1.5)


def _failure_run(
    scenario: Scenario,
    *,
    name: str,
    information_mode: InformationMode,
    reason: MechanismFailureReason,
    note: str,
    runtime_ms: float,
    leakage_report: LeakageReport | None = None,
) -> AlgorithmRun:
    """Build an AlgorithmRun for a structured-failure case.

    Returns convergence=NO_DEAL with a zero allocation and a
    ``failure`` field set per DEC-NASH-001. The ledger is built on the
    zero allocation so downstream consumers do not see an empty
    ledger.
    """
    zero_quantities = {
        p.id: [0.0] * scenario.n_periods for p in scenario.participants
    }
    ledger = build_ledger(scenario, zero_quantities)
    iteration = IterationRecord(
        iteration=0,
        quantities=zero_quantities,
        consensus=[0.0] * scenario.n_periods,
        residual=0.0,
        price_signal=0.0,
    )
    return AlgorithmRun(
        scenario_id=scenario.id,
        algorithm=name,
        information_mode=information_mode,
        convergence=Convergence.NO_DEAL,
        iterations=[iteration],
        ledger=ledger,
        transfer=None,
        runtime_ms=runtime_ms,
        final_residual=0.0,
        leakage_report=leakage_report,
        failure=MechanismFailure(reason=reason, note=note),
    )


class WeightedNashPlaintext:
    """Plaintext weighted-Nash reference solver (DEC-NASH-001).

    The aggregator sees every party's utility function. Use this as
    the reference for golden-fixture parity tests and as the
    centralized-oracle-equivalent in mechanism comparisons.
    """

    name = "weighted_nash_plaintext"

    def __init__(self) -> None:
        pass

    def run(
        self,
        scenario: Scenario,
        *,
        information_mode: InformationMode = InformationMode.FULL_ORACLE,
        max_iter: int = 1,  # unused; plaintext is one-shot
        tolerance: float = PLAINTEXT_NUMERICAL_TOLERANCE,
    ) -> AlgorithmRun:
        started = time.perf_counter()

        if scenario.n_periods != 1:
            return _failure_run(
                scenario,
                name=self.name,
                information_mode=information_mode,
                reason=MechanismFailureReason.NO_FEASIBLE_ALLOCATION,
                note="weighted_nash v1 supports n_periods=1 only",
                runtime_ms=(time.perf_counter() - started) * 1000,
            )
        if len(scenario.participants) > 2:
            # N>2 lift is W4 (R-NASH-007).
            return _failure_run(
                scenario,
                name=self.name,
                information_mode=information_mode,
                reason=MechanismFailureReason.NO_FEASIBLE_ALLOCATION,
                note="weighted_nash v1 supports 2 participants only; N>=3 lands in W4",
                runtime_ms=(time.perf_counter() - started) * 1000,
            )

        weights = _default_weights(scenario)
        upper = _upper_bound(scenario)
        solution = plaintext_argmax(scenario, weights=weights, upper_bound=upper)

        runtime_ms = (time.perf_counter() - started) * 1000

        if not solution.feasible:
            return _failure_run(
                scenario,
                name=self.name,
                information_mode=information_mode,
                reason=solution.reason
                or MechanismFailureReason.NO_FEASIBLE_ALLOCATION,
                note="no allocation puts every party above their BATNA",
                runtime_ms=runtime_ms,
            )

        quantities = {p.id: list(solution.allocation) for p in scenario.participants}
        ledger = build_ledger(scenario, quantities)
        iteration = IterationRecord(
            iteration=0,
            quantities=quantities,
            consensus=list(solution.allocation),
            residual=0.0,
            price_signal=0.0,
        )
        return AlgorithmRun(
            scenario_id=scenario.id,
            algorithm=self.name,
            information_mode=information_mode,
            convergence=Convergence.CONVERGED,
            iterations=[iteration],
            ledger=ledger,
            transfer=None,
            runtime_ms=runtime_ms,
            final_residual=0.0,
        )


class WeightedNashBounded:
    """Weighted-Nash solver via the bounded-leakage protocol (DEC-NASH-002).

    When ``information_mode=PRIVATE``, parties exchange only ternary
    direction vectors and bounded step proposals; the aggregator never
    sees utility functions or values. Returns a LeakageReport with
    the run.

    For ``information_mode!=PRIVATE``, this algorithm falls back to
    plaintext behavior so the SDK can compare mechanisms in
    information-mode-aware tests without branching at the call site.
    """

    name = "weighted_nash_bounded"

    def __init__(self) -> None:
        self._plaintext = WeightedNashPlaintext()
        # Override the plaintext's name for the underlying run so the
        # SDK's per-mechanism comparison cleanly distinguishes them.
        self._plaintext.name = self.name

    def run(
        self,
        scenario: Scenario,
        *,
        information_mode: InformationMode = InformationMode.PRIVATE,
        max_iter: int = 50,
        tolerance: float = PROTOCOL_NUMERICAL_TOLERANCE,
    ) -> AlgorithmRun:
        started = time.perf_counter()

        if scenario.n_periods != 1:
            return _failure_run(
                scenario,
                name=self.name,
                information_mode=information_mode,
                reason=MechanismFailureReason.NO_FEASIBLE_ALLOCATION,
                note="weighted_nash_bounded v1 supports n_periods=1 only",
                runtime_ms=(time.perf_counter() - started) * 1000,
            )
        if len(scenario.participants) > 2:
            return _failure_run(
                scenario,
                name=self.name,
                information_mode=information_mode,
                reason=MechanismFailureReason.NO_FEASIBLE_ALLOCATION,
                note="weighted_nash_bounded v1 supports 2 participants only; N>=3 lands in W4",
                runtime_ms=(time.perf_counter() - started) * 1000,
            )

        if information_mode != InformationMode.PRIVATE:
            # Falling back to plaintext behavior; no leakage report.
            run = self._plaintext.run(
                scenario, information_mode=information_mode
            )
            return run

        weights = _default_weights(scenario)
        upper = _upper_bound(scenario)
        # Seed the protocol from a midpoint allocation to make the
        # first round's gradient sign meaningful.
        initial = [upper / 2.0]
        run_id = f"run-wnash-{uuid.uuid4().hex[:12]}"

        outcome: ProtocolOutcome = run_bounded_leakage_protocol(
            scenario,
            weights=weights,
            initial_allocation=initial,
            upper_bound=upper,
            run_id=run_id,
        )

        runtime_ms = (time.perf_counter() - started) * 1000

        # Build the run record around the protocol's final allocation.
        quantities = {
            p.id: list(outcome.final_allocation) for p in scenario.participants
        }
        ledger = build_ledger(scenario, quantities)

        # If the protocol produced an allocation but it puts any party
        # below their BATNA, report the structured failure even though
        # the protocol "converged" — the contract is "above BATNA or
        # MechanismFailure", per DEC-NASH-001.
        any_below_batna = any(
            ledger.local[p.id] < p.outside_option - 1e-6
            for p in scenario.participants
        )
        if any_below_batna:
            return _failure_run(
                scenario,
                name=self.name,
                information_mode=information_mode,
                reason=MechanismFailureReason.BATNA_FLOOR_UNREACHABLE,
                note=(
                    "bounded-leakage protocol converged but at least one "
                    "party falls below outside_option in the final allocation"
                ),
                runtime_ms=runtime_ms,
                leakage_report=outcome.leakage_report,
            )

        iteration = IterationRecord(
            iteration=outcome.rounds_used,
            quantities=quantities,
            consensus=list(outcome.final_allocation),
            residual=outcome.final_residual,
            price_signal=0.0,
        )
        return AlgorithmRun(
            scenario_id=scenario.id,
            algorithm=self.name,
            information_mode=information_mode,
            convergence=(
                Convergence.CONVERGED
                if outcome.converged
                else Convergence.NOT_CONVERGED
            ),
            iterations=[iteration],
            ledger=ledger,
            transfer=None,
            runtime_ms=runtime_ms,
            final_residual=outcome.final_residual,
            leakage_report=outcome.leakage_report,
        )


__all__ = [
    "NASH_QUANTIZATION_LEVELS",
    "PLAINTEXT_NUMERICAL_TOLERANCE",
    "PROTOCOL_NUMERICAL_TOLERANCE",
    "PROTOCOL_VERSION",
    "WeightedNashPlaintext",
    "WeightedNashBounded",
    "WeightedNashSolution",
    "compute_nash_product",
    "plaintext_argmax",
]
