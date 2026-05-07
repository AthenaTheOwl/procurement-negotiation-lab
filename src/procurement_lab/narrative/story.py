"""Narrative story models and loaders."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, model_validator

from procurement_lab.engine.schemas import InformationMode, Scenario


class DecisionOption(BaseModel):
    """One playable decision in a beat."""

    model_config = ConfigDict(frozen=True)

    id: str = Field(min_length=1)
    label: str
    summary: str
    consequence_hint: str
    quantity_multiplier: float = Field(gt=0)
    information_mode: InformationMode
    commitment_type: Literal["forecast", "soft", "firm", "option"]
    relationship_delta: int = 0
    sla_risk_delta: float = 0.0
    budget_pressure_delta: float = 0.0
    privacy_delta: float = Field(default=0.0, ge=0.0, le=1.0)


class Beat(BaseModel):
    """One compressed time step in the learning simulation."""

    model_config = ConfigDict(frozen=True)

    id: str = Field(min_length=1)
    week: int = Field(ge=1)
    title: str
    situation: str
    buyer_prompt: str
    supplier_private_context: str
    learning_goal: str
    study_links: list[str] = Field(default_factory=list)
    options: list[DecisionOption] = Field(min_length=2, max_length=4)

    def option(self, option_id: str) -> DecisionOption:
        for option in self.options:
            if option.id == option_id:
                return option
        raise KeyError(f"no option {option_id!r} in beat {self.id!r}")


class StoryArc(BaseModel):
    """A complete playable procurement story."""

    model_config = ConfigDict(frozen=True)

    id: str = Field(min_length=1)
    title: str
    subtitle: str
    player_role: str
    setup: str
    scenario: Scenario
    beats: list[Beat] = Field(min_length=1)

    @model_validator(mode="after")
    def _beat_ids_are_unique_and_ordered(self) -> StoryArc:
        ids = [beat.id for beat in self.beats]
        if len(ids) != len(set(ids)):
            raise ValueError("beat ids must be unique")
        weeks = [beat.week for beat in self.beats]
        if weeks != sorted(weeks):
            raise ValueError("beats must be ordered by week")
        return self

    def beat(self, beat_index: int) -> Beat:
        return self.beats[beat_index]


def load_story(path: Path) -> StoryArc:
    """Load a story YAML file into a typed story arc."""

    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("story file must contain a mapping")
    return StoryArc.model_validate(raw)
