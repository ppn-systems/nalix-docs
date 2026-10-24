"""Numbers keep the English page's notation (``65,536``, ``12.5``): ``65.536`` and ``12,5`` read differently to developers."""

from __future__ import annotations

import re

from .shape import NUMBER, Shape

_FENCE = re.compile(r"^\s*(`{3,}|~{3,})")
_CODE_SPAN = re.compile(r"(`[^`\n]+`)")


def _digits(number: str) -> str:
    return re.sub(r"\D", "", number)


def restore_notation(text: str, source: Shape, target: Shape) -> str:
    """Rewrites numbers of ``text`` that differ from the English one only in separators; code is left alone."""
    wanted = source.numbers - target.numbers
    written = target.numbers - source.numbers
    swaps: dict[str, str] = {}
    for number in written:
        match = next((w for w in wanted if _digits(w) == _digits(number) and w != number), None)
        if match:
            swaps[number] = match
    if not swaps:
        return text

    def fix(segment: str) -> str:
        return NUMBER.sub(lambda m: swaps.get(m.group(0), m.group(0)), segment)

    out: list[str] = []
    fence = None
    started = False
    front = 0
    for line in text.split("\n"):
        if not started and front < 2 and line.strip() == "---":
            front += 1
            out.append(line)
            started = front == 2
            continue
        if front == 1:  # inside the front matter: left as it is
            out.append(line)
            continue
        m = _FENCE.match(line)
        if m:
            fence = None if fence == m.group(1)[0] else (fence or m.group(1)[0])
            out.append(line)
            continue
        if fence:
            out.append(line)
            continue
        parts = _CODE_SPAN.split(line)
        out.append("".join(part if part.startswith("`") else fix(part) for part in parts))
    return "\n".join(out)
