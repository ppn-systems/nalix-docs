"""Reading default values: from C# initializers and from the way docs write them."""

from __future__ import annotations

import re
from dataclasses import dataclass

_UNIT_SECONDS = {
    "ms": 0.001, "millisecond": 0.001, "milliseconds": 0.001,
    "s": 1, "sec": 1, "second": 1, "seconds": 1,
    "m": 60, "min": 60, "minute": 60, "minutes": 60,
    "h": 3600, "hour": 3600, "hours": 3600,
    "d": 86400, "day": 86400, "days": 86400,
}
_CAST = re.compile(r"^\((?:int|long|uint|ulong|ushort|byte|double|float)\)")
_NUMBER_LITERAL = re.compile(r"^-?\d[\d_]*(?:\.\d+)?[uUlLfFdDmM]*$")
_NUMBER_SUFFIX = re.compile(r"[uUlLfFdDmM]+$")
_HEX_LITERAL = re.compile(r"^0[xX][0-9a-fA-F_]+")
_STRING_LITERAL = re.compile(r'^"(?:[^"\\]|\\.)*"$')
_TIMESPAN_FROM = re.compile(r"^(?:System\.)?TimeSpan\.From(Milliseconds|Seconds|Minutes|Hours|Days)\(\s*(-?[\d_.]+)\s*\)$")
_TIMESPAN_ZERO = re.compile(r"^(?:System\.)?TimeSpan\.Zero$")
_TIMESPAN_TICKS = re.compile(r"^(?:System\.)?TimeSpan\.FromTicks\(\s*(\d+)\s*\)$")


@dataclass(frozen=True)
class Literal:
    kind: str  # 'bool' | 'number' | 'string' | 'time' (seconds)
    value: object


def _number(text: str) -> float:
    return float(text.replace("_", "").replace(",", ""))


def parse_source_default(raw: str | None) -> Literal | None:
    """The initializer as a comparable literal, or None when it is not a plain literal."""
    if raw is None:
        return None
    value = _CAST.sub("", raw.strip())
    if value in ("true", "false"):
        return Literal("bool", value == "true")
    if _NUMBER_LITERAL.match(value):
        return Literal("number", _number(_NUMBER_SUFFIX.sub("", value)))
    if _HEX_LITERAL.match(value):
        return Literal("number", float(int(value.replace("_", ""), 16)))
    if _STRING_LITERAL.match(value):
        return Literal("string", value[1:-1])
    m = _TIMESPAN_FROM.match(value)
    if m:
        return Literal("time", _number(m.group(2)) * _UNIT_SECONDS[m.group(1).lower()])
    if _TIMESPAN_ZERO.match(value):
        return Literal("time", 0.0)
    m = _TIMESPAN_TICKS.match(value)
    if m:
        return Literal("time", int(m.group(1)) / 1e7)
    return None


def doc_default_values(cell: str, kind: str) -> list[object]:
    """Every value a docs default cell could mean for the given kind."""
    text = cell.replace("`", "").replace("$\\rightarrow$", " ")
    out: list[object] = []
    if kind == "bool":
        out += [m.group(1).lower() == "true" for m in re.finditer(r"\b(true|false)\b", text, re.I)]
    elif kind == "number":
        out += [_number(m.group()) for m in re.finditer(r"(?<![\w.:])-?\d[\d_,]*(?:\.\d+)?(?![\w:])", text, re.ASCII)]
    elif kind == "time":
        for m in re.finditer(r"(?:(\d+)\.)?(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?", text):
            days, hours, minutes, seconds, fraction = m.groups()
            out.append(int(days or 0) * 86400 + int(hours) * 3600 + int(minutes) * 60 + int(seconds) + (float(f"0.{fraction}") if fraction else 0))
        for m in re.finditer(r"(\d+(?:\.\d+)?)\s*(ms|milliseconds?|seconds?|sec|minutes?|min|hours?|days?|[smhd])\b", text, re.I):
            out.append(float(m.group(1)) * _UNIT_SECONDS[m.group(2).lower()])
        if re.search(r"\b(zero|none|disabled)\b", text, re.I):
            out.append(0.0)
    elif kind == "string":
        out.append(re.sub(r'^"|"$', "", text).strip())
    return out


def matches(literal: Literal, values: list[object]) -> bool:
    """Does any documented value equal the source literal?"""
    for v in values:
        if isinstance(literal.value, float) and isinstance(v, (int, float)) and not isinstance(v, bool):
            if abs(float(v) - literal.value) < 1e-9:
                return True
        elif v == literal.value:
            return True
    return False
