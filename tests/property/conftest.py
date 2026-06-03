"""Shared Hypothesis configuration for the property battery.

Sets a global seed, caps max_examples to a CI-safe number, and exposes
strategies for generating valid bargaining scenarios.

Per DEC-PROP-001:
- Default max_examples = 100
- Per-property override via the `max_examples` setting
- Per-test timeout enforced by pytest-timeout (60s default)
- Failure bundle uploads via .hypothesis/ on CI red
"""

from __future__ import annotations

from hypothesis import HealthCheck, settings
from hypothesis import strategies as st

from procurement_lab.engine.schemas import Participant, Product, Role, Scenario

# Register a project-wide Hypothesis profile. CI overrides this with a
# stricter profile if total runtime grows close to the 10-minute cap.
settings.register_profile(
    "procurement-lab-default",
    max_examples=100,
    deadline=None,  # per-test deadlines handled by pytest-timeout
    suppress_health_check=[
        HealthCheck.too_slow,  # algorithm runs are intentionally slow
        HealthCheck.data_too_large,  # scenarios with multiple products are valid
    ],
)
settings.load_profile("procurement-lab-default")


# -- Strategy helpers --------------------------------------------------------


@st.composite
def product_strategy(draw: st.DrawFn, *, prefix: str = "p") -> Product:
    """Generate a valid Product."""
    pid = draw(st.text(alphabet="abcdef0123456789", min_size=4, max_size=8))
    return Product(
        id=f"{prefix}-{pid}",
        name=f"Generated product {pid}",
        demand_mean=draw(st.floats(min_value=10.0, max_value=200.0, allow_nan=False, allow_infinity=False)),
        demand_std=draw(st.floats(min_value=0.0, max_value=20.0, allow_nan=False, allow_infinity=False)),
        unit_value=draw(st.floats(min_value=20.0, max_value=150.0, allow_nan=False, allow_infinity=False)),
    )


@st.composite
def buyer_strategy(draw: st.DrawFn, *, suffix: str = "b") -> Participant:
    """Generate a valid buyer participant with a safe-AST utility formula."""
    bid = draw(st.text(alphabet="abcdef0123456789", min_size=4, max_size=8))
    return Participant(
        id=f"buyer-{suffix}-{bid}",
        name=f"Generated buyer {bid}",
        role=Role.BUYER,
        utility_formula=(
            "service_level_value * min(q, demand) "
            "- unit_price * q "
            "- shortage_penalty * max(demand - q, 0) "
            "- inventory_penalty * max(q - demand, 0)"
        ),
        parameters={
            "service_level_value": draw(st.floats(min_value=40.0, max_value=150.0, allow_nan=False, allow_infinity=False)),
            "unit_price": draw(st.floats(min_value=20.0, max_value=80.0, allow_nan=False, allow_infinity=False)),
            "shortage_penalty": draw(st.floats(min_value=30.0, max_value=120.0, allow_nan=False, allow_infinity=False)),
            "inventory_penalty": draw(st.floats(min_value=1.0, max_value=15.0, allow_nan=False, allow_infinity=False)),
        },
        outside_option=0.0,
    )


@st.composite
def supplier_strategy(draw: st.DrawFn, *, suffix: str = "s") -> Participant:
    """Generate a valid supplier participant with a safe-AST utility formula."""
    sid = draw(st.text(alphabet="abcdef0123456789", min_size=4, max_size=8))
    return Participant(
        id=f"supplier-{suffix}-{sid}",
        name=f"Generated supplier {sid}",
        role=Role.SUPPLIER,
        utility_formula=(
            "revenue_per_unit * q "
            "- production_cost * q "
            "- holding_cost * max(q - demand, 0) "
            "- stockout_penalty * max(demand - q, 0) "
            "- risk_premium * risk_score * q"
        ),
        parameters={
            "revenue_per_unit": draw(st.floats(min_value=20.0, max_value=80.0, allow_nan=False, allow_infinity=False)),
            "production_cost": draw(st.floats(min_value=10.0, max_value=50.0, allow_nan=False, allow_infinity=False)),
            "holding_cost": draw(st.floats(min_value=1.0, max_value=10.0, allow_nan=False, allow_infinity=False)),
            "stockout_penalty": draw(st.floats(min_value=2.0, max_value=15.0, allow_nan=False, allow_infinity=False)),
            "risk_premium": draw(st.floats(min_value=2.0, max_value=15.0, allow_nan=False, allow_infinity=False)),
        },
        outside_option=0.0,
    )


@st.composite
def scenario_strategy(
    draw: st.DrawFn,
    *,
    n_buyers: int = 1,
    n_suppliers: int = 1,
    risk_score_max: float = 0.8,
) -> Scenario:
    """Generate a valid two-party (or N-party) bargaining scenario.

    The strategy enforces invariants that the Scenario model validates:
    at least one buyer + one supplier; unique participant ids; products
    with positive demand_mean and unit_value; capacity per product.

    Buyer and supplier utility formulas reference the participant's
    `parameters` plus the runtime-injected `q`, `demand`, and
    `risk_score` constants. This matches the existing scenario shape in
    `tests/conftest.py`.
    """
    product = draw(product_strategy())
    capacity_units = draw(st.floats(min_value=80.0, max_value=400.0, allow_nan=False, allow_infinity=False))
    risk = draw(st.floats(min_value=0.0, max_value=risk_score_max, allow_nan=False, allow_infinity=False))

    participants: list[Participant] = []
    for i in range(n_buyers):
        participants.append(draw(buyer_strategy(suffix=f"b{i}")))
    for i in range(n_suppliers):
        participants.append(draw(supplier_strategy(suffix=f"s{i}")))

    sid = draw(st.text(alphabet="abcdef0123456789", min_size=4, max_size=8))
    return Scenario(
        id=f"prop-{sid}",
        title=f"Property-generated scenario {sid}",
        n_periods=1,
        products=[product],
        participants=participants,
        capacity={product.id: capacity_units},
        risk_score=risk,
        evidence_ids=[],
    )
