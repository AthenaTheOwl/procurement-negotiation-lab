"""Schema validation tests."""

from __future__ import annotations

import pytest

from procurement_lab.engine.schemas import (
    Participant,
    Product,
    Role,
    Scenario,
    UtilityLedger,
)


def test_participant_requires_formula() -> None:
    with pytest.raises(ValueError):
        Participant(
            id="x",
            name="X",
            role=Role.BUYER,
            utility_formula="",  # empty
        )


def test_scenario_requires_buyer_and_supplier(product: Product) -> None:
    only_buyers = [
        Participant(id="b1", name="B1", role=Role.BUYER, utility_formula="q"),
        Participant(id="b2", name="B2", role=Role.BUYER, utility_formula="q"),
    ]
    with pytest.raises(ValueError, match="supplier"):
        Scenario(
            id="bad",
            title="bad",
            products=[product],
            participants=only_buyers,
        )


def test_scenario_rejects_duplicate_participant_ids(
    buyer: Participant, supplier: Participant, product: Product
) -> None:
    dup = supplier.model_copy(update={"id": buyer.id})
    with pytest.raises(ValueError, match="unique"):
        Scenario(
            id="dup",
            title="dup",
            products=[product],
            participants=[buyer, dup],
        )


def test_utility_ledger_validates_global_sum() -> None:
    with pytest.raises(ValueError, match="!="):
        UtilityLedger(
            local={"a": 1.0, "b": 2.0},
            outside_options={"a": 0.0, "b": 0.0},
            global_utility=999.0,  # wrong
            feasible=True,
        )


def test_scenario_lookup(scenario: Scenario) -> None:
    p = scenario.participant("buyer-northstar")
    assert p.role == Role.BUYER
    with pytest.raises(KeyError):
        scenario.participant("nonexistent")
