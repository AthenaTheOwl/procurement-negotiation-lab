"""Cost-benefit transfer / surplus allocation logic."""

from __future__ import annotations

from procurement_lab.trace_schema import TransferPlan, UtilityLedger


def compute_transfer(ledger: UtilityLedger, buyer_share: float = 0.5) -> TransferPlan:
    """Split coordination surplus while preserving no-worse-off when possible.

    Positive buyer_transfer means supplier pays buyer. Negative means buyer pays supplier.
    Transfers sum to zero.
    """

    buyer_share = min(max(buyer_share, 0.0), 1.0)
    outside_total = ledger.buyer_outside_option + ledger.supplier_outside_option
    surplus = ledger.global_utility - outside_total
    if surplus < 0:
        return TransferPlan(
            surplus=surplus,
            buyer_transfer=0.0,
            supplier_transfer=0.0,
            buyer_after_transfer=ledger.buyer_utility,
            supplier_after_transfer=ledger.supplier_utility,
            buyer_no_worse_off=ledger.buyer_utility >= ledger.buyer_outside_option,
            supplier_no_worse_off=ledger.supplier_utility >= ledger.supplier_outside_option,
            feasible=False,
            note="global surplus is negative; transfers cannot make every party whole",
        )

    buyer_target = ledger.buyer_outside_option + surplus * buyer_share
    supplier_target = ledger.supplier_outside_option + surplus * (1.0 - buyer_share)
    buyer_transfer = buyer_target - ledger.buyer_utility
    supplier_transfer = supplier_target - ledger.supplier_utility
    buyer_after = ledger.buyer_utility + buyer_transfer
    supplier_after = ledger.supplier_utility + supplier_transfer
    return TransferPlan(
        surplus=surplus,
        buyer_transfer=buyer_transfer,
        supplier_transfer=supplier_transfer,
        buyer_after_transfer=buyer_after,
        supplier_after_transfer=supplier_after,
        buyer_no_worse_off=buyer_after >= ledger.buyer_outside_option - 1e-6,
        supplier_no_worse_off=supplier_after >= ledger.supplier_outside_option - 1e-6,
        feasible=abs(buyer_transfer + supplier_transfer) <= 1e-6,
        note="surplus split after the operational plan; plan first, transfer second",
    )
