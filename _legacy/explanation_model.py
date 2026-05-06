"""Human-readable explanations derived from trace fields."""

from __future__ import annotations

from procurement_lab.trace_schema import CoordinationTrace


def explain_trace(trace: CoordinationTrace) -> str:
    final = trace.iterations[-1]
    return (
        f"{trace.algorithm} ended at {final.consensus_quantity:.1f} units after "
        f"{trace.metrics.iterations} iterations. residual={trace.metrics.residual:.2f}, "
        f"global utility=${trace.ledger.global_utility:,.0f}, "
        f"gap vs oracle=${trace.metrics.utility_gap_vs_oracle:,.0f}."
    )


def explain_transfer(trace: CoordinationTrace) -> str:
    transfer = trace.transfer
    status = "both sides are no worse off" if transfer.feasible else "no feasible split"
    return (
        f"surplus=${transfer.surplus:,.0f}. buyer transfer=${transfer.buyer_transfer:,.0f}, "
        f"supplier transfer=${transfer.supplier_transfer:,.0f}; {status}."
    )
