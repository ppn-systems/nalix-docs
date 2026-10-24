"""The slice of Markdown the audit needs: lines tagged prose/code, tables and inline code spans."""

from __future__ import annotations

import functools
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class DocFile:
    """A documentation page as read from disk (``path`` relative to the locale folder)."""

    path: str
    text: str


@dataclass(frozen=True)
class Line:
    number: int  # 1-based line number in the original file
    text: str
    is_code: bool
    language: str = ""


@dataclass(frozen=True)
class Page:
    path: str
    lines: tuple[Line, ...]

    @property
    def prose(self) -> list[Line]:
        return [line for line in self.lines if not line.is_code]

    @property
    def prose_text(self) -> str:
        return "\n".join(line.text for line in self.prose)

    @property
    def full_text(self) -> str:
        return "\n".join(line.text for line in self.lines)


@dataclass(frozen=True)
class TableRow:
    number: int
    cells: tuple[str, ...]


@dataclass(frozen=True)
class Table:
    header: tuple[str, ...]
    rows: tuple[TableRow, ...]


_FENCE = re.compile(r"^\s*(`{3,}|~{3,})(.*)$")
_TABLE_ROW = re.compile(r"^\s*\|.*\|\s*$")
_SEPARATOR_CELL = re.compile(r"^:?-{2,}:?$")
_CODE_SPAN = re.compile(r"`([^`\n]+)`")
_IDENTIFIER_CELL = re.compile(r"^`([A-Za-z_]\w*)(?:\(\))?`$", re.ASCII)


@functools.lru_cache(maxsize=4096)
def kebab(name: str) -> str:
    """``ConnectionGuardOptions`` -> ``connection-guard-options``."""
    name = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", name)
    return re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1-\2", name).lower()


def parse_page(doc: DocFile) -> Page:
    raw = doc.text.replace("\r\n", "\n").split("\n")
    start = 0
    if raw and raw[0] == "---":
        try:
            start = raw.index("---", 1) + 1
        except ValueError:
            start = 0
    lines: list[Line] = []
    fence: tuple[str, int, str] | None = None
    for number, text in enumerate(raw[start:], start=start + 1):
        m = _FENCE.match(text)
        if m:
            marker, info = m.group(1), m.group(2).strip()
            if fence is None:
                fence = (marker[0], len(marker), info)
            elif marker[0] == fence[0] and len(marker) >= fence[1] and not info:
                fence = None
            lines.append(Line(number, text, True))
            continue
        lines.append(Line(number, text, fence is not None, fence[2] if fence else ""))
    return Page(doc.path, tuple(lines))


def _split_row(text: str) -> list[str]:
    inner = re.sub(r"^\||\|$", "", text.strip())
    return [cell.strip() for cell in re.split(r"(?<!\\)\|", inner)]


def parse_tables(page: Page) -> list[Table]:
    tables: list[Table] = []
    header: list[str] | None = None
    separator = False
    rows: list[TableRow] = []

    def close() -> None:
        nonlocal header, separator, rows
        if header is not None and rows:
            tables.append(Table(tuple(header), tuple(rows)))
        header, separator, rows = None, False, []

    for line in page.lines:
        if line.is_code or not _TABLE_ROW.match(line.text):
            close()
            continue
        cells = _split_row(line.text)
        if header is None:
            header = cells
        elif not separator and all(_SEPARATOR_CELL.match(c) for c in cells):
            separator = True
        else:
            rows.append(TableRow(line.number, tuple(cells)))
    close()
    return tables


def code_spans(text: str) -> list[str]:
    return _CODE_SPAN.findall(text)


def identifier_cell(cell: str) -> str | None:
    """The identifier a table cell consists of (`` `Name` `` or `` `Name()` ``), if any."""
    m = _IDENTIFIER_CELL.match(cell)
    return m.group(1) if m else None
