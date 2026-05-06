"""Safe formula evaluation for utility functions.

The public app lets users type math. That must not become arbitrary Python.
This module only evaluates a small expression language over numeric variables.
"""

from __future__ import annotations

import ast
import math
import operator
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Final


class FormulaError(ValueError):
    """Raised when a formula is unsafe or cannot be evaluated."""


Number = int | float
BinaryOp = Callable[[float, float], float]
UnaryOp = Callable[[float], float]
CompareOp = Callable[[float, float], bool]
MathFunction = Callable[..., float]


def _fn_abs(value: float) -> float:
    return abs(value)


def _fn_min(*values: float) -> float:
    return min(values)


def _fn_max(*values: float) -> float:
    return max(values)


ALLOWED_FUNCTIONS: Final[dict[str, MathFunction]] = {
    "abs": _fn_abs,
    "min": _fn_min,
    "max": _fn_max,
    "sqrt": math.sqrt,
    "log": math.log,
    "exp": math.exp,
    "floor": math.floor,
    "ceil": math.ceil,
}

ALLOWED_BINOPS: Final[dict[type[ast.operator], BinaryOp]] = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
}

ALLOWED_UNARY: Final[dict[type[ast.unaryop], UnaryOp]] = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

ALLOWED_COMPARE: Final[dict[type[ast.cmpop], CompareOp]] = {
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
}


@dataclass(frozen=True)
class CompiledFormula:
    """Validated expression tree that can be evaluated against numeric context."""

    source: str
    tree: ast.Expression

    def evaluate(self, context: Mapping[str, Number]) -> float:
        evaluator = _Evaluator(context)
        value = evaluator.visit(self.tree.body)
        if not isinstance(value, int | float | bool):
            raise FormulaError("formula returned a non-numeric value")
        result = float(value)
        if not math.isfinite(result):
            raise FormulaError("formula returned a non-finite value")
        return result


def compile_formula(source: str) -> CompiledFormula:
    """Compile and validate a formula.

    Allowed: arithmetic, comparisons, boolean `and`/`or`, and a tiny function set.
    Rejected: attributes, imports, comprehensions, lambdas, assignments, indexing,
    f-strings, names not provided at evaluation time, and every statement form.
    """

    cleaned = source.strip()
    if not cleaned:
        raise FormulaError("formula cannot be empty")
    if len(cleaned) > 500:
        raise FormulaError("formula is too long; keep it under 500 characters")
    try:
        tree = ast.parse(cleaned, mode="eval")
    except SyntaxError as exc:
        raise FormulaError(f"invalid formula syntax: {exc.msg}") from exc
    _Validator().visit(tree)
    return CompiledFormula(source=cleaned, tree=tree)


def evaluate_formula(source: str, context: Mapping[str, Number]) -> float:
    return compile_formula(source).evaluate(context)


def clamp(value: Number, low: Number, high: Number) -> float:
    return float(min(max(value, low), high))


ALLOWED_FUNCTIONS["clamp"] = clamp


class _Validator(ast.NodeVisitor):
    allowed_nodes: Final[tuple[type[ast.AST], ...]] = (
        ast.Expression,
        ast.BinOp,
        ast.UnaryOp,
        ast.Constant,
        ast.Name,
        ast.Load,
        ast.Call,
        ast.Compare,
        ast.BoolOp,
        ast.IfExp,
        ast.And,
        ast.Or,
        ast.operator,
        ast.unaryop,
        ast.cmpop,
    )

    def generic_visit(self, node: ast.AST) -> None:
        if not isinstance(node, self.allowed_nodes):
            raise FormulaError(f"disallowed expression: {node.__class__.__name__}")
        super().generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        if not isinstance(node.func, ast.Name):
            raise FormulaError("only direct calls to allowed math functions are permitted")
        if node.func.id not in ALLOWED_FUNCTIONS:
            raise FormulaError(f"function is not allowed: {node.func.id}")
        if node.keywords:
            raise FormulaError("keyword arguments are not allowed")
        self.generic_visit(node)

    def visit_BinOp(self, node: ast.BinOp) -> None:
        if type(node.op) not in ALLOWED_BINOPS:
            raise FormulaError(f"operator is not allowed: {node.op.__class__.__name__}")
        self.generic_visit(node)

    def visit_UnaryOp(self, node: ast.UnaryOp) -> None:
        if type(node.op) not in ALLOWED_UNARY:
            raise FormulaError(f"operator is not allowed: {node.op.__class__.__name__}")
        self.generic_visit(node)

    def visit_Compare(self, node: ast.Compare) -> None:
        for op in node.ops:
            if type(op) not in ALLOWED_COMPARE:
                raise FormulaError(f"comparison is not allowed: {op.__class__.__name__}")
        self.generic_visit(node)

    def visit_Constant(self, node: ast.Constant) -> None:
        if not isinstance(node.value, int | float | bool):
            raise FormulaError("only numeric and boolean constants are allowed")


