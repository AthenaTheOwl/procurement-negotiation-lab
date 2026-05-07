"""Counterparty persona and response logic."""

from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict, Field

from procurement_lab.narrative.story import Beat, DecisionOption


class CounterpartyPersona(BaseModel):
    """Named supplier persona for the Play surface."""

    model_config = ConfigDict(frozen=True)

    id: str
    name: str
    role: str
    voice: str
    goals: list[str] = Field(default_factory=list)
    walkaway_relationship_threshold: int = -4
    response_templates: dict[str, str] = Field(default_factory=dict)


class CounterpartyResponse(BaseModel):
    """Narrative response shown after a decision."""

    model_config = ConfigDict(frozen=True)

    headline: str
    body: str
    stance: str


def load_counterparty(path: Path) -> CounterpartyPersona:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("counterparty file must contain a mapping")
    return CounterpartyPersona.model_validate(raw)


def respond_to_decision(
    persona: CounterpartyPersona,
    beat: Beat,
    option: DecisionOption,
    *,
    residual: float,
    surplus: float,
    relationship_score: int,
) -> CounterpartyResponse:
    """Produce a deterministic supplier response from model state."""

    if relationship_score <= persona.walkaway_relationship_threshold:
        stance = "walkaway_warning"
        headline = f"{persona.name} is close to walking away"
    elif surplus < 0:
        stance = "reject"
        headline = f"{persona.name} rejects the economics"
    elif residual > 120:
        stance = "far_apart"
        headline = f"{persona.name} says the plan is not credible yet"
    elif option.commitment_type == "firm" and residual <= 75:
        stance = "accept_with_conditions"
        headline = f"{persona.name} can work with this"
    else:
        stance = "counter"
        headline = f"{persona.name} counters"

    template = persona.response_templates.get(
        stance,
        "The supplier responds to the decision and updates its stance.",
    )
    body = template.format(
        beat_title=beat.title,
        option_label=option.label,
        residual=residual,
        surplus=surplus,
        relationship_score=relationship_score,
    )
    return CounterpartyResponse(headline=headline, body=body, stance=stance)
