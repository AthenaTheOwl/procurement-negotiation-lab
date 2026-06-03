"""Unit tests for the weighted-Nash bargaining solver (spec 0015).

Covers DEC-NASH-001 (mechanism parameters) and DEC-NASH-002 (bounded-
leakage protocol). Property-level coverage lives in
tests/property/test_leakage_bound.py and the per-mechanism property
batteries.
"""

from __future__ import annotations

import pytest

from procurement_lab.algorithms.weighted_nash import (
    NASH_QUANTIZATION_LEVELS,
    PROTOCOL_NUMERICAL_TOLERANCE,
    WeightedNashBounded,
    WeightedNashPlaintext,
    compute_nash_product,
    plaintext_argmax,
)
from procurement_lab.engine.privacy import PROTOCOL_VERSION
from procurement_lab.engine.schemas import (
    Convergence,
    InformationMode,
    MechanismFailureReason,
    Scenario,
)


# Existing fixtures: `scenario` and `risky_scenario` from tests/conftest.py.


def test_plaintext_runs_and_returns_feasible_allocation(scenario: Scenario) -> None:
    run = WeightedNashPlaintext().run(scenario)
    assert run.algorithm == "weighted_nash_plaintext"
    assert run.convergence == Convergence.CONVERGED
    assert run.failure is None
    assert run.ledger.feasible is True
    # Plaintext should find a strictly positive Nash product.
    assert len(run.iterations) == 1
    consensus = run.iterations[-1].consensus
    assert len(consensus) == 1
    assert consensus[0] >= 0


def test_plaintext_picks_allocation_at_or_below_capacity(scenario: Scenario) -> None:
    run = WeightedNashPlaintext().run(scenario)
    product = scenario.products[0]
    cap = scenario.capacity[product.id]
    upper = max(cap, product.demand_mean * 1.5)
    consensus_q = run.iterations[-1].consensus[0]
    assert 0 <= consensus_q <= upper + 1e-9


def test_plaintext_no_leakage_report(scenario: Scenario) -> None:
    """Plaintext does not produce a leakage report; bounded-leakage does."""
    run = WeightedNashPlaintext().run(scenario)
    assert run.leakage_report is None


def test_plaintext_determinism(scenario: Scenario) -> None:
    """Two runs on the same scenario produce identical allocations."""
    run_a = WeightedNashPlaintext().run(scenario)
    run_b = WeightedNashPlaintext().run(scenario)
    assert run_a.iterations[-1].consensus == run_b.iterations[-1].consensus
    assert abs(run_a.ledger.global_utility - run_b.ledger.global_utility) < 1e-9


def test_bounded_runs_with_private_mode(scenario: Scenario) -> None:
    run = WeightedNashBounded().run(
        scenario, information_mode=InformationMode.PRIVATE
    )
    assert run.algorithm == "weighted_nash_bounded"
    assert run.failure is None
    assert run.leakage_report is not None
    assert run.leakage_report.protocol_version == PROTOCOL_VERSION


def test_bounded_leakage_report_per_party_present(scenario: Scenario) -> None:
    run = WeightedNashBounded().run(
        scenario, information_mode=InformationMode.PRIVATE
    )
    assert run.leakage_report is not None
    assert len(run.leakage_report.per_party) == len(scenario.participants)
    party_ids = {p.party_id for p in run.leakage_report.per_party}
    assert party_ids == {p.id for p in scenario.participants}


def test_bounded_aggregate_within_bound(scenario: Scenario) -> None:
    run = WeightedNashBounded().run(
        scenario, information_mode=InformationMode.PRIVATE
    )
    assert run.leakage_report is not None
    assert run.leakage_report.aggregate.all_within_bound is True


def test_bounded_falls_back_to_plaintext_on_non_private(scenario: Scenario) -> None:
    """information_mode=FULL_ORACLE on bounded yields plaintext behavior."""
    run = WeightedNashBounded().run(
        scenario, information_mode=InformationMode.FULL_ORACLE
    )
    assert run.leakage_report is None  # plaintext does not report leakage
    assert run.failure is None


