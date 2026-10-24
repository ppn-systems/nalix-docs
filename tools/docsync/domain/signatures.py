"""Callable signatures reduced to what callers see: name, generic arity and parameter types.

Used to compare a signature written in the docs with the overloads declared in the source, so
modifiers, attributes, parameter names, default values and namespace qualifiers do not matter.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_ATTRIBUTE = re.compile(r"\[\s*(?=[A-Za-z_])[^\[\]]*(?:\[[^\]]*\][^\[\]]*)*\]\s*")
_MODIFIERS = r"(?:(?:public|protected|internal|static|virtual|override|abstract|sealed|async|extern|unsafe|new|partial|readonly)\s+)*"
_HEAD = re.compile(
    rf"^\s*{_MODIFIERS}((?:[\w.]+(?:<[^()]*?>)?(?:\[[,]*\])?\??))\s+([A-Za-z_]\w*)\s*(<[^()]*?>)?\s*\(",
    re.ASCII,
)
_PARAM_MODIFIER = re.compile(r"^(?:this|params|in|ref|out|scoped|readonly)\s+")
_DEFAULT = re.compile(r"\s*=\s*.*$")
_QUALIFIER = re.compile(r"\b(?:[A-Za-z_]\w*\.)+(?=[A-Za-z_])")


@dataclass(frozen=True)
class CallSignature:
    name: str
    arity: int
    params: tuple[str, ...]

    @property
    def key(self) -> tuple[int, tuple[str, ...]]:
        return self.arity, self.params


def _split_top_level(text: str) -> list[str]:
    parts: list[str] = []
    depth = 0
    current: list[str] = []
    for ch in text:
        if ch in "(<[{":
            depth += 1
        elif ch in ")>]}":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(ch)
    if "".join(current).strip():
        parts.append("".join(current).strip())
    return parts


def _param_type(param: str) -> str:
    param = _DEFAULT.sub("", param).strip()
    while True:
        stripped = _PARAM_MODIFIER.sub("", param)
        if stripped == param:
            break
        param = stripped
    m = re.match(r"(.*\S)\s+\w+$", param)
    type_text = m.group(1) if m else param
    return re.sub(r"\s+", "", _QUALIFIER.sub("", type_text).replace("?", ""))


def parse_signature(text: str) -> CallSignature | None:
    """``public static Task<int> Run<T>(this X x, int n = 1)`` -> ``CallSignature('Run', 1, ('X', 'int'))``."""
    flat = re.sub(r"\s+", " ", _ATTRIBUTE.sub("", text)).strip()
    head = _HEAD.match(flat)
    if not head:
        return None
    start = head.end()
    depth, end = 1, start
    while end < len(flat) and depth:
        depth += {"(": 1, ")": -1}.get(flat[end], 0)
        end += 1
    if depth:
        return None
    arity = len(_split_top_level(head.group(3)[1:-1])) if head.group(3) else 0
    return CallSignature(head.group(2), arity, tuple(_param_type(p) for p in _split_top_level(flat[start:end - 1])))
