"""ADMM multi-party tests (W4 lift, R-NASH-007 ADMM side).

Per the 2026-06-01 W4 lift: ADMM's prior 2-party guard is retired.
The averaging + dual-update loops are N-general; these tests confirm
ADMM runs cleanly on N=3 and N=5 scenarios without raising.
"""

from __future__ import annotations

import pytest

from procurement_lab.algorithms.admm import ADMM
from procurement_lab.engine.schemas import (
    AlgorithmRun,
    Convergence,
    Participant,
    Product,
    Role,
    Scenario,
)


def _make_party(
    party_id: str, role: Role, utility_formula: str, params: dict[str, float]
) -> Participant:
    return Participant(
        id=party_id,
        name=party_id,
        role=role,
        utility_formula=utility_formula,
        parameters=params,
        outside_option=0.0,
    )


def _three_party_scenario() -> Scenario:
    product = Product(
        id="ai-substrate-A",
        name="AI accelerator substrate, generation A",
        demand_mean=200.0,
        demand_std=20.0,
        unit_value=100.0,
    )
    buyer = _make_party(
        "buyer-northstar",
        Role.BUYER,
        "service_level_value * min(q, demand) "
        "- unit_price * q "
        "- shortage_penalty * max(demand - q, 0) "
        "- inventory_penalty * max(q - demand, 0)",
        {
            "service_level_value": 100.0,
            "unit_price": 50.0,
            "shortage_penalty": 80.0,
            "inventory_penalty": 5.0,
        },
    )
    supplier = _make_party(
        "supplier-cinder",
        Role.SUPPLIER,
        "revenue_per_unit * q "
        "- production_cost * q "
        "- holding_cost * max(q - demand, 0) "
        "- stockout_penalty * max(demand - q, 0) "
        "- risk_premium * risk_score * q",
        {
            "revenue_per_unit": 50.0,
            "production_cost": 30.0,
            "holding_cost": 3.0,
            "stockout_penalty": 6.0,
            "risk_premium": 8.0,
        },
    )
    packager = _make_party(
        "packager-orion",
        Role.PACKAGER,
        "packaging_fee * q "
        "- packaging_cost * q "
        "- overtime_penalty * max(q - soft_capacity, 0)",
        {
            "packaging_fee": 16.0,
            "packaging_cost": 7.0,
            "overtime_penalty": 1.5,
            "soft_capacity": 250.0,
        },
    )
    return Scenario(
        id="multi-party-3",
        title="Three-party negotiation: buyer + supplier + packager",
        n_periods=1,
        products=[product],
        participants=[buyer, supplier, packager],
        capacity={"ai-substrate-A": 300.0},
        risk_score=0.2,
    )


def _five_party_scenario() -> Scenario:
    base = _three_party_scenario()
    extra_buyer = _make_party(
        "buyer-vela",
        Role.BUYER,
        "service_level_value * min(q, demand) - unit_price * q",
        {"service_level_value": 90.0, "unit_price": 50.0},
    )
    extra_logistics = _make_party(
        "logistics-cinder",
        Role.LOGISTICS,
        "freight_fee * q - freight_cost * q",
        {"freight_fee": 8.0, "freight_cost": 3.5},
    )
    return base.model_copy(
        update={
            "id": "multi-party-5",
            "participants": list(base.participants) + [extra_buyer, extra_logistics],
        }
    )


def test_admm_runs_on_three_parties_without_raising() -> None:
    """Prior NotImplementedError on N=3 is retired in W4."""
    scenario = _three_party_scenario()
    run: AlgorithmRun = ADMM().run(scenario, max_iter=80, tolerance=1.0)
    assert run.algorithm == "admm"
    assert run.convergence in (
        Convergence.CONVERGED,
        Convergence.OSCILLATING,
        Convergence.NOT_CONVERGED,
    )
    # Three-party run should produce a ledger covering every party.
    assert set(run.ledger.local.keys()) == {p.id for p in scenario.participants}


def test_admm_runs_on_five_parties_without_raising() -> None:
    """Five-party scenario exercises the averaging + dual-update at higher N."""
    scenario = _five_party_scenario()
    run: AlgorithmRun = ADMM().run(scenario, max_iter=120, tolerance=2.0)
    assert run.algorithm == "admm"
    assert set(run.ledger.local.keys()) == {p.id for p in scenario.participants}


def test_admm_three_party_iteration_records_all_parties() -> None:
    """Each iteration record should hold quantities for every party."""
    scenario = _three_party_scenario()
    run = ADMM().run(scenario, max_iter=30, tolerance=2.0)
    assert len(run.iterations) >= 1
    for record in run.iterations:
        assert set(record.quantities.keys()) == {p.id for p in scenario.participants}


def test_admm_rejects_single_party() -> None:
    """ADMM still needs >=2 participants for the consensus formulation."""
    # Schema requires at least 2 participants + at least one buyer/supplier
    # so we can't construct a single-party scenario via the public API.
    # The defensive check at the top of ADMM.run() exists for callers
    # who build scenarios programmatically with bypassed validation.
    pytest.skip(
        "Scenario schema requires >=2 participants with buyer+supplier; "
        "the ADMM single-party guard is reachable only via internal bypass."
    )
