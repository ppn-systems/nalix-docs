"""A003 / A004 - options tables must list the properties and defaults of the Options class."""

from __future__ import annotations

import posixpath
import re
from collections.abc import Iterable

from ..defaults import doc_default_values, matches, parse_source_default
from ..findings import Finding, Severity
from ..markdown import Page, code_spans, identifier_cell, kebab, parse_tables
from .base import AuditContext

_TABLE_KEYS = {"property", "option", "name", "setting", "key", "parameter"}
_TYPE_LIKE = re.compile(r"\b[A-Z][A-Za-z0-9]{3,}\b", re.ASCII)
_LEADING_IDENTIFIER = re.compile(r"^([A-Za-z_]\w*)", re.ASCII)
_OWNER_WINDOW = 40


def _owners(props: dict[str, dict]) -> str:
    return ", ".join(f"`{o}`" for o in dict.fromkeys(p["owner"] for p in props.values()))


class OptionsTablesMatchSource:
    code = "A003"  # also reports A004

    def run(self, ctx: AuditContext) -> Iterable[Finding]:
        for page in ctx.pages:
            yield from self._page(ctx, page)

    def _page(self, ctx: AuditContext, page: Page) -> Iterable[Finding]:
        index = ctx.index
        mentioned = list(dict.fromkeys(
            m.group(1)
            for span in code_spans(page.prose_text)
            if (m := _LEADING_IDENTIFIER.match(span)) and m.group(1) in index.options
        ))
        if not mentioned:
            return
        base = posixpath.basename(page.path)[:-3]
        dedicated = next((n for n in mentioned if kebab(n) == base), None)
        props: dict[str, dict] = {}
        for owner in mentioned:
            for prop in index.options[owner]["properties"]:
                props[prop["name"]] = {**prop, "owner": owner}

        seen: set[str] = set()
        for table in parse_tables(page):
            if table.header[0].replace("`", "").lower() not in _TABLE_KEYS:
                continue

            scope = props
            if not dedicated:
                owner = self._owner_above(ctx, page, table.rows[0].number)
                if owner and owner not in index.options:
                    continue  # the table is about another type (e.g. an attribute sharing property names)
                if owner and any(p["owner"] == owner for p in props.values()):
                    scope = {k: p for k, p in props.items() if p["owner"] == owner}

            default_col = next((i for i, h in enumerate(table.header) if "default" in h.lower()), -1)
            for row in table.rows:
                name = identifier_cell(row.cells[0] if row.cells else "")
                if not name:
                    continue
                if name in scope:
                    seen.add(name)
                    prop = scope[name]
                    literal = parse_source_default(prop.get("default"))
                    if literal and 0 <= default_col < len(row.cells):
                        values = doc_default_values(row.cells[default_col], literal.kind)
                        if values and not matches(literal, values):
                            yield Finding("A004", Severity.ERROR, page.path, row.number,
                                          f"`{prop['owner']}.{name}` default is `{prop['default']}` in the source but the docs say {row.cells[default_col]}", name)
                elif name not in index.identifiers:
                    yield Finding("A003", Severity.ERROR, page.path, row.number,
                                  f"`{name}` is documented as an option but does not exist in {_owners(scope)}", name)

        if dedicated and seen:
            for prop in index.options[dedicated]["properties"]:
                if prop["name"] not in seen:
                    yield Finding("A003", Severity.ERROR, page.path, 0,
                                  f"`{dedicated}.{prop['name']}` ({prop.get('type', 'undefined')}) exists in the source but is missing from the options table", prop["name"])

    @staticmethod
    def _owner_above(ctx: AuditContext, page: Page, first_row_number: int) -> str | None:
        """Nearest known type named in the lines above the table."""
        lines = page.lines
        start = next((i for i, l in enumerate(lines) if l.number == first_row_number), 0)
        for i in range(start - 1, max(0, start - _OWNER_WINDOW) - 1, -1):
            for name in reversed(_TYPE_LIKE.findall(lines[i].text)):
                if ctx.index.is_type(name) or name in ctx.index.options:
                    return name
        return None