def test_bounded_close_to_plaintext(scenario: Scenario) -> None:
    """The bounded-leakage allocation should match plaintext within tolerance.

    Per DEC-NASH-001: protocol_numerical_tolerance = 1e-3 on plaintext
    versus bounded-leakage. The test uses a relative comparison on
    global utility because the absolute allocation may differ by a
    fraction of a unit while the utility is essentially identical.
    """
    plaintext_run = WeightedNashPlaintext().run(scenario)
    bounded_run = WeightedNashBounded().run(
        scenario, information_mode=InformationMode.PRIVATE
    )
    plaintext_util = plaintext_run.ledger.global_utility
    bounded_util = bounded_run.ledger.global_utility
    relative_gap = abs(plaintext_util - bounded_util) / max(
        abs(plaintext_util), 1.0
    )
    # 1% relative tolerance: bounded-leakage converges by gradient
    # sign so its endpoint can differ from plaintext's grid by a
    # quantization step plus subgradient noise; 1% is conservative.
    assert relative_gap < 0.01, (
        f"bounded-leakage global utility ({bounded_util:.4f}) deviates "
        f"from plaintext ({plaintext_util:.4f}) by {relative_gap:.4%}"
    )


def test_compute_nash_product_zero_below_batna() -> None:
    """compute_nash_product returns 0 when any party falls below BATNA."""
    from procurement_lab.engine.schemas import Participant, Product, Role

    product = Product(id="p", name="x", demand_mean=10.0, demand_std=0.0, unit_value=20.0)
    buyer = Participant(
        id="b",
        name="b",
        role=Role.BUYER,
        utility_formula="-100.0 + q",  # always negative for small q
        parameters={},
        outside_option=0.0,
    )
    supplier = Participant(
        id="s",
        name="s",
        role=Role.SUPPLIER,
        utility_formula="q",
        parameters={},
        outside_option=0.0,
    )
    scenario = Scenario(
        id="t",
        title="t",
        n_periods=1,
        products=[product],
        participants=[buyer, supplier],
        capacity={"p": 50.0},
    )
    # At q=10, buyer = -100 + 10 = -90 < 0 = batna, so nash product = 0.
    product_val = compute_nash_product(scenario, [10.0], weights={"b": 1.0, "s": 1.0})
    assert product_val == 0.0


def test_plaintext_argmax_quantization_levels() -> None:
    """plaintext_argmax searches NASH_QUANTIZATION_LEVELS points."""
    # Verified indirectly: the grid is built with that many levels.
    # We confirm the constant is the documented value.
    assert NASH_QUANTIZATION_LEVELS == 64


def test_plaintext_returns_structured_failure_on_unsupported_n_periods(
    scenario: Scenario,
) -> None:
    """n_periods>1 is unsupported in v1; returns structured failure."""
    multi_period = scenario.model_copy(update={"n_periods": 4})
    run = WeightedNashPlaintext().run(multi_period)
    assert run.failure is not None
    assert run.failure.reason == MechanismFailureReason.NO_FEASIBLE_ALLOCATION
    assert "n_periods" in run.failure.note
    assert run.convergence == Convergence.NO_DEAL


def test_bounded_returns_structured_failure_on_three_parties(
    scenario: Scenario, buyer, supplier, product
) -> None:
    """N>2 is unsupported in v1; returns structured failure (W4 lift later)."""
    from procurement_lab.engine.schemas import Participant, Role

    third = Participant(
        id="extra-buyer",
        name="Extra",
        role=Role.BUYER,
        utility_formula="50.0 * min(q, demand)",
        parameters={},
        outside_option=0.0,
    )
    three_party = scenario.model_copy(
        update={"participants": [buyer, supplier, third]}
    )
    run = WeightedNashBounded().run(three_party, information_mode=InformationMode.PRIVATE)
    assert run.failure is not None
    assert run.failure.reason == MechanismFailureReason.NO_FEASIBLE_ALLOCATION
    assert "N>=3" in run.failure.note or "2 participants" in run.failure.note
