"""Generated defaults for Arena inputs."""

from __future__ import annotations

from procurement_lab.scenario_loader import ParticipantSpec, ProductSpec, ScenarioSpec, SupplierSpec

BUYER_FORMULA = (
    "unit_value * min(quantity, demand) "
    "- price * quantity "
    "- shortage_penalty * max(demand - quantity, 0) "
    "- holding_cost * max(quantity - demand, 0) "
    "- risk_penalty * risk_score * quantity"
)

SUPPLIER_FORMULA = (
    "price * quantity "
    "- unit_cost * quantity "
    "- cancellation_penalty * uncertainty * quantity "
    "- 2 * max(quantity - capacity, 0) ** 2 "
    "- risk_penalty * risk_score * quantity * 0.25"
)


def build_default_scenario(
    *,
    product_count: int = 1,
    periods: int = 1,
    participant_count: int = 2,
    risk_score: float = 0.35,
) -> ScenarioSpec:
    products = [
        ProductSpec(
            id=f"sku_{index + 1}",
            name=f"Long-lead component {index + 1}",
            unit_value=180.0 + 12.0 * index,
            demand_mean=80.0 + 10.0 * index,
            demand_sigma=18.0 + 3.0 * index,
            lead_time_weeks=16 + 2 * index,
        )
        for index in range(product_count)
    ]
    suppliers = [
        SupplierSpec(
            id="supplier_a",
            name="Synthetic supplier A",
            unit_cost=92.0,
            capacity=95.0,
            risk_score=risk_score,
            evidence_ids=["ev_capacity_band"],
        )
    ]
    participants = [
        ParticipantSpec(
            id="buyer",
            role="buyer",
            outside_option=1700.0,
            formula=BUYER_FORMULA,
        ),
        ParticipantSpec(
            id="supplier",
            role="supplier",
            outside_option=1300.0,
            formula=SUPPLIER_FORMULA,
        ),
    ]
    optional_roles = ["packager", "logistics", "distributor"]
    for role in optional_roles[: max(0, participant_count - 2)]:
        participants.append(
            ParticipantSpec(
                id=role,
                role=role,  # type: ignore[arg-type]
                outside_option=250.0,
                formula="-0.15 * risk_score * quantity - 0.05 * max(quantity - capacity, 0) ** 2",
            )
        )
    return ScenarioSpec(
        id="arena_generated",
        name="Generated arena scenario",
        description="Deterministic generated scenario from minimum arena inputs.",
        periods=periods,
        price=128.0,
        shortage_penalty=45.0,
        holding_cost=12.0,
        cancellation_penalty=22.0,
        risk_penalty=18.0,
        products=products,
        suppliers=suppliers,
        participants=participants,
        source_note="generated synthetic default",
    )