class _Evaluator(ast.NodeVisitor):
    def __init__(self, context: Mapping[str, Number]) -> None:
        self.context = context

    def visit_Constant(self, node: ast.Constant) -> Number | bool:
        if not isinstance(node.value, int | float | bool):
            raise FormulaError("only numeric and boolean constants are allowed")
        return node.value

    def visit_Name(self, node: ast.Name) -> Number:
        if node.id in self.context:
            return self.context[node.id]
        raise FormulaError(f"unknown variable: {node.id}")

    def visit_BinOp(self, node: ast.BinOp) -> Number:
        op = ALLOWED_BINOPS.get(type(node.op))
        if op is None:
            raise FormulaError(f"operator is not allowed: {node.op.__class__.__name__}")
        left = self.visit(node.left)
        right = self.visit(node.right)
        if not isinstance(left, int | float) or not isinstance(right, int | float):
            raise FormulaError("arithmetic operands must be numeric")
        try:
            result = op(float(left), float(right))
        except (OverflowError, ValueError, ZeroDivisionError) as exc:
            raise FormulaError(f"formula math error: {exc}") from exc
        return _finite(result)

    def visit_UnaryOp(self, node: ast.UnaryOp) -> Number:
        op = ALLOWED_UNARY.get(type(node.op))
        if op is None:
            raise FormulaError(f"operator is not allowed: {node.op.__class__.__name__}")
        value = self.visit(node.operand)
        if not isinstance(value, int | float):
            raise FormulaError("unary operand must be numeric")
        return _finite(op(float(value)))

    def visit_Call(self, node: ast.Call) -> Number:
        if not isinstance(node.func, ast.Name):
            raise FormulaError("only direct calls are allowed")
        fn = ALLOWED_FUNCTIONS.get(node.func.id)
        if fn is None:
            raise FormulaError(f"function is not allowed: {node.func.id}")
        values: list[float] = []
        for arg in node.args:
            value = self.visit(arg)
            if not isinstance(value, int | float | bool):
                raise FormulaError("function arguments must be numeric")
            values.append(float(value))
        try:
            result = fn(*values)
        except (OverflowError, ValueError, ZeroDivisionError) as exc:
            raise FormulaError(f"formula math error: {exc}") from exc
        if not isinstance(result, int | float | bool):
            raise FormulaError("function returned a non-numeric value")
        return _finite(result)

    def visit_Compare(self, node: ast.Compare) -> bool:
        left = self.visit(node.left)
        for op_node, comparator in zip(node.ops, node.comparators, strict=True):
            op = ALLOWED_COMPARE.get(type(op_node))
            if op is None:
                raise FormulaError(f"comparison is not allowed: {op_node.__class__.__name__}")
            right = self.visit(comparator)
            if not isinstance(left, int | float | bool) or not isinstance(
                right, int | float | bool
            ):
                raise FormulaError("comparison operands must be numeric")
            if not op(float(left), float(right)):
                return False
            left = right
        return True

    def visit_BoolOp(self, node: ast.BoolOp) -> bool:
        values = [bool(self.visit(value)) for value in node.values]
        if isinstance(node.op, ast.And):
            return all(values)
        if isinstance(node.op, ast.Or):
            return any(values)
        raise FormulaError("boolean operator is not allowed")

    def visit_IfExp(self, node: ast.IfExp) -> Number | bool:
        value = self.visit(node.body if bool(self.visit(node.test)) else node.orelse)
        if not isinstance(value, int | float | bool):
            raise FormulaError("conditional branch returned a non-numeric value")
        return value

    def generic_visit(self, node: ast.AST) -> Number | bool:
        raise FormulaError(f"disallowed expression: {node.__class__.__name__}")


def _finite(value: object) -> float:
    if not isinstance(value, int | float | bool):
        raise FormulaError("formula returned a non-numeric value")
    result = float(value)
    if not math.isfinite(result):
        raise FormulaError("formula returned a non-finite value")
    return result
