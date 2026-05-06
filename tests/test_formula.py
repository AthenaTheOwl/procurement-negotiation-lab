"""Safe formula evaluator tests — both happy path and refusal."""

from __future__ import annotations

import pytest

from procurement_lab.engine.formula import FormulaError, compile_formula

# ---------- happy path ----------


@pytest.mark.parametrize(
    "expr,namespace,expected",
    [
        ("2 + 3", {}, 5.0),
        ("q * 2", {"q": 7.0}, 14.0),
        ("max(q, 0)", {"q": -5.0}, 0.0),
        ("min(q, 100)", {"q": 250.0}, 100.0),
        ("abs(-7)", {}, 7.0),
        ("sqrt(16)", {}, 4.0),
        ("clip(q, 0, 10)", {"q": 25.0}, 10.0),
        ("clip(q, 0, 10)", {"q": -3.0}, 0.0),
        (
            "100 * min(q, demand) - unit_price * q",
            {"q": 50.0, "demand": 60.0, "unit_price": 30.0},
            3500.0,
        ),
        ("q if q > 0 else 0", {"q": 7.0}, 7.0),
        ("q if q > 0 else 0", {"q": -3.0}, 0.0),
    ],
)
def test_formula_happy_path(expr, namespace, expected) -> None:
    compiled = compile_formula(expr)
    assert compiled.evaluate(namespace) == pytest.approx(expected)


def test_compile_extracts_free_vars() -> None:
    compiled = compile_formula("a * x + b * y - max(c, 0)")
    assert compiled.variables() == frozenset({"a", "x", "b", "y", "c"})


# ---------- refusal: unsafe constructs ----------


@pytest.mark.parametrize(
    "expr",
    [
        "__import__('os')",
        "().__class__",
        "[x for x in [1,2,3]]",
        "lambda q: q+1",
        "(q := 5)",
        "os.system('rm')",
        "eval('1+1')",
        "input()",
        "open('/etc/passwd')",
        "globals()",
        "locals()",
    ],
)
def test_formula_rejects_unsafe(expr) -> None:
    """Every form of unsafe code must raise FormulaError. Specific message
    varies (function-not-allowed, attribute-banned, dunder, etc.)."""
    with pytest.raises(FormulaError):
        compile_formula(expr)


def test_formula_rejects_unknown_var() -> None:
    compiled = compile_formula("q + xyz")
    with pytest.raises(FormulaError, match="unknown variable"):
        compiled.evaluate({"q": 1.0})


def test_formula_rejects_unknown_var_at_compile_when_allowed_set_given() -> None:
    with pytest.raises(FormulaError, match="unknown variable"):
        compile_formula("q + xyz", allowed_vars={"q"})


def test_formula_rejects_oversized() -> None:
    with pytest.raises(FormulaError, match="exceeds"):
        compile_formula("q + " * 1000 + "1")


def test_formula_rejects_too_many_nodes() -> None:
    # build a deeply nested but technically valid expression
    expr = "1" + " + 1" * 200
    with pytest.raises(FormulaError, match="too complex"):
        compile_formula(expr)


def test_formula_log_rejects_nonpositive() -> None:
    compiled = compile_formula("log(q)")
    with pytest.raises(FormulaError, match="log"):
        compiled.evaluate({"q": 0.0})
    with pytest.raises(FormulaError, match="log"):
        compiled.evaluate({"q": -1.0})


def test_formula_pow_caps_exponent() -> None:
    compiled = compile_formula("pow(2, exponent)")
    with pytest.raises(FormulaError, match="exponent"):
        compiled.evaluate({"exponent": 1000.0})


def test_formula_div_by_zero() -> None:
    compiled = compile_formula("q / d")
    with pytest.raises(FormulaError, match="division by zero"):
        compiled.evaluate({"q": 1.0, "d": 0.0})


def test_formula_function_no_kwargs() -> None:
    """Keyword args are rejected (either at AST validation or at eval time)."""
    with pytest.raises(FormulaError):
        compile_formula("max(q, default=0)")
