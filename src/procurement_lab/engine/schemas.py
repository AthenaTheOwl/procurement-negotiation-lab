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
    leakage_report: TranscriptExposureReport | None = Field(
        default=None,
        description=(
            "Per-run transcript-exposure report for mechanisms that do "
            "not send utility functions to the aggregator "
            "(weighted_nash_bounded, weighted_nash_mpc). The field name "
            "is retained for compatibility with earlier clients; it is "
            "not a differential-privacy guarantee."
        ),
    )
    failure: MechanismFailure | None = Field(
        default=None,
        description=(
            "Structured failure for mechanisms that cannot return a "
            "valid allocation; None on success. See DEC-NASH-001 for "
            "reason-code semantics."
        ),
    )

    @property
    def transcript_exposure_report(self) -> TranscriptExposureReport | None:
        """Preferred alias for ``leakage_report``.

        ``leakage_report`` remains the serialized field for backward
        compatibility. New code should prefer this property in prose and
        UI labels because the report measures transcript exposure, not a
        privacy guarantee.
        """
        return self.leakage_report


class MechanismFailureReason(StrEnum):
    """Reason codes for MechanismFailure (DEC-NASH-001)."""

    NO_FEASIBLE_ALLOCATION = "no_feasible_allocation"
    BATNA_FLOOR_UNREACHABLE = "batna_floor_unreachable"
    CAPACITY_EXCEEDED = "capacity_exceeded"
    DEALBREAKER_CONFLICT = "dealbreaker_conflict"
    PRIVATE_MODE_UNSUPPORTED = "private_mode_unsupported"


class MechanismFailure(BaseModel):
    """A structured failure result from a bargaining mechanism.

    Mechanisms return this in the AlgorithmRun.failure field rather
    than raising, so SDK callers can route every mechanism through the
    same return path and surface a "no deal" state without exception
    handling. See DEC-NASH-001.
    """

    model_config = ConfigDict(frozen=True)

    reason: MechanismFailureReason
    note: str = Field(default="")


class TranscriptExposureParty(BaseModel):
    """Per-party transcript-exposure accounting (DEC-NASH-002).

    The numeric fields keep their historical ``epsilon_*`` names for
    schema compatibility. They are measured in bits of transcript
    exposure, not differential-privacy epsilon.
    """

    model_config = ConfigDict(frozen=True)

    party_id: str
    epsilon_bound: float = Field(
        ge=0,
        description="Declared per-protocol-version upper bound on bits of utility-function information that the transcript reveals about this party; not a DP epsilon.",
    )
    epsilon_measured: float = Field(
        ge=0,
        description="Measured per-run transcript-exposure upper bound in bits: round_count * (n_coords * log2(3) + log2(STEP_QUANTIZATION_LEVELS)).",
    )
    round_count: int = Field(ge=0)
    message_log_hash: str = Field(
        min_length=64,
        max_length=64,
        pattern=r"^[a-f0-9]{64}$",
        description="SHA-256 of the canonical-JSON-serialized message log this party sent.",
    )
    sufficiency_note: str = Field(
        default="",
        description="Human-readable note on the bound's looseness (e.g., 'transcript-exposure upper bound; not a differential-privacy guarantee').",
    )

    @property
    def exposure_bits_bound(self) -> float:
        """Preferred name for ``epsilon_bound``."""
        return self.epsilon_bound

    @property
    def exposure_bits_measured(self) -> float:
        """Preferred name for ``epsilon_measured``."""
        return self.epsilon_measured


class AggregateTranscriptExposure(BaseModel):
    """Aggregate transcript exposure across parties."""

    model_config = ConfigDict(frozen=True)

    max_epsilon_measured: float = Field(ge=0)
    max_epsilon_bound: float = Field(ge=0)
    all_within_bound: bool

    @property
    def max_exposure_bits_measured(self) -> float:
        """Preferred name for ``max_epsilon_measured``."""
        return self.max_epsilon_measured

    @property
    def max_exposure_bits_bound(self) -> float:
        """Preferred name for ``max_epsilon_bound``."""
        return self.max_epsilon_bound

class TranscriptExposureReport(BaseModel):
    """Per-run transcript-exposure report for weighted-Nash variants.

    Schema mirrored to JSON Schema at the historical
    `ops/schemas/leakage-report.schema.json` for cross-repo consumers
    (run-evidence packet emitter chain, DEC-FACTORY-007). The file and
    field names remain stable for compatibility; new prose should call
    this transcript-exposure accounting, not a privacy guarantee.
    """

    model_config = ConfigDict(frozen=True)

    protocol_version: str = Field(
        min_length=1,
        description="Protocol contract identifier. v1 today is 'transcript-exposure/v1'; 'bounded-leakage/v1' remains accepted as a legacy identifier.",
    )
    run_id: str = Field(min_length=1)
    seed: int = Field(
        description="64-bit seed pinned for the protocol run; same seed + scenario + parameter file reproduces the message sequence.",
    )
    round_count: int = Field(ge=0)
    per_party: list[TranscriptExposureParty] = Field(min_length=1)
    aggregate: AggregateTranscriptExposure

    @model_validator(mode="after")
    def _aggregate_matches_per_party(self) -> TranscriptExposureReport:
        if not self.per_party:
            return self
        expected_max_measured = max(p.epsilon_measured for p in self.per_party)
        expected_max_bound = max(p.epsilon_bound for p in self.per_party)
        expected_within = all(
            p.epsilon_measured <= p.epsilon_bound for p in self.per_party
        )
        if abs(self.aggregate.max_epsilon_measured - expected_max_measured) > 1e-9:
            raise ValueError(
                f"aggregate.max_epsilon_measured ({self.aggregate.max_epsilon_measured}) "
                f"does not match per_party max ({expected_max_measured})"
            )
        if abs(self.aggregate.max_epsilon_bound - expected_max_bound) > 1e-9:
            raise ValueError(
                f"aggregate.max_epsilon_bound ({self.aggregate.max_epsilon_bound}) "
                f"does not match per_party max ({expected_max_bound})"
            )
        if self.aggregate.all_within_bound != expected_within:
            raise ValueError(
                f"aggregate.all_within_bound ({self.aggregate.all_within_bound}) "
                f"does not match per_party check ({expected_within})"
            )
        return self


# Compatibility aliases for existing SDK users and serialized field names.
PartyLeakage = TranscriptExposureParty
AggregateLeakage = AggregateTranscriptExposure
LeakageReport = TranscriptExposureReport
