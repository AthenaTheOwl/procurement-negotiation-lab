"""procurement-negotiation-lab — a Beer Game for long-lead procurement.

Layered architecture:

    engine/        scenario, formula, utility, cbt, information schemas + math
    algorithms/    coordination algorithms (oracle, ADMM, alternating, ...)
    narrative/     story arcs, counterparty personas, coach (Phase 2)
    views/         Streamlit UI surfaces (Phase 3+)
"""

__version__ = "0.2.0"  # 0.2.x = post-redesign rewrite
