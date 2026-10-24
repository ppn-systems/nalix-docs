"""Compares a translation with its English source and reports where the structure differs."""

from __future__ import annotations

from collections import Counter

from .code import comparable
from .findings import Issue, Severity
from .shape import Shape, is_plain_yaml_scalar
from .untranslated import english_ratio, looks_untranslated

#: Front-matter keys a translation is expected to translate; every other key must be copied as is.
TRANSLATED_KEYS = frozenset({"title", "description"})
_SHOWN = 4


def compare(page: str, source: Shape, target: Shape) -> list[Issue]:
    issues: list[Issue] = []

    def error(code: str, line: int, message: str) -> None:
        issues.append(Issue(code, Severity.ERROR, page, line, message))

    _front_matter(source, target, error)
    _headings(source, target, error)
    _code_blocks(source, target, error)
    _tables(source, target, error)
    _links(source, target, error)
    _admonitions(source, target, error)
    _code_spans(source, target, error)
    if looks_untranslated(target.prose):
        ratio, count = english_ratio(target.prose)
        error("L008", 0, f"still reads as English ({ratio:.0%} English function words in {count} words); translate the prose")
    return issues


def _front_matter(source: Shape, target: Shape, error) -> None:
    for key in source.front.keys() - target.front.keys():
        error("L001", 1, f"front matter is missing `{key}`")
    for key in target.front.keys() - source.front.keys():
        error("L001", 1, f"front matter has `{key}`, which the English page does not")
    for key, value in source.front.items():
        if key not in TRANSLATED_KEYS and key in target.front and target.front[key] != value:
            error("L001", 1, f"front matter `{key}` must stay `{value}` (found `{target.front[key]}`)")
    for key in TRANSLATED_KEYS & source.front.keys() & target.front.keys():
        if not target.front[key].strip():
            error("L001", 1, f"front matter `{key}` is empty")
    for key, value in target.front_raw.items():
        if not is_plain_yaml_scalar(value):
            error("L001", 1, f"front matter `{key}` is not valid YAML as written; wrap the value in double quotes (it contains `: ` or starts with a special character)")


def _headings(source: Shape, target: Shape, error) -> None:
    src, dst = [h.level for h in source.headings], [h.level for h in target.headings]
    if src == dst:
        return
    if len(src) != len(dst):
        error("L002", 0, f"{len(dst)} headings, the English page has {len(src)}")
        return
    index = next(i for i, (a, b) in enumerate(zip(src, dst)) if a != b)
    error("L002", target.headings[index].line, f"heading {index + 1} is level {dst[index]}, the English one is level {src[index]}")


def _code_blocks(source: Shape, target: Shape, error) -> None:
    if len(source.code_blocks) != len(target.code_blocks):
        error("L003", 0, f"{len(target.code_blocks)} code blocks, the English page has {len(source.code_blocks)}")
        return
    for number, (a, b) in enumerate(zip(source.code_blocks, target.code_blocks), start=1):
        if a.language != b.language:
            error("L003", b.line, f"code block {number} is tagged `{b.language}`, the English one `{a.language}`")
        elif comparable(a.language, a.body) != comparable(b.language, b.body):
            error("L003", b.line, f"code block {number} differs from the English one (only comments may be translated, and only in C#)")


def _tables(source: Shape, target: Shape, error) -> None:
    src = [(t.rows, t.columns) for t in source.tables]
    dst = [(t.rows, t.columns) for t in target.tables]
    if src == dst:
        return
    if len(src) != len(dst):
        error("L004", 0, f"{len(dst)} tables, the English page has {len(src)}")
        return
    index = next(i for i, (a, b) in enumerate(zip(src, dst)) if a != b)
    error("L004", target.tables[index].line, f"table {index + 1} is {dst[index][0]}x{dst[index][1]} (rows x columns), the English one {src[index][0]}x{src[index][1]}")


def _links(source: Shape, target: Shape, error) -> None:
    src = [(l.image, l.path, bool(l.fragment)) for l in source.links]
    dst = [(l.image, l.path, bool(l.fragment)) for l in target.links]
    if src == dst:
        return
    if len(src) != len(dst):
        error("L005", 0, f"{len(dst)} links, the English page has {len(src)}")
        return
    index = next(i for i, (a, b) in enumerate(zip(src, dst)) if a != b)
    error("L005", target.links[index].line, f"link {index + 1} goes to `{dst[index][1]}`, the English one to `{src[index][1]}`")


def _admonitions(source: Shape, target: Shape, error) -> None:
    src, dst = [a for a, _ in source.admonitions], [a for a, _ in target.admonitions]
    if src != dst:
        error("L006", target.admonitions[0][1] if target.admonitions else 0, f"callouts {dst}, the English page has {src}")


def _code_spans(source: Shape, target: Shape, error) -> None:
    missing = source.code_spans - target.code_spans
    extra = target.code_spans - source.code_spans
    if not missing and not extra:
        return
    parts = []
    if missing:
        parts.append("missing " + ", ".join(f"`{s}`" for s in _first(missing)))
    if extra:
        parts.append("unexpected " + ", ".join(f"`{s}`" for s in _first(extra)))
    error("L007", 0, "text in backticks must be copied unchanged: " + "; ".join(parts))


def _first(counter: Counter) -> list[str]:
    items = list(counter.elements())
    return items[:_SHOWN] + (["…"] if len(items) > _SHOWN else [])
