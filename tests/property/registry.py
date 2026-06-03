"""Mechanism registry for the property battery.

Lists every mechanism the engine ships and the invariants each one
claims. Property tests iterate this registry, so adding a new
mechanism extends coverage without editing every property file.

Per DEC-PROP-001, each entry carries:
- name: identifier matching the SDK mechanism selector
- factory: a zero-arg callable that returns an Algorithm instance
- claims: the set of property labels this mechanism claims to satisfy
- lipschitz: numerical-stability constant (None or "empirical_only" for
  mechanisms without a closed-form bound)
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from procurement_lab.algorithms.admm import ADMM
from procurement_lab.algorithms.base import Algorithm
from procurement_lab.algorithms.oracle import CentralizedOracle
from procurement_lab.algorithms.simple import (
    AlternatingBestResponse,
    ConsensusAveraging,
    PriceOnlyDual,
)


@dataclass(frozen=True)
class MechanismEntry:
    name: str
    factory: Callable[[], Algorithm]
    claims: frozenset[str]
    lipschitz: float | None  # None == claim does not apply; numeric == bound


# Property labels the registry uses. Property test files import these
# constants and assert against entries that include the matching label
# in `claims`.
PROP_INDIVIDUAL_RATIONALITY = "individual_rationality"
PROP_DETERMINISM = "determinism"
PROP_MONOTONICITY = "monotonicity"
PROP_BUDGET_BALANCE = "budget_balance"
PROP_LEAKAGE_BOUND = "leakage_bound"
PROP_PARETO = "pareto"
PROP_INFEASIBILITY = "infeasibility"
PROP_NUMERICAL_STABILITY = "numerical_stability"
PROP_TS_PARITY = "ts_parity"


MECHANISMS: list[MechanismEntry] = [
    MechanismEntry(
        name="centralized_oracle",
        factory=CentralizedOracle,
        claims=frozenset({
            PROP_INDIVIDUAL_RATIONALITY,
            PROP_DETERMINISM,
            PROP_PARETO,
            PROP_INFEASIBILITY,
            PROP_NUMERICAL_STABILITY,
        }),
        lipschitz=1.0,
    ),
    MechanismEntry(
        name="admm",
        factory=ADMM,
        claims=frozenset({
            PROP_INDIVIDUAL_RATIONALITY,
            PROP_DETERMINISM,
            PROP_INFEASIBILITY,
        }),
        lipschitz=None,  # "empirical_only" per DEC-PROP-001
    ),
    MechanismEntry(
        name="alternating_best_response",
        factory=AlternatingBestResponse,
        claims=frozenset({
            PROP_INDIVIDUAL_RATIONALITY,
            PROP_DETERMINISM,
            PROP_INFEASIBILITY,
        }),
        lipschitz=None,  # "empirical_only"
    ),
    MechanismEntry(
        name="consensus_averaging",
        factory=ConsensusAveraging,
        claims=frozenset({
            PROP_INDIVIDUAL_RATIONALITY,
            PROP_DETERMINISM,
            PROP_INFEASIBILITY,
            PROP_NUMERICAL_STABILITY,
        }),
        lipschitz=1.0,
    ),
    MechanismEntry(
        name="price_only_dual",
        factory=PriceOnlyDual,
        claims=frozenset({
            PROP_INDIVIDUAL_RATIONALITY,
            PROP_DETERMINISM,
            PROP_INFEASIBILITY,
            PROP_NUMERICAL_STABILITY,
        }),
        lipschitz=1.5,
    ),
    # Future mechanisms (spec 0015 W2 + W5) register here:
    # MechanismEntry(name="weighted_nash_bounded", factory=WeightedNashBounded,
    #                claims=frozenset({...PROP_MONOTONICITY, PROP_LEAKAGE_BOUND...}),
    #                lipschitz=2.0),
    # MechanismEntry(name="weighted_nash_mpc", factory=WeightedNashMPC,
    #                claims=frozenset({...PROP_LEAKAGE_BOUND...}),
    #                lipschitz=1.0),
]


def mechanisms_claiming(prop: str) -> list[MechanismEntry]:
    """Return mechanism entries whose `claims` include the given property."""
    return [m for m in MECHANISMS if prop in m.claims]
