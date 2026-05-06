"""Pydantic schemas for the engine.

All cross-module data interchange uses these models. Algorithms operate on
Scenario + list[Participant] and return AlgorithmRun. Multi-party and
multi-period are first-class — n_periods=1 is just the simple case.
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Currency(StrEnum):
    USD = "USD"


class Role(StrEnum):
    BUYER = "buyer"
    SUPPLIER = "supplier"
    PACKAGER = "packager"
    LOGISTICS = "logistics"
    DISTRIBUTOR = "distributor"
    CUSTOM = "custom"


class Convergence(StrEnum):
    CONVERGED = "converged"
    OSCILLATING = "oscillating"
    NOT_CONVERGED = "not_converged"
    NO_DEAL = "no_deal"


class InformationMode(StrEnum):
    PRIVATE = "private"
    RISK_ONLY = "risk_only"
    CAPACITY_BAND = "capacity_band"
    COST_BAND = "cost_band"
    FORECAST_BAND = "forecast_band"
    FULL_ORACLE = "full_oracle"


class Product(BaseModel):
    """A SKU being negotiated over."""

    model_config = ConfigDict(frozen=True)

    id: str = Field(min_length=1)
    name: str
    demand_mean: float = Field(gt=0, description="expected demand per period (units)")
    demand_std: float = Field(ge=0, description="demand uncertainty (units)")
    unit_value: float = Field(gt=0, description="value per unit to buyer ($)")


class Participant(BaseModel):
    """An actor in the negotiation.

    The utility formula receives:
      - q: this participant's quantity vector (length n_periods); for n_periods=1 a scalar is fine
      - constants from `parameters`
      - the scenario's product/demand/risk fields exposed by the runner

    The formula evaluator enforces the safe-AST whitelist; see engine.formula.
    """

    model_config = ConfigDict(frozen=True)

    id: str = Field(min_length=1)
    name: str
    role: Role
    utility_formula: str = Field(min_length=1, max_length=2000)
    parameters: dict[str, float] = Field(default_factory=dict)
    outside_option: float = Field(
        default=0.0, description="utility of walking away ($)"
    )


class Scenario(BaseModel):
    """A full negotiation setup: products, participants, periods, evidence."""

    model_config = ConfigDict(frozen=True)

    id: str = Field(min_length=1)
    title: str
    n_periods: int = Field(ge=1, default=1)
    currency: Currency = Currency.USD
    products: list[Product] = Field(min_length=1)
    participants: list[Participant] = Field(min_length=2)
    capacity: dict[str, float] = Field(
        default_factory=dict,
        description="per-product max units delivered per period",
    )
    risk_score: float = Field(ge=0, le=1, default=0.0)
    evidence_ids: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _participants_have_unique_ids(self) -> Scenario:
        ids = [p.id for p in self.participants]
        if len(ids) != len(set(ids)):
            raise ValueError("participant ids must be unique")
        return self

    @model_validator(mode="after")
    def _at_least_one_buyer_and_supplier(self) -> Scenario:
        roles = {p.role for p in self.participants}
        if Role.BUYER not in roles:
            raise ValueError("scenario must include at least one buyer")
        if Role.SUPPLIER not in roles:
            raise ValueError("scenario must include at least one supplier")
        return self

    def participant(self, participant_id: str) -> Participant:
        for p in self.participants:
            if p.id == participant_id:
                return p
        raise KeyError(f"no participant with id {participant_id!r}")


class IterationRecord(BaseModel):
    """One iteration of a coordination algorithm."""

    model_config = ConfigDict(frozen=True)

    iteration: int = Field(ge=0)
    # participant_id -> per-period quantity vector
    quantities: dict[str, list[float]]
    # agreed-on per-period quantity vector across participants
    consensus: list[float]
    # L2 disagreement at this iteration
    residual: float = Field(ge=0)
    # dual variable / Lagrangian / price aggregate
    price_signal: float = Field(default=0.0)


class UtilityLedger(BaseModel):
    """Local + global utility breakdown."""

    model_config = ConfigDict(frozen=True)

    # participant_id -> realized utility ($)
    local: dict[str, float]
    # participant_id -> walk-away utility ($)
    outside_options: dict[str, float]
    global_utility: float
    feasible: bool

    @model_validator(mode="after")
    def _global_matches_components(self) -> UtilityLedger:
        expected = sum(self.local.values())
        # tolerate small floating-point drift
        if abs(expected - self.global_utility) > 1e-6:
            raise ValueError(
                f"global_utility ({self.global_utility}) "
                f"!= sum(local) ({expected})"
            )
        return self


class TransferPlan(BaseModel):
    """Surplus split via cost-benefit transfer.

    `feasible=True` iff every participant's after_transfer utility >= their
    outside_option. If infeasible, the lab shows the explanation rather
    than forcing a fake settlement.
    """

    model_config = ConfigDict(frozen=True)

    transfers: dict[str, float] = Field(description="participant_id -> $ (signed)")
    after_transfer: dict[str, float]
    surplus: float
    no_worse_off: dict[str, bool]
    feasible: bool
    note: str = Field(default="")


class AlgorithmRun(BaseModel):
    """The full output of one algorithm run on one scenario."""

    model_config = ConfigDict(frozen=True)

    scenario_id: str
    algorithm: str
    information_mode: InformationMode
    convergence: Convergence
    iterations: list[IterationRecord]
    ledger: UtilityLedger
    transfer: TransferPlan | None = None
    runtime_ms: float = Field(ge=0)
    final_residual: float = Field(ge=0)
    utility_gap_vs_oracle: float | None = Field(
        default=None,
        description="oracle.global_utility - this.global_utility ($); None for the oracle itself",
    )
