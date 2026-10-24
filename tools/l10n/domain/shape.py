"""The structure of a Markdown page: what a translation has to keep while it changes the words."""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field

from docsync.domain.checks.anchors import slugify

_FENCE = re.compile(r"^\s*(`{3,}|~{3,})\s*([^\s`]*)")
_HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
_TABLE_ROW = re.compile(r"^\s*\|.*\|\s*$")
_SEPARATOR = re.compile(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$")
_ADMONITION = re.compile(r"^\s*:::(\w+)")
_CODE_SPAN = re.compile(r"`([^`\n]+)`")
_LINK = re.compile(r"(!?)\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\)")
_HTML_TAG = re.compile(r"<[^>]+>")


@dataclass(frozen=True)
class Heading:
    level: int
    text: str
    slug: str
    line: int


@dataclass(frozen=True)
class CodeBlock:
    language: str
    body: str
    line: int


@dataclass(frozen=True)
class Table:
    rows: int
    columns: int
    line: int


@dataclass(frozen=True)
class Link:
    image: bool
    label: str
    path: str  # the target without its #fragment (external URLs are kept whole)
    fragment: str
    line: int


@dataclass(frozen=True)
class Shape:
    front: dict[str, str]
    headings: tuple[Heading, ...] = ()
    code_blocks: tuple[CodeBlock, ...] = ()
    tables: tuple[Table, ...] = ()
    links: tuple[Link, ...] = ()
    admonitions: tuple[tuple[str, int], ...] = ()
    code_spans: Counter = field(default_factory=Counter)
    prose: str = ""  # the words: no code, no link targets, no tags


def split_front_matter(text: str) -> tuple[dict[str, str], int]:
    """Front matter as plain ``key: value`` pairs, and the number of lines it takes (0 when absent)."""
    lines = text.replace("\r\n", "\n").split("\n")
    if not lines or lines[0].strip() != "---":
        return {}, 0
    front: dict[str, str] = {}
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            return front, index + 1
        key, sep, value = lines[index].partition(":")
        if sep:
            front[key.strip()] = value.strip().strip("\"'")
    return {}, 0


def heading_slugs(headings: tuple[Heading, ...]) -> list[str]:
    return [h.slug for h in headings]


def extract_shape(text: str) -> Shape:
    front, offset = split_front_matter(text)
    lines = text.replace("\r\n", "\n").split("\n")

    headings: list[Heading] = []
    blocks: list[CodeBlock] = []
    tables: list[Table] = []
    links: list[Link] = []
    admonitions: list[tuple[str, int]] = []
    spans: Counter = Counter()
    words: list[str] = []
    seen: dict[str, int] = {}

    fence: tuple[str, int] | None = None
    block_lines: list[str] = []
    block_info, block_start = "", 0
    table_rows, table_cols, table_start = 0, 0, 0

    def close_table() -> None:
        nonlocal table_rows, table_cols
        if table_rows:
            tables.append(Table(table_rows, table_cols, table_start))
        table_rows = table_cols = 0

    for number, raw in enumerate(lines[offset:], start=offset + 1):
        m = _FENCE.match(raw)
        if fence is not None:
            if m and m.group(1)[0] == fence[0] and len(m.group(1)) >= fence[1] and not raw.strip().lstrip("`~"):
                blocks.append(CodeBlock(block_info, "\n".join(block_lines), block_start))
                fence = None
            else:
                block_lines.append(raw)
            continue
        if m:
            close_table()
            fence, block_info, block_start, block_lines = (m.group(1)[0], len(m.group(1))), m.group(2), number, []
            continue

        if _TABLE_ROW.match(raw):
            if not table_rows:
                table_start, table_cols = number, len(re.split(r"(?<!\\)\|", raw.strip().strip("|")))
            if not _SEPARATOR.match(raw):
                table_rows += 1
        else:
            close_table()

        h = _HEADING.match(raw)
        if h:
            slug = slugify(h.group(2))
            count = seen.get(slug, 0)
            seen[slug] = count + 1
            headings.append(Heading(len(h.group(1)), h.group(2), slug if count == 0 else f"{slug}-{count}", number))
        a = _ADMONITION.match(raw)
        if a:
            admonitions.append((a.group(1), number))

        spans.update(_CODE_SPAN.findall(raw))
        bare = _CODE_SPAN.sub(" ", raw)
        for found in _LINK.finditer(bare):
            image, label, target = found.group(1), found.group(2), found.group(3)
            path, _, fragment = target.partition("#")
            if target.startswith(("http:", "https:", "mailto:")):
                path, fragment = target, ""
            links.append(Link(bool(image), label, path, fragment, number))
        if not _SEPARATOR.match(raw):
            words.append(_HTML_TAG.sub(" ", _LINK.sub(r"\2", bare)))
    close_table()

    return Shape(front, tuple(headings), tuple(blocks), tuple(tables), tuple(links), tuple(admonitions), spans, "\n".join(words))
