"""A012 - links to a heading (``page.md#section``) must point at a heading that exists."""

from __future__ import annotations

import posixpath
import re
from collections.abc import Iterable
from difflib import get_close_matches

from ..findings import Finding, Severity
from ..markdown import Page
from .base import AuditContext

_HEADING = re.compile(r"^#{1,6}\s+(.*?)\s*#*\s*$")
_LINK = re.compile(r"\]\(([^)\s]*?)#([^)\s]+)\)")
_MARKDOWN_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_HTML_TAG = re.compile(r"<[^>]+>")
_NOT_SLUG = re.compile(r"[^\w\- ]", re.UNICODE)


def slugify(heading: str) -> str:
    """GitHub-style heading id (what ``rehype-slug`` produces): punctuation dropped, each space a hyphen."""
    text = _MARKDOWN_LINK.sub(r"\1", heading).replace("`", "")
    text = _HTML_TAG.sub("", text)
    return _NOT_SLUG.sub("", text.lower().strip()).replace(" ", "-")


def heading_ids(page: Page) -> set[str]:
    seen: dict[str, int] = {}
    ids: set[str] = set()
    for line in page.prose:
        m = _HEADING.match(line.text)
        if m:
            slug = slugify(m.group(1))
            count = seen.get(slug, 0)
            seen[slug] = count + 1
            ids.add(slug if count == 0 else f"{slug}-{count}")
    return ids


class AnchorsResolve:
    code = "A012"

    def run(self, ctx: AuditContext) -> Iterable[Finding]:
        ids = {page.path: heading_ids(page) for page in ctx.pages}
        for page in ctx.pages:
            for line in page.prose:
                for target, anchor in _LINK.findall(line.text):
                    if target.startswith(("http:", "https:", "mailto:")):
                        continue
                    path = page.path if not target else posixpath.normpath(posixpath.join(posixpath.dirname(page.path), target))
                    if path.endswith("/"):
                        path += "index.md"
                    if path not in ids or anchor in ids[path]:
                        continue  # unknown pages are the link test's business
                    hint = get_close_matches(anchor, ids[path], n=1, cutoff=0.6)
                    suggestion = f"; did you mean `#{hint[0]}`?" if hint else ""
                    yield Finding(self.code, Severity.ERROR, page.path, line.number,
                                  f"`{target}#{anchor}` — `{path}` has no heading with that id{suggestion}", f"{target}#{anchor}")
