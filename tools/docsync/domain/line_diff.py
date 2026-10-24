"""Line diff (longest common subsequence) rendered as unified-style hunks."""

from __future__ import annotations

from dataclasses import dataclass

_MAX_CELLS = 25_000_000


@dataclass(frozen=True)
class DiffResult:
    added: int
    removed: int
    text: str
    changed: tuple[str, ...]


def diff_lines(a: list[str], b: list[str], max_cells: int = _MAX_CELLS) -> list[tuple[str, str]] | None:
    """Edit script as ``(op, line)`` pairs where op is ``' '``, ``'-'`` or ``'+'``; None when too large."""
    head = 0
    while head < len(a) and head < len(b) and a[head] == b[head]:
        head += 1
    tail = 0
    while tail < len(a) - head and tail < len(b) - head and a[len(a) - 1 - tail] == b[len(b) - 1 - tail]:
        tail += 1

    x = a[head:len(a) - tail]
    y = b[head:len(b) - tail]
    if len(x) * len(y) > max_cells:
        return None

    width = len(y) + 1
    table = [0] * ((len(x) + 1) * width)
    for i in range(len(x) - 1, -1, -1):
        xi = x[i]
        row = i * width
        below = row + width
        right = 0  # table[row + j + 1]
        for j in range(len(y) - 1, -1, -1):
            if xi == y[j]:
                right = table[below + j + 1] + 1
            else:
                down = table[below + j]
                right = down if down > right else right
            table[row + j] = right

    ops: list[tuple[str, str]] = [(" ", line) for line in a[:head]]
    i = j = 0
    while i < len(x) or j < len(y):
        if i < len(x) and j < len(y) and x[i] == y[j]:
            ops.append((" ", x[i]))
            i += 1
            j += 1
        elif i < len(x) and (j == len(y) or table[(i + 1) * width + j] >= table[i * width + j + 1]):
            ops.append(("-", x[i]))
            i += 1
        else:
            ops.append(("+", y[j]))
            j += 1
    ops.extend((" ", line) for line in a[len(a) - tail:])
    return ops


def to_lines(text: str) -> list[str]:
    """Trailing whitespace trimmed, blank lines dropped."""
    return [line.rstrip() for line in text.split("\n") if line.strip()]


def unified_diff(old_text: str, new_text: str, context: int = 2, max_lines: int = 80) -> DiffResult:
    a, b = to_lines(old_text), to_lines(new_text)
    ops = diff_lines(a, b)
    if ops is None:
        return DiffResult(0, 0, "(change too large to diff inline)", tuple(a + b))

    keep = [False] * len(ops)
    for idx, (op, _) in enumerate(ops):
        if op == " ":
            continue
        for k in range(max(0, idx - context), min(len(ops) - 1, idx + context) + 1):
            keep[k] = True

    lines: list[str] = []
    added = removed = 0
    gap = False
    for idx, (op, line) in enumerate(ops):
        if op == "+":
            added += 1
        elif op == "-":
            removed += 1
        if not keep[idx]:
            gap = bool(lines)
            continue
        if gap:
            lines.append("@@")
        gap = False
        lines.append(f"{op}{line}")
    shown = lines[:max_lines]
    if len(lines) > max_lines:
        shown.append(f"… {len(lines) - max_lines} more line(s)")
    return DiffResult(added, removed, "\n".join(shown), tuple(line for op, line in ops if op != " "))
