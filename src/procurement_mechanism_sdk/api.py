"""Public SDK helpers that wrap the deterministic procurement lab engine."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal, Protocol

from procurement_lab.algorithms.admm import ADMM
from procurement_lab.algorithms.oracle import CentralizedOracle
from procurement_lab.algorithms.simple import (
    AlternatingBestResponse,
    ConsensusAveraging,
    PriceOnlyDual,
)
from procurement_lab.algorithms.weighted_nash import (
    WeightedNashBounded,
    WeightedNashPlaintext,
)
from procurement_lab.engine.cbt import compute_transfer
from procurement_lab.engine.schemas import (
    AlgorithmRun,
    InformationMode,
    Participant,
    Product,
    Role,
    Scenario,
    TransferPlan,
)

ScenarioKind = Literal["base", "risky", "multi_party"]
MechanismName = Literal[
    "centralized_oracle",
    "admm",
    "alternating_best_response",
    "price_only_dual",
    "consensus_averaging",
    "weighted_nash_plaintext",
    "weighted_nash_bounded",
]

DEFAULT_MECHANISMS: tuple[MechanismName, ...] = (
    "centralized_oracle",
    "admm",
    "alternating_best_response",
    "price_only_dual",
    "consensus_averaging",
    "weighted_nash_plaintext",
    "weighted_nash_bounded",
)


class _AlgorithmRunner(Protocol):
    def run(
        self,
        scenario: Scenario,
        *,
        information_mode: InformationMode = InformationMode.FULL_ORACLE,
        max_iter: int = 50,
        tolerance: float = 0.01,
    ) -> AlgorithmRun:
        """Run a deterministic mechanism."""


@dataclass(frozen=True)
class MechanismComparison:
    """Result of comparing mechanisms against the centralized oracle."""

    scenario: Scenario
    oracle_run: AlgorithmRun
    runs: tuple[AlgorithmRun, ...]
    best_non_oracle: AlgorithmRun | None

    @property
    def by_mechanism(self) -> dict[str, AlgorithmRun]:
        """Return runs keyed by their engine mechanism names."""

        return {run.algorithm: run for run in self.runs}


@dataclass(frozen=True)
class ParticipationReport:
    """No-worse-off transfer report plus an optional oracle-gap metric."""

    mechanism: str
    global_utility: float
    oracle_global_utility: float | None
    oracle_gap: float | None
    transfer: TransferPlan
    no_worse_off: dict[str, bool]
    feasible: bool


def build_procurement_scenario(
    *,
    scenario_id: str = "sdk-substrate-crunch",
    title: str = "SDK substrate crunch",
    demand_mean: float = 500.0,
    demand_std: float = 80.0,
    capacity: float = 800.0,
    risk_score: float = 0.0,
    evidence_ids: Sequence[str] = (),
    extra_participants: Sequence[Participant] = (),
) -> Scenario:
    """Build a deterministic procurement scenario.

    The formulas and parameters mirror the Python reference engine tests so
    SDK consumers get the same behavior as the lab's deterministic primitives.
    Extra participants are appended after the canonical buyer and supplier.
    """

    product = Product(
        id="ai-substrate-A",
        name="AI accelerator substrate, generation A",
        demand_mean=demand_mean,
        demand_std=demand_std,
        unit_value=100.0,
    )
    buyer = Participant(
        id="buyer-northstar",
        name="Northstar Substrates",
        role=Role.BUYER,
        utility_formula=(
            "service_level_value * min(q, demand) "
            "- unit_price * q "
            "- shortage_penalty * max(demand - q, 0) "
            "- inventory_penalty * max(q - demand, 0)"
        ),
        parameters={
            "service_level_value": 100.0,
            "unit_price": 50.0,
            "shortage_penalty": 80.0,
            "inventory_penalty": 5.0,
        },
        outside_option=0.0,
    )
    supplier = Participant(
        id="supplier-cinder",
        name="Cinder Lithography Services",
        role=Role.SUPPLIER,
        utility_formula=(
            "revenue_per_unit * q "
            "- production_cost * q "
            "- holding_cost * max(q - demand, 0) "
            "- stockout_penalty * max(demand - q, 0) "
            "- risk_premium * risk_score * q"
        ),
        parameters={
            "revenue_per_unit": 50.0,
            "production_cost": 30.0,
            "holding_cost": 3.0,
            "stockout_penalty": 6.0,
            "risk_premium": 8.0,
        },
        outside_option=0.0,
    )
    participants = [buyer, supplier, *extra_participants]
    return Scenario(
        id=scenario_id,
        title=title,
        n_periods=1,
        products=[product],
        participants=participants,
        capacity={product.id: capacity},
        risk_score=risk_score,
        evidence_ids=list(evidence_ids),
    )


def sample_scenario(kind: ScenarioKind = "base") -> Scenario:
    """Return a stable sample scenario for SDK demos and tests."""

    if kind == "base":
        return build_procurement_scenario()
    if kind == "risky":
        return build_procurement_scenario(
            scenario_id="sdk-substrate-crunch-risky",
            title="SDK substrate crunch with supplier risk",
            risk_score=0.7,
            evidence_ids=("nvda-10k-customer-concentration", "tsm-10k-cowos-capacity"),
        )
    if kind == "multi_party":
        return build_procurement_scenario(
            scenario_id="sdk-substrate-crunch-multi-party",
            title="SDK substrate crunch with buyer, supplier, and packager",
            evidence_ids=(
                "nvda-10k-customer-concentration",
                "tsm-10k-cowos-capacity",
                "ase-packaging-capacity-note",
            ),
            extra_participants=(
                Participant(
                    id="packager-orion",
                    name="Orion Advanced Packaging",
                    role=Role.PACKAGER,
                    utility_formula=(
                        "packaging_fee * q "
                        "- packaging_cost * q "
                        "- overtime_penalty * max(q - soft_capacity, 0) "
                        "- risk_premium * risk_score * q"
                    ),
                    parameters={
                        "packaging_fee": 16.0,
                        "packaging_cost": 7.0,
                        "overtime_penalty": 1.5,
                        "soft_capacity": 520.0,
                        "risk_premium": 2.0,
                    },
                    outside_option=0.0,
                ),
            ),
        )
    raise ValueError(f"unknown sample scenario kind: {kind!r}")


def solve_allocation(
    scenario: Scenario,
    *,
    mechanism: MechanismName = "admm",
    information_mode: InformationMode | None = None,
    max_iter: int = 50,
    tolerance: float = 0.01,
) -> AlgorithmRun:
    """Run one existing deterministic mechanism on a scenario."""

    effective_mode = _default_information_mode(mechanism, information_mode)
    return _algorithm_for(mechanism).run(
        scenario,
        information_mode=effective_mode,
        max_iter=max_iter,
        tolerance=tolerance,
    )


def compare_mechanisms(
    scenario: Scenario,
    *,
    mechanisms: Sequence[MechanismName] | None = None,
    information_mode: InformationMode | None = None,
    max_iter: int = 50,
    tolerance: float = 0.01,
    transfer_rule: str = "proportional",
) -> MechanismComparison:
    """Run mechanisms and attach oracle-gap plus CBT participation data."""

    selected_mechanisms = (
        tuple(mechanisms)
        if mechanisms is not None
        else _default_mechanisms_for(scenario)
    )
    oracle_run = CentralizedOracle().run(
        scenario,
        information_mode=InformationMode.FULL_ORACLE,
    )
    runs: list[AlgorithmRun] = []
    for mechanism in selected_mechanisms:
        if mechanism == "centralized_oracle":
            run = oracle_run.model_copy(update={"utility_gap_vs_oracle": 0.0})
        else:
            run = solve_allocation(
                scenario,
                mechanism=mechanism,
                information_mode=information_mode,
                max_iter=max_iter,
                tolerance=tolerance,
            )
            run = _with_gap_and_transfer(run, oracle_run, transfer_rule=transfer_rule)
        runs.append(run)

    candidates = [run for run in runs if run.algorithm != "centralized_oracle"]
    best_non_oracle = min(
        candidates,
        key=lambda run: run.utility_gap_vs_oracle
        if run.utility_gap_vs_oracle is not None
        else float("inf"),
        default=None,
    )
    return MechanismComparison(
        scenario=scenario,
        oracle_run=oracle_run,
        runs=tuple(runs),
        best_non_oracle=best_non_oracle,
    )


def compute_participation_report(
    run: AlgorithmRun,
    *,
    oracle_run: AlgorithmRun | None = None,
    transfer_rule: str = "proportional",
) -> ParticipationReport:
    """Compute no-worse-off transfer status and optional oracle gap."""

    transfer = run.transfer or compute_transfer(run.ledger, rule=transfer_rule)
    oracle_utility = oracle_run.ledger.global_utility if oracle_run is not None else None
    oracle_gap = (
        None
        if oracle_utility is None
        else oracle_utility - run.ledger.global_utility
    )
    return ParticipationReport(
        mechanism=run.algorithm,
        global_utility=run.ledger.global_utility,
        oracle_global_utility=oracle_utility,
        oracle_gap=oracle_gap,
        transfer=transfer,
        no_worse_off=dict(transfer.no_worse_off),
        feasible=transfer.feasible,
    )


def _with_gap_and_transfer(
    run: AlgorithmRun,
    oracle_run: AlgorithmRun,
    *,
    transfer_rule: str,
) -> AlgorithmRun:
    gap = oracle_run.ledger.global_utility - run.ledger.global_utility
    transfer = compute_transfer(run.ledger, rule=transfer_rule)
    return run.model_copy(
        update={
            "transfer": transfer,
            "utility_gap_vs_oracle": gap,
        }
    )


def _algorithm_for(mechanism: MechanismName) -> _AlgorithmRunner:
    if mechanism == "centralized_oracle":
        return CentralizedOracle()
    if mechanism == "admm":
        return ADMM()
    if mechanism == "alternating_best_response":
        return AlternatingBestResponse()
    if mechanism == "price_only_dual":
        return PriceOnlyDual()
    if mechanism == "consensus_averaging":
        return ConsensusAveraging()
    if mechanism == "weighted_nash_plaintext":
        return WeightedNashPlaintext()
    if mechanism == "weighted_nash_bounded":
        return WeightedNashBounded()
    raise ValueError(f"unknown mechanism: {mechanism!r}")


def _default_information_mode(
    mechanism: MechanismName,
    requested: InformationMode | None,
) -> InformationMode:
    if requested is not None:
        return requested
    if mechanism == "weighted_nash_bounded":
        return InformationMode.PRIVATE
    return InformationMode.FULL_ORACLE


def _default_mechanisms_for(scenario: Scenario) -> tuple[MechanismName, ...]:
    if len(scenario.participants) > 2:
        return (
            "centralized_oracle",
            "weighted_nash_plaintext",
            "weighted_nash_bounded",
        )
    return DEFAULT_MECHANISMS
