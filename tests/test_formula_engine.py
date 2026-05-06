from __future__ import annotations

import pytest
from hypothesis import given
from hypothesis import strategies as st

from procurement_lab.formula_engine import FormulaError, evaluate_formula


def test_formula_accepts_basic_math() -> None:
    value = evaluate_formula(
        "unit_value * min(quantity, demand) - price * quantity",
        {"unit_value": 10, "quantity": 4, "demand": 3, "price": 2},
    )
    assert value == 22.0


@pytest.mark.parametrize(
    "formula",
    [
        "__import__('os').system('echo bad')",
        "(1).__class__",
        "[x for x in [1, 2, 3]]",
        "open('x')",
        "quantity[0]",
        "lambda x: x",
    ],
)
def test_formula_rejects_unsafe_constructs(formula: str) -> None:
    with pytest.raises(FormulaError):
        evaluate_formula(formula, {"quantity": 1})


@given(
    quantity=st.floats(min_value=0, max_value=200, allow_nan=False, allow_infinity=False),
    demand=st.floats(min_value=1, max_value=200, allow_nan=False, allow_infinity=False),
)
def test_formula_property_finite(quantity: float, demand: float) -> None:
    value = evaluate_formula(
        "min(quantity, demand) - 0.5 * max(quantity - demand, 0)",
        {"quantity": quantity, "demand": demand},
    )
    assert isinstance(value, float)
