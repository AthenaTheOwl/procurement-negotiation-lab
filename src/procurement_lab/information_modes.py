"""Information-sharing modes.

Algorithms optimize on perceived context. Ledgers evaluate on actual context.
That distinction is what makes information value visible.
"""

from __future__ import annotations

from dataclasses import dataclass

from procurement_lab.trace_schema import InformationMode

INFORMATION_MODES: tuple[InformationMode, ...] = (
    "private",
    "risk_only",
    "capacity_band",
    "cost_band",
    "forecast_band",
    "full_oracle",
)


@dataclass(frozen=True)
class InformationProfile:
    mode: InformationMode
    label: str
    shared_fields: tuple[str, ...]
    privacy_exposure: float
    buyer_overrides: dict[str, float]
    supplier_overrides: dict[str, float]
    explanation: str


def information_profile(mode: InformationMode, actual: dict[str, float]) -> InformationProfile:
    demand = actual["demand"]
    capacity = actual["capacity"]
    risk = actual["risk_score"]
    unit_cost = actual["unit_cost"]

    profiles: dict[InformationMode, InformationProfile] = {
        "private": InformationProfile(
            mode=mode,
            label="private",
            shared_fields=(),
            privacy_exposure=0.05,
            buyer_overrides={"capacity": capacity * 1.18, "risk_score": 0.25},
            supplier_overrides={"demand": demand * 0.82, "risk_score": 0.25},
            explanation="each side optimizes with its own biased view",
        ),
        "risk_only": InformationProfile(
            mode=mode,
            label="risk only",
            shared_fields=("risk_score",),
            privacy_exposure=0.18,
            buyer_overrides={"capacity": capacity * 1.15, "risk_score": risk},
            supplier_overrides={"demand": demand * 0.84, "risk_score": risk},
            explanation="risk is shared, but demand and capacity stay noisy",
        ),
        "capacity_band": InformationProfile(
            mode=mode,
            label="capacity band",
            shared_fields=("risk_score", "capacity_band"),
            privacy_exposure=0.34,
            buyer_overrides={"capacity": capacity * 1.04, "risk_score": risk},
            supplier_overrides={"demand": demand * 0.87, "risk_score": risk},
            explanation="supplier reveals rough capacity, reducing overcommitment",
        ),
        "cost_band": InformationProfile(
            mode=mode,
            label="cost band",
            shared_fields=("risk_score", "capacity_band", "cost_band"),
            privacy_exposure=0.48,
            buyer_overrides={"capacity": capacity * 1.04, "unit_cost": unit_cost * 1.05},
            supplier_overrides={"demand": demand * 0.90, "risk_score": risk},
            explanation="rough cost structure makes transfers easier to justify",
        ),
        "forecast_band": InformationProfile(
            mode=mode,
            label="forecast band",
            shared_fields=("risk_score", "capacity_band", "cost_band", "forecast_band"),
            privacy_exposure=0.66,
            buyer_overrides={"capacity": capacity * 1.02, "unit_cost": unit_cost * 1.03},
            supplier_overrides={"demand": demand * 0.98, "risk_score": risk},
            explanation="buyer shares demand band, improving supplier planning",
        ),
        "full_oracle": InformationProfile(
            mode=mode,
            label="full information oracle",
            shared_fields=("risk_score", "capacity", "cost", "forecast", "penalties"),
            privacy_exposure=1.0,
            buyer_overrides={},
            supplier_overrides={},
            explanation="all modeled parameters are common knowledge",
        ),
    }
    return profiles[mode]


def mode_rank(mode: InformationMode) -> int:
    return INFORMATION_MODES.index(mode)
