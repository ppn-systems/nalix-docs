"""A005 - a section about an enum must list that enum's members."""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass, field

from ..findings import Finding, Severity
from ..markdown import code_spans
from .base import AuditContext

_HEADING = re.compile(r"^#{2,4}\s+(.*)$")
_MEMBER_ROW = re.compile(r"^\s*(?:\||[-*]\s)\s*`([A-Za-z_]\w*)`", re.ASCII)
_NON_WORD = re.compile(r"[^\w]", re.ASCII)
_MIN_LISTED_TO_REQUIRE_ALL = 3


@dataclass
class _Section:
    name: str
    line: int
    members: set[str] = field(default_factory=set)


class EnumSectionsMatchSource:
    code = "A005"

    def run(self, ctx: AuditContext) -> Iterable[Finding]:
        index = ctx.index
        for page in ctx.pages:
            sections: list[_Section] = []
            current: _Section | None = None
            for line in page.prose:
                heading = _HEADING.match(line.text)
                if heading:
                    candidates = [*code_spans(heading.group(1)), *heading.group(1).split()]
                    name = next((c for c in (_NON_WORD.sub("", s) for s in candidates) if c in index.enums), None)
                    current = _Section(name, line.number) if name else None
                    if current:
                        sections.append(current)
                    continue
                if current:
                    member = _MEMBER_ROW.match(line.text)
                    if member:
                        current.members.add(member.group(1))

            for section in sections:
                known = {m.split("=")[0].strip() for m in index.enums[section.name]["members"]}
                for member in sorted(section.members):
                    if member not in known and member not in index.identifiers:
                        yield Finding(self.code, Severity.ERROR, page.path, section.line,
                                      f"`{section.name}.{member}` is listed but `{section.name}` has no such member", f"{section.name}.{member}")
                if len(section.members) >= _MIN_LISTED_TO_REQUIRE_ALL:
                    for member in sorted(known - section.members):
                        yield Finding(self.code, Severity.WARN, page.path, section.line,
                                      f"`{section.name}.{member}` exists in the source but the section does not list it", f"{section.name}.{member}")
