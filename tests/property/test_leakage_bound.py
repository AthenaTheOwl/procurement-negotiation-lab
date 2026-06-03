"""Property R-PROP-006: bounded-leakage protocol respects declared epsilon.

For mechanisms claiming the leakage-bound property (currently
``weighted_nash_bounded``; ``weighted_nash_mpc`` to follow in W5),
the per-run LeakageReport must satisfy
``epsilon_measured <= epsilon_bound`` for every party. The
``aggregate.all_within_bound`` flag must agree.

Per DEC-NASH-002: the bound is an information-theoretic upper bound
on bits of utility-function information the transcript reveals. The
v1 protocol uses the full information budget per message, so
``epsilon_measured == epsilon_bound`` exactly; future revisions may
lower the measurement while keeping the bound.
"""

from __future__ import annotations

import math

import pytest
from hypothesis import given, settings

from procurement_lab.engine.schemas import (
    AlgorithmRun,
    Convergence,
    InformationMode,
    Scenario,
)

from tests.property.conftest import scenario_strategy
from tests.property.registry import (
    PROP_LEAKAGE_BOUND,
    MechanismEntry,
    mechanisms_claiming,
)


@pytest.mark.parametrize(
    "entry",
    mechanisms_claiming(PROP_LEAKAGE_BOUND),
    ids=lambda e: e.name,
)
@given(scenario=scenario_strategy())
@settings(max_examples=15)
def test_leakage_measured_within_bound(
    entry: MechanismEntry, scenario: Scenario
) -> None:
    """Every party's epsilon_measured stays within the declared bound."""
    algorithm = entry.factory()
    run: AlgorithmRun = algorithm.run(
        scenario, information_mode=InformationMode.PRIVATE
    )

    # Even on a structured failure the protocol should attach a
    # leakage report if any rounds ran. If the run failed before any
    # protocol round (e.g., n_periods>1 short-circuit), there is no
    # report to assert; skip.
    if run.leakage_report is None:
        return

    report = run.leakage_report

    for party in report.per_party:
        assert party.epsilon_measured <= party.epsilon_bound + 1e-9, (
            f"mechanism {entry.name} party {party.party_id}: "
            f"epsilon_measured ({party.epsilon_measured:.4f}) exceeds "
            f"epsilon_bound ({party.epsilon_bound:.4f})"
        )

    assert report.aggregate.all_within_bound, (
        f"mechanism {entry.name} aggregate.all_within_bound=False but "
        f"per-party check should hold; bookkeeping inconsistent"
    )

    # Cross-check the v1 formula directly: each round transmits at most
    # n_coords * log2(3) + log2(STEP_QUANTIZATION_LEVELS) bits per party.
    n_coords = 1  # v1: n_periods=1 + 1 product
    from procurement_lab.engine.privacy import STEP_QUANTIZATION_LEVELS

    per_round_max_bits = (
        n_coords * math.log2(3) + math.log2(STEP_QUANTIZATION_LEVELS)
    )
    expected_bound = report.round_count * per_round_max_bits

    for party in report.per_party:
        assert abs(party.epsilon_bound - expected_bound) < 1e-6, (
            f"mechanism {entry.name} party {party.party_id}: "
            f"epsilon_bound ({party.epsilon_bound:.6f}) does not match "
            f"R * (N * log2(3) + log2(K)) = {expected_bound:.6f}"
        )


@pytest.mark.parametrize(
    "entry",
    mechanisms_claiming(PROP_LEAKAGE_BOUND),
    ids=lambda e: e.name,
)
@given(scenario=scenario_strategy())
@settings(max_examples=10)
def test_message_log_hash_present_and_well_formed(
    entry: MechanismEntry, scenario: Scenario
) -> None:
    """Every per-party LeakageReport entry carries a SHA-256 message log hash."""
    algorithm = entry.factory()
    run: AlgorithmRun = algorithm.run(
        scenario, information_mode=InformationMode.PRIVATE
    )
    if run.leakage_report is None:
        return

    for party in run.leakage_report.per_party:
        assert len(party.message_log_hash) == 64, (
            f"mechanism {entry.name} party {party.party_id}: "
            f"message_log_hash length {len(party.message_log_hash)} != 64"
        )
        assert all(c in "0123456789abcdef" for c in party.message_log_hash), (
            f"mechanism {entry.name} party {party.party_id}: "
            f"message_log_hash contains non-hex character"
        )
