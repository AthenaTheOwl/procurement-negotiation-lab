"""Shared test fixtures."""

from __future__ import annotations

import pytest

from procurement_lab.engine.schemas import Participant, Product, Role, Scenario


@pytest.fixture
def buyer() -> Participant:
    return Participant(
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


@pytest.fixture
def supplier() -> Participant:
    return Participant(
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


@pytest.fixture
def product() -> Product:
    return Product(
        id="ai-substrate-A",
        name="AI accelerator substrate, generation A",
        demand_mean=500.0,
        demand_std=80.0,
        unit_value=100.0,
    )


@pytest.fixture
def scenario(buyer: Participant, supplier: Participant, product: Product) -> Scenario:
    return Scenario(
        id="substrate-crunch-base",
        title="The Substrate Crunch — base case",
        n_periods=1,
        products=[product],
        participants=[buyer, supplier],
        capacity={product.id: 800.0},
        risk_score=0.0,
        evidence_ids=[],
    )


@pytest.fixture
def risky_scenario(
    buyer: Participant, supplier: Participant, product: Product
) -> Scenario:
    return Scenario(
        id="substrate-crunch-risky",
        title="The Substrate Crunch — Taiwan packaging crisis",
        n_periods=1,
        products=[product],
        participants=[buyer, supplier],
        capacity={product.id: 800.0},
        risk_score=0.7,
        evidence_ids=["nvda-10k-customer-concentration", "tsm-10k-cowos-capacity"],
    )
