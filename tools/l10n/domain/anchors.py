"""Heading ids differ between languages, so a ``page.md#section`` link must follow the translated heading."""

from __future__ import annotations

import posixpath
import re
from collections.abc import Callable

from .shape import Shape

_FRAGMENT_LINK = re.compile(r"\]\(([^)\s#]*)#([^)\s]+)\)")
_FENCE = re.compile(r"^\s*(`{3,}|~{3,})")
_EXTERNAL = ("http:", "https:", "mailto:")


def target_page(page: str, link_path: str) -> str:
    """The page (relative to the locale folder) a link leads to; ``page`` itself for ``#fragment`` links."""
    if not link_path:
        return page
    path = posixpath.normpath(posixpath.join(posixpath.dirname(page), link_path))
    return path + "index.md" if path.endswith("/") else path


def rewrite_fragments(page: str, text: str, translate: Callable[[str, str], str]) -> str:
    """Replaces ``translate(target_page, fragment)`` in every internal link outside code blocks."""
    out: list[str] = []
    fence: str | None = None
    for line in text.split("\n"):
        m = _FENCE.match(line)
        if m:
            marker = m.group(1)[0]
            fence = None if fence == marker else (fence or marker)
            out.append(line)
            continue
        if fence:
            out.append(line)
            continue

        def swap(found: re.Match) -> str:
            link_path, fragment = found.group(1), found.group(2)
            if link_path.startswith(_EXTERNAL):
                return found.group(0)
            return f"]({link_path}#{translate(target_page(page, link_path), fragment)})"

        out.append(_FRAGMENT_LINK.sub(swap, line))
    return "\n".join(out)


def translated_fragment(fragment: str, source: Shape, target: Shape) -> str:
    """The id of the heading in ``target`` that corresponds to the heading ``fragment`` names in ``source``."""
    for index, heading in enumerate(source.headings):
        if heading.slug == fragment and len(source.headings) == len(target.headings):
            return target.headings[index].slug
    return fragment
