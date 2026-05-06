"""Safe AST-whitelisted utility-formula evaluator.

DO NOT use eval() or sympy.parse_expr on user input — both execute arbitrary
Python. This module parses formulas with `ast.parse(mode='eval')`, walks the
tree, rejects anything not on the whitelist, and evaluates only the allowed
operations.

Allowed AST nodes:
    Constant, Name, BinOp, UnaryOp, Call (whitelisted funcs only),
    Compare, BoolOp, IfExp, Subscript (Name[Name|Constant])

Banned outright:
    Attribute, Import, Lambda, ListComp/DictComp/SetComp/GeneratorExp,
    Yield, YieldFrom, Try, With, FunctionDef, ClassDef, Assign, AugAssign,
    Starred, dunder names

Limits:
    expression length <= 2000 chars
    AST node count <= 200
    function-call depth <= 5
"""

from __future__ import annotations

import ast
import math
from collections.abc import Callable
from dataclasses import dataclass

MAX_EXPR_LEN = 2000
MAX_AST_NODES = 200
MAX_CALL_DEPTH = 5


def _safe_clip(value: float, lo: float, hi: float) -> float:
    if lo > hi:
        raise FormulaError(f"clip: lo ({lo}) must be <= hi ({hi})")
    return max(lo, min(hi, value))


def _safe_pow(base: float, exponent: float) -> float:
    # Cap exponent to prevent runaway numbers in user formulas.
    if abs(exponent) > 10:
        raise FormulaError(f"pow: exponent {exponent} exceeds limit (|exp| <= 10)")
    return math.pow(base, exponent)


def _safe_log(value: float) -> float:
    if value <= 0:
        raise FormulaError(f"log: argument must be > 0 (got {value})")
    return math.log(value)


def _safe_sqrt(value: float) -> float:
    if value < 0:
        raise FormulaError(f"sqrt: argument must be >= 0 (got {value})")
    return math.sqrt(value)


# Whitelist of callable names available inside a formula.
ALLOWED_FUNCTIONS: dict[str, Callable[..., float]] = {
    "min": min,
    "max": max,
    "abs": abs,
    "sqrt": _safe_sqrt,
    "log": _safe_log,
    "exp": math.exp,
    "clip": _safe_clip,
    "pow": _safe_pow,
}


# AST node types that are always rejected.
_BANNED_NODES = (
    ast.Attribute,
    ast.Import,
    ast.ImportFrom,
    ast.Lambda,
    ast.ListComp,
    ast.DictComp,
    ast.SetComp,
    ast.GeneratorExp,
    ast.Yield,
    ast.YieldFrom,
    ast.Try,
    ast.With,
    ast.FunctionDef,
    ast.AsyncFunctionDef,
    ast.ClassDef,
    ast.Assign,
    ast.AugAssign,
    ast.AnnAssign,
    ast.Starred,
    ast.NamedExpr,  # walrus
    ast.Await,
    ast.Global,
    ast.Nonlocal,
)


# AST node types that are allowed.
_ALLOWED_NODES = (
    ast.Expression,
    ast.Constant,
    ast.Name,
    ast.Load,
    ast.BinOp,
    ast.UnaryOp,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.FloorDiv,
    ast.Mod,
    ast.Pow,
    ast.UAdd,
    ast.USub,
    ast.Compare,
    ast.Eq,
    ast.NotEq,
    ast.Lt,
    ast.LtE,
    ast.Gt,
    ast.GtE,
    ast.BoolOp,
    ast.And,
    ast.Or,
    ast.Not,
    ast.IfExp,
    ast.Call,
    ast.Subscript,
    ast.Index,  # py < 3.9, harmless
    ast.Tuple,
    ast.List,
)


class FormulaError(ValueError):
    """Raised when a formula is invalid, unsafe, or fails to evaluate."""


@dataclass(frozen=True)
class CompiledFormula:
    """A parsed, validated formula ready to evaluate against a namespace."""

    source: str
    _tree: ast.Expression
    _free_vars: frozenset[str]

    def variables(self) -> frozenset[str]:
        return self._free_vars

    def evaluate(self, namespace: dict[str, float]) -> float:
        return _evaluate(self._tree.body, namespace, depth=0)


