"""Shared trace and metric models for every coordination algorithm."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

AlgorithmName = Literal[
    "centralized_oracle",
    "admm",
    "alternating_best_response",
    "price_only_dual",
    "consensus_averaging",
]

InformationMode = Literal[
    "private",
    "risk_only",
    "capacity_band",
    "cost_band",
    "forecast_band",
    "full_oracle",
]


class IterationRecord(BaseModel):
    model_config = ConfigDict(frozen=True)

    iteration: int = Field(ge=0)
    buyer_quantity: float = Field(ge=0)
    supplier_quantity: float = Field(ge=0)
    consensus_quantity: float = Field(ge=0)
    price_signal: float
    residual: float = Field(ge=0)


class UtilityLedger(BaseModel):
    model_config = ConfigDict(frozen=True)

    buyer_utility: float
    supplier_utility: float
    global_utility: float
    buyer_outside_option: float
    supplier_outside_option: float
    feasible: bool
    quantity: float = Field(ge=0)

    @field_validator("global_utility")
    @classmethod
    def global_matches_components(cls, value: float, info: object) -> float:
        return value


class TransferPlan(BaseModel):
    model_config = ConfigDict(frozen=True)

    surplus: float
    buyer_transfer: float
    supplier_transfer: float
    buyer_after_transfer: float
    supplier_after_transfer: float
    buyer_no_worse_off: bool
    supplier_no_worse_off: bool
    feasible: bool
    note: str


class AlgorithmMetrics(BaseModel):
    model_config = ConfigDict(frozen=True)

    algorithm: AlgorithmName
    information_mode: InformationMode
    iterations: int = Field(ge=0)
    runtime_ms: float = Field(ge=0)
    residual: float = Field(ge=0)
    utility_gap_vs_oracle: float
    feasibility_violation: float = Field(ge=0)
    explanation_quality: float = Field(ge=0, le=1)


class CoordinationTrace(BaseModel):
    model_config = ConfigDict(frozen=True)

    scenario_id: str
    algorithm: AlgorithmName
    information_mode: InformationMode
    product_id: str
    period: int = Field(ge=1)
    iterations: list[IterationRecord]
    ledger: UtilityLedger
    transfer: TransferPlan
    metrics: AlgorithmMetrics
    citations: list[str] = Field(default_factory=list)
