from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from procurement_lab.cbt import compute_transfer
from procurement_lab.scenario_loader import ScenarioSpec
from procurement_lab.utility_accounting import ledger_for_quantity


def test_ledger_reconciles_components(scenario: ScenarioSpec) -> None:
    ledger = ledger_for_quantity(scenario, quantity=80)
    assert ledger.global_utility == ledger.buyer_utility + ledger.supplier_utility


def test_transfer_conserves_money_when_feasible(scenario: ScenarioSpec) -> None:
    ledger = ledger_for_quantity(scenario, quantity=80)
    transfer = compute_transfer(ledger)
    assert abs(transfer.buyer_transfer + transfer.supplier_transfer) < 1e-6


@given(quantity=st.floats(min_value=0, max_value=140, allow_nan=False, allow_infinity=False))
def test_transfer_no_worse_flags_match_ledger(scenario: ScenarioSpec, quantity: float) -> None:
    ledger = ledger_for_quantity(scenario, quantity=quantity)
    transfer = compute_transfer(ledger)
    assert transfer.buyer_no_worse_off == (
        transfer.buyer_after_transfer >= ledger.buyer_outside_option - 1e-6
    )
    assert transfer.supplier_no_worse_off == (
        transfer.supplier_after_transfer >= ledger.supplier_outside_option - 1e-6
    )
