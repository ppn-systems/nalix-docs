"""Line diff (longest common subsequence) rendered as unified-style hunks with line numbers."""

from __future__ import annotations

from dataclasses import dataclass

_MAX_CELLS = 25_000_000


@dataclass(frozen=True)
class DiffResult:
    added: int
    removed: int
    text: str
    changed: tuple[str, ...]
    first_new_line: int = 0  # line in the new text where the first hunk starts
    removed_lines: tuple[str, ...] = ()  # the lines that disappeared (what the docs may still describe)


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


def numbered_lines(text: str) -> list[tuple[str, int]]:
    """Non-blank lines with trailing whitespace trimmed, each with its 1-based line number."""
    return [(line.rstrip(), number) for number, line in enumerate(text.split("\n"), start=1) if line.strip()]


def to_lines(text: str) -> list[str]:
    return [line for line, _ in numbered_lines(text)]


def unified_diff(old_text: str, new_text: str, context: int = 2, max_lines: int = 80) -> DiffResult:
    """Hunks start with ``@@ -<old line> +<new line> @@`` so a reader can jump to the change."""
    old, new = numbered_lines(old_text), numbered_lines(new_text)
    ops = diff_lines([t for t, _ in old], [t for t, _ in new])
    if ops is None:
        return DiffResult(0, 0, "(change too large to diff inline)", tuple(t for t, _ in old + new))

    # Original line numbers for every op ('+' lines point at the old line that follows them, and vice versa).
    old_no: list[int] = []
    new_no: list[int] = []
    ia = ib = 0
    for op, _ in ops:
        old_no.append(old[ia][1] if ia < len(old) else (old[-1][1] + 1 if old else 1))
        new_no.append(new[ib][1] if ib < len(new) else (new[-1][1] + 1 if new else 1))
        if op != "+":
            ia += 1
        if op != "-":
            ib += 1

    keep = [False] * len(ops)
    for idx, (op, _) in enumerate(ops):
        if op == " ":
            continue
        for k in range(max(0, idx - context), min(len(ops) - 1, idx + context) + 1):
            keep[k] = True

    lines: list[str] = []
    added = removed = 0
    first_new = 0
    in_hunk = False
    for idx, (op, line) in enumerate(ops):
        if op == "+":
            added += 1
        elif op == "-":
            removed += 1
        if not keep[idx]:
            in_hunk = False
            continue
        if not in_hunk:
            lines.append(f"@@ -{old_no[idx]} +{new_no[idx]} @@")
            first_new = first_new or new_no[idx]
            in_hunk = True
        lines.append(f"{op}{line}")
    shown = lines[:max_lines]
    if len(lines) > max_lines:
        shown.append(f"… {len(lines) - max_lines} more line(s)")
    return DiffResult(
        added, removed, "\n".join(shown), tuple(line for op, line in ops if op != " "), first_new,
        tuple(line for op, line in ops if op == "-"),
    )
