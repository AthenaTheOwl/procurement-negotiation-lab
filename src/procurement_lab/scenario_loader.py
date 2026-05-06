"""Scenario schemas and loaders."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, field_validator

from procurement_lab.formula_engine import compile_formula


class ProductSpec(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    name: str
    unit_value: float = Field(gt=0)
    demand_mean: float = Field(gt=0)
    demand_sigma: float = Field(ge=0)
    lead_time_weeks: int = Field(ge=1, le=104)


class SupplierSpec(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    name: str
    unit_cost: float = Field(gt=0)
    capacity: float = Field(gt=0)
    risk_score: float = Field(ge=0, le=1)
    evidence_ids: list[str] = Field(default_factory=list)


class ParticipantSpec(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    role: Literal["buyer", "supplier", "packager", "logistics", "distributor", "custom"]
    outside_option: float
    formula: str

    @field_validator("formula")
    @classmethod
    def formula_is_safe(cls, value: str) -> str:
        compile_formula(value)
        return value


class ScenarioSpec(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    name: str
    description: str
    periods: int = Field(ge=1, le=52)
    price: float = Field(gt=0)
    shortage_penalty: float = Field(ge=0)
    holding_cost: float = Field(ge=0)
    cancellation_penalty: float = Field(ge=0)
    risk_penalty: float = Field(ge=0)
    products: list[ProductSpec] = Field(min_length=1, max_length=10)
    suppliers: list[SupplierSpec] = Field(min_length=1, max_length=10)
    participants: list[ParticipantSpec] = Field(min_length=2, max_length=5)
    commitment_types: list[str] = Field(default_factory=lambda: ["firm", "soft", "forecast"])
    source_note: str = "synthetic"

    @field_validator("participants")
    @classmethod
    def must_have_buyer_and_supplier(cls, value: list[ParticipantSpec]) -> list[ParticipantSpec]:
        roles = {participant.role for participant in value}
        if "buyer" not in roles or "supplier" not in roles:
            raise ValueError("scenario must include at least one buyer and one supplier")
        return value


def load_scenarios(path: Path) -> list[ScenarioSpec]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict) or "scenarios" not in raw:
        raise ValueError("scenario file must contain a top-level 'scenarios' key")
    scenarios_raw = raw["scenarios"]
    if not isinstance(scenarios_raw, list):
        raise ValueError("'scenarios' must be a list")
    return [ScenarioSpec.model_validate(item) for item in scenarios_raw]


def scenario_to_context(
    scenario: ScenarioSpec,
    *,
    quantity: float,
    product_index: int = 0,
    supplier_index: int = 0,
    period: int = 1,
    overrides: dict[str, float] | None = None,
) -> dict[str, float]:
    product = scenario.products[product_index]
    supplier = scenario.suppliers[supplier_index]
    context: dict[str, float] = {
        "quantity": float(quantity),
        "demand": product.demand_mean,
        "demand_sigma": product.demand_sigma,
        "price": scenario.price,
        "unit_value": product.unit_value,
        "unit_cost": supplier.unit_cost,
        "capacity": supplier.capacity,
        "risk_score": supplier.risk_score,
        "shortage_penalty": scenario.shortage_penalty,
        "holding_cost": scenario.holding_cost,
        "cancellation_penalty": scenario.cancellation_penalty,
        "risk_penalty": scenario.risk_penalty,
        "lead_time_weeks": float(product.lead_time_weeks),
        "period": float(period),
        "periods": float(scenario.periods),
        "uncertainty": product.demand_sigma / max(product.demand_mean, 1.0),
    }
    if overrides:
        context.update(overrides)
    return context


def dump_scenario_dict(scenario: ScenarioSpec) -> dict[str, Any]:
    return scenario.model_dump(mode="json")
