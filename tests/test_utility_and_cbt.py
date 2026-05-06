"""Utility accounting + CBT tests."""

from __future__ import annotations

import pytest

from procurement_lab.engine.cbt import compute_transfer
from procurement_lab.engine.schemas import Scenario, UtilityLedger
from procurement_lab.engine.utility import build_ledger


def test_ledger_global_matches_local_sum(scenario: Scenario) -> None:
    quantities = {p.id: [400.0] for p in scenario.participants}
    ledger = build_ledger(scenario, quantities)
    assert ledger.global_utility == pytest.approx(sum(ledger.local.values()))


def test_ledger_capacity_violation_marked_infeasible(scenario: Scenario) -> None:
    # capacity is 800; ask for 900 — supplier-side infeasible
    quantities = {p.id: [900.0] for p in scenario.participants}
    ledger = build_ledger(scenario, quantities)
    assert ledger.feasible is False


def test_ledger_at_capacity_is_feasible(scenario: Scenario) -> None:
    quantities = {p.id: [800.0] for p in scenario.participants}
    ledger = build_ledger(scenario, quantities)
    assert ledger.feasible is True


def test_cbt_proportional_split_no_worse_off() -> None:
    ledger = UtilityLedger(
        local={"buyer": 100.0, "supplier": 50.0},
        outside_options={"buyer": 0.0, "supplier": 0.0},
        global_utility=150.0,
        feasible=True,
    )
    plan = compute_transfer(ledger, rule="proportional")
    assert plan.feasible is True
    assert all(plan.no_worse_off.values())
    assert plan.surplus == pytest.approx(150.0)


def test_cbt_negative_surplus_is_infeasible() -> None:
    ledger = UtilityLedger(
        local={"a": -10.0, "b": -5.0},
        outside_options={"a": 0.0, "b": 0.0},
        global_utility=-15.0,
        feasible=True,
    )
    plan = compute_transfer(ledger, rule="proportional")
    assert plan.feasible is False
    assert "negative" in plan.note


def test_cbt_equal_split() -> None:
    ledger = UtilityLedger(
        local={"a": 100.0, "b": 100.0},
        outside_options={"a": 50.0, "b": 50.0},
        global_utility=200.0,
        feasible=True,
    )
    plan = compute_transfer(ledger, rule="equal")
    # surplus = 200 - (50 + 50) = 100; split equal = 50 each
    assert plan.surplus == pytest.approx(100.0)
    assert plan.transfers["a"] == pytest.approx(50.0)
    assert plan.transfers["b"] == pytest.approx(50.0)


def test_cbt_unknown_rule_raises() -> None:
    ledger = UtilityLedger(
        local={"a": 1.0},
        outside_options={"a": 0.0},
        global_utility=1.0,
        feasible=True,
    )
    with pytest.raises(ValueError, match="unknown rule"):
        compute_transfer(ledger, rule="bogus")
