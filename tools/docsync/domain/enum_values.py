"""Numeric values of C# enum members (wire formats depend on them)."""

from __future__ import annotations

import ast
import re

_CAST = re.compile(r"\(\s*(?:byte|sbyte|short|ushort|int|uint|long|ulong)\s*\)")
_LITERAL_SUFFIX = re.compile(r"(\b(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*))[uUlL]+\b")
_MEMBER = re.compile(r"^([A-Za-z_]\w*)\s*(?:=\s*(.+))?$", re.S)
_ALLOWED = (
    ast.Expression, ast.BinOp, ast.UnaryOp, ast.Constant, ast.Name, ast.Load,
    ast.BitOr, ast.BitAnd, ast.BitXor, ast.LShift, ast.RShift, ast.Add, ast.Sub, ast.Mult,
    ast.Invert, ast.USub, ast.UAdd,
)


def evaluate(expression: str, known: dict[str, int]) -> int | None:
    """Value of a constant expression over integers and earlier members; None when it is anything else."""
    text = _LITERAL_SUFFIX.sub(r"\1", _CAST.sub("", expression)).strip()
    try:
        tree = ast.parse(text, mode="eval")
    except SyntaxError:
        return None

    def walk(node: ast.AST) -> int | None:
        if not isinstance(node, _ALLOWED):
            return None
        if isinstance(node, ast.Expression):
            return walk(node.body)
        if isinstance(node, ast.Constant):
            return node.value if isinstance(node.value, int) and not isinstance(node.value, bool) else None
        if isinstance(node, ast.Name):
            return known.get(node.id)
        if isinstance(node, ast.UnaryOp):
            operand = walk(node.operand)
            if operand is None:
                return None
            return {ast.Invert: ~operand, ast.USub: -operand, ast.UAdd: operand}[type(node.op)]
        left, right = walk(node.left), walk(node.right)
        if left is None or right is None:
            return None
        op = type(node.op)
        if op in (ast.LShift, ast.RShift) and not 0 <= right <= 64:
            return None
        return {
            ast.BitOr: lambda: left | right, ast.BitAnd: lambda: left & right, ast.BitXor: lambda: left ^ right,
            ast.LShift: lambda: left << right, ast.RShift: lambda: left >> right,
            ast.Add: lambda: left + right, ast.Sub: lambda: left - right, ast.Mult: lambda: left * right,
        }[op]()

    return walk(tree)


def enum_values(member_lines: list[str]) -> dict[str, int]:
    """``['A = 1', 'B', 'C = A | 4']`` -> ``{'A': 1, 'B': 2, 'C': 5}`` (members that cannot be evaluated are left out)."""
    values: dict[str, int] = {}
    next_value: int | None = 0
    for line in member_lines:
        m = _MEMBER.match(line)
        if not m:
            next_value = None
            continue
        name, expression = m.groups()
        value = evaluate(expression, values) if expression else next_value
        if value is not None:
            values[name] = value
        next_value = value + 1 if value is not None else None
    return values
