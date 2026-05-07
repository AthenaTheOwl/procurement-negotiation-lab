"""Ending detection for the Substrate Crunch story."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class Ending(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    title: str
    summary: str
    lesson: str


CONVERGENT_SETTLEMENT = Ending(
    id="convergent_settlement",
    title="convergent settlement",
    summary=(
        "Northstar and Cinder lock a quantity, split the surplus, and keep "
        "the launch covered."
    ),
    lesson="The better plan came from enough information, not perfect information.",
)

ONE_SIDED_SETTLEMENT = Ending(
    id="one_sided_settlement",
    title="convergent but one-sided",
    summary=(
        "A deal closes, but one side carries enough pain that the next "
        "negotiation gets harder."
    ),
    lesson="Global value is not enough. Participation constraints matter.",
)

WALKAWAY = Ending(
    id="walkaway",
    title="walk-away",
    summary=(
        "Cinder refuses the final terms. Northstar spot-buys late and misses "
        "the planning target."
    ),
    lesson="A hard line can be locally rational and still destroy the joint plan.",
)


def detect_ending(
    *,
    relationship_score: int,
    sla_risk: float,
    final_surplus: float,
    final_gap_vs_oracle: float,
    transfer_feasible: bool,
) -> Ending:
    if relationship_score <= -4 or sla_risk >= 3.5 or final_surplus < 0:
        return WALKAWAY
    if not transfer_feasible or relationship_score < 0 or final_gap_vs_oracle > 1200:
        return ONE_SIDED_SETTLEMENT
    return CONVERGENT_SETTLEMENT
