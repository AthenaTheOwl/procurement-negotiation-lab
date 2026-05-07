"""Run-state machine for the playable story."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from procurement_lab.algorithms.admm import ADMM
from procurement_lab.algorithms.oracle import CentralizedOracle
from procurement_lab.engine.cbt import compute_transfer
from procurement_lab.engine.schemas import InformationMode
from procurement_lab.engine.utility import build_ledger
from procurement_lab.narrative.coach import beat_coach_note
from procurement_lab.narrative.counterparty import (
    CounterpartyPersona,
    CounterpartyResponse,
    respond_to_decision,
)
from procurement_lab.narrative.endings import Ending, detect_ending
from procurement_lab.narrative.story import DecisionOption, StoryArc

COMMITMENT_MULTIPLIER: dict[str, float] = {
    "forecast": 0.95,
    "soft": 1.0,
    "firm": 1.04,
    "option": 0.98,
}


class BeatDecision(BaseModel):
    model_config = ConfigDict(frozen=True)

    beat_id: str
    option_id: str
    option_label: str


class BeatConsequence(BaseModel):
    model_config = ConfigDict(frozen=True)

    beat_id: str
    option_id: str
    option_label: str
    buyer_quantity: float
    supplier_quantity: float
    plan_quantity: float
    residual: float
    buyer_utility: float
    supplier_utility: float
    global_utility: float
    surplus: float
    gap_vs_oracle: float
    transfer_feasible: bool
    counterparty_response: CounterpartyResponse
    coach_note: str


class StoryRunState(BaseModel):
    model_config = ConfigDict(frozen=True)

    story_id: str
    beat_index: int = 0
    relationship_score: int = 0
    sla_risk: float = 0.0
    budget_pressure: float = 0.0
    privacy_exposure: float = 0.0
    decisions: list[BeatDecision] = Field(default_factory=list)
    consequences: list[BeatConsequence] = Field(default_factory=list)
    ending: Ending | None = None

    @property
    def complete(self) -> bool:
        return self.ending is not None


def initial_state(story: StoryArc) -> StoryRunState:
    return StoryRunState(story_id=story.id)


def advance_story(
    story: StoryArc,
    persona: CounterpartyPersona,
    state: StoryRunState,
    option_id: str,
) -> StoryRunState:
    if state.complete:
        return state
    beat = story.beat(state.beat_index)
    option = beat.option(option_id)
    consequence = evaluate_option(story, persona, state, option)
    next_index = state.beat_index + 1
    next_relationship = state.relationship_score + option.relationship_delta
    next_sla = max(0.0, state.sla_risk + option.sla_risk_delta)
    next_budget = max(0.0, state.budget_pressure + option.budget_pressure_delta)
    next_privacy = min(1.0, state.privacy_exposure + option.privacy_delta)
    decisions = [
        *state.decisions,
        BeatDecision(
            beat_id=beat.id,
            option_id=option.id,
            option_label=option.label,
        ),
    ]
    consequences = [*state.consequences, consequence]
    ending = None
    if next_index >= len(story.beats):
        ending = detect_ending(
            relationship_score=next_relationship,
            sla_risk=next_sla,
            final_surplus=consequence.surplus,
            final_gap_vs_oracle=consequence.gap_vs_oracle,
            transfer_feasible=consequence.transfer_feasible,
        )
        next_index = len(story.beats) - 1
    return StoryRunState(
        story_id=story.id,
        beat_index=next_index,
        relationship_score=next_relationship,
        sla_risk=next_sla,
        budget_pressure=next_budget,
        privacy_exposure=next_privacy,
        decisions=decisions,
        consequences=consequences,
        ending=ending,
    )


def evaluate_option(
    story: StoryArc,
    persona: CounterpartyPersona,
    state: StoryRunState,
    option: DecisionOption,
) -> BeatConsequence:
    scenario = story.scenario
    beat = story.beat(state.beat_index)
    product = scenario.products[0]
    buyer = next(p for p in scenario.participants if p.role.value == "buyer")
    supplier = next(p for p in scenario.participants if p.role.value == "supplier")
    buyer_quantity = product.demand_mean * option.quantity_multiplier
    admm_run = ADMM(grid_step=25.0).run(
        scenario,
        information_mode=option.information_mode,
        max_iter=80,
        tolerance=0.5,
    )
    supplier_quantity = admm_run.iterations[-1].quantities[supplier.id][0]
    plan_quantity = max(
        0.0,
        ((buyer_quantity + supplier_quantity) / 2.0)
        * COMMITMENT_MULTIPLIER[option.commitment_type],
    )
    quantities = {participant.id: [plan_quantity] for participant in scenario.participants}
    ledger = build_ledger(scenario, quantities)
    transfer = compute_transfer(ledger)
    oracle = CentralizedOracle(grid_step=25.0).run(
        scenario,
        information_mode=InformationMode.FULL_ORACLE,
    )
    residual = abs(buyer_quantity - supplier_quantity)
    gap_vs_oracle = oracle.ledger.global_utility - ledger.global_utility
    relationship_after = state.relationship_score + option.relationship_delta
    response = respond_to_decision(
        persona,
        beat,
        option,
        residual=residual,
        surplus=transfer.surplus,
        relationship_score=relationship_after,
    )
    coach_note = beat_coach_note(
        beat,
        option,
        residual=residual,
        gap_vs_oracle=gap_vs_oracle,
        surplus=transfer.surplus,
    )
    return BeatConsequence(
        beat_id=beat.id,
        option_id=option.id,
        option_label=option.label,
        buyer_quantity=buyer_quantity,
        supplier_quantity=supplier_quantity,
        plan_quantity=plan_quantity,
        residual=residual,
        buyer_utility=ledger.local[buyer.id],
        supplier_utility=ledger.local[supplier.id],
        global_utility=ledger.global_utility,
        surplus=transfer.surplus,
        gap_vs_oracle=gap_vs_oracle,
        transfer_feasible=transfer.feasible and all(transfer.no_worse_off.values()),
        counterparty_response=response,
        coach_note=coach_note,
    )