def compile_formula(source: str, *, allowed_vars: set[str] | None = None) -> CompiledFormula:
    """Parse and validate a formula. Raises FormulaError on any rejection.

    `allowed_vars`, if provided, restricts the names that may appear in the
    formula (in addition to the whitelisted functions). Useful to catch typos
    like `risk_scoree` early instead of at evaluation time.
    """

    if not isinstance(source, str):
        raise FormulaError(f"formula must be a string, got {type(source).__name__}")
    source = source.strip()
    if not source:
        raise FormulaError("formula is empty")
    if len(source) > MAX_EXPR_LEN:
        raise FormulaError(
            f"formula exceeds {MAX_EXPR_LEN} chars (got {len(source)})"
        )

    try:
        tree = ast.parse(source, mode="eval")
    except SyntaxError as exc:
        raise FormulaError(f"syntax error: {exc.msg}") from exc

    node_count = sum(1 for _ in ast.walk(tree))
    if node_count > MAX_AST_NODES:
        raise FormulaError(f"formula too complex ({node_count} AST nodes; max {MAX_AST_NODES})")

    free_vars: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, _BANNED_NODES):
            raise FormulaError(
                f"node type {type(node).__name__} is not allowed in formulas"
            )
        if not isinstance(node, _ALLOWED_NODES):
            raise FormulaError(
                f"node type {type(node).__name__} is not allowed in formulas"
            )
        if isinstance(node, ast.Name):
            name = node.id
            if name.startswith("_") or "__" in name:
                raise FormulaError(f"name {name!r} is not allowed (private/dunder)")
            if name in ALLOWED_FUNCTIONS:
                continue
            free_vars.add(name)
        if isinstance(node, ast.Call):
            func = node.func
            if not isinstance(func, ast.Name):
                raise FormulaError("only direct calls to whitelisted functions allowed")
            if func.id not in ALLOWED_FUNCTIONS:
                raise FormulaError(f"function {func.id!r} is not allowed")

    if allowed_vars is not None:
        unknown = free_vars - allowed_vars
        if unknown:
            raise FormulaError(
                f"unknown variable(s): {sorted(unknown)}. "
                f"Allowed: {sorted(allowed_vars)}"
            )

    return CompiledFormula(source=source, _tree=tree, _free_vars=frozenset(free_vars))


def _evaluate(node: ast.AST, namespace: dict[str, float], *, depth: int) -> float:
    if depth > MAX_CALL_DEPTH:
        raise FormulaError(f"call depth {depth} exceeds max {MAX_CALL_DEPTH}")

    if isinstance(node, ast.Constant):
        if isinstance(node.value, bool | int | float):
            return float(node.value)
        raise FormulaError(f"constant of type {type(node.value).__name__} not allowed")

    if isinstance(node, ast.Name):
        if node.id in ALLOWED_FUNCTIONS:
            raise FormulaError(f"cannot reference function {node.id!r} as a value")
        if node.id not in namespace:
            raise FormulaError(f"unknown variable: {node.id!r}")
        return float(namespace[node.id])

    if isinstance(node, ast.BinOp):
        left = _evaluate(node.left, namespace, depth=depth)
        right = _evaluate(node.right, namespace, depth=depth)
        op_map: dict[type, Callable[[float, float], float]] = {
            ast.Add: lambda a, b: a + b,
            ast.Sub: lambda a, b: a - b,
            ast.Mult: lambda a, b: a * b,
            ast.Div: lambda a, b: a / b if b != 0 else _div_by_zero(),
            ast.FloorDiv: lambda a, b: a // b if b != 0 else _div_by_zero(),
            ast.Mod: lambda a, b: a % b if b != 0 else _div_by_zero(),
            ast.Pow: _safe_pow,
        }
        op = op_map.get(type(node.op))
        if op is None:
            raise FormulaError(f"binary op {type(node.op).__name__} not allowed")
        return float(op(left, right))

    if isinstance(node, ast.UnaryOp):
        value = _evaluate(node.operand, namespace, depth=depth)
        if isinstance(node.op, ast.UAdd):
            return +value
        if isinstance(node.op, ast.USub):
            return -value
        if isinstance(node.op, ast.Not):
            return float(not value)
        raise FormulaError(f"unary op {type(node.op).__name__} not allowed")

    if isinstance(node, ast.Call):
        # validate already enforced func is a whitelisted Name; re-check
        # defensively rather than `assert` (which Bandit B101 flags).
        if not isinstance(node.func, ast.Name):
            raise FormulaError("only direct calls to whitelisted functions allowed")
        fn = ALLOWED_FUNCTIONS[node.func.id]
        if node.keywords:
            raise FormulaError(f"function {node.func.id} called with keyword args; not allowed")
        args = [_evaluate(a, namespace, depth=depth + 1) for a in node.args]
        return float(fn(*args))

    if isinstance(node, ast.IfExp):
        test = _evaluate(node.test, namespace, depth=depth)
        if test:
            return _evaluate(node.body, namespace, depth=depth)
        return _evaluate(node.orelse, namespace, depth=depth)

    if isinstance(node, ast.Compare):
        left = _evaluate(node.left, namespace, depth=depth)
        for cmp_op, comp in zip(node.ops, node.comparators, strict=True):
            right = _evaluate(comp, namespace, depth=depth)
            if isinstance(cmp_op, ast.Lt):
                ok = left < right
            elif isinstance(cmp_op, ast.LtE):
                ok = left <= right
            elif isinstance(cmp_op, ast.Gt):
                ok = left > right
            elif isinstance(cmp_op, ast.GtE):
                ok = left >= right
            elif isinstance(cmp_op, ast.Eq):
                ok = left == right
            elif isinstance(cmp_op, ast.NotEq):
                ok = left != right
            else:
                raise FormulaError(f"compare op {type(cmp_op).__name__} not allowed")
            if not ok:
                return 0.0
            left = right
        return 1.0

    if isinstance(node, ast.BoolOp):
        values = [_evaluate(v, namespace, depth=depth) for v in node.values]
        if isinstance(node.op, ast.And):
            return float(all(values))
        if isinstance(node.op, ast.Or):
            return float(any(values))
        raise FormulaError(f"bool op {type(node.op).__name__} not allowed")

    raise FormulaError(f"node type {type(node).__name__} not allowed")


def _div_by_zero() -> float:
    raise FormulaError("division by zero")
