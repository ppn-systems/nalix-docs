"""A007 - numeric values listed for enum members must match the source (opcodes, flags: wire formats)."""

from __future__ import annotations

import re
from collections.abc import Iterable

from ..findings import Finding, Severity
from .base import AuditContext

_ROW = re.compile(r"^\|\s*`([A-Za-z_]\w*)`\s*\|\s*`?(0x[0-9A-Fa-f_]+|\d+)`?\s*\|")
_CAPITALIZED = re.compile(r"\b[A-Z][A-Za-z0-9]+\b", re.ASCII)


class EnumValuesMatchSource:
    code = "A007"

    def run(self, ctx: AuditContext) -> Iterable[Finding]:
        index = ctx.index
        valued = {name: entry["values"] for name, entry in index.enums.items() if entry.get("values")}
        for page in ctx.pages:
            current: str | None = None  # the enum most recently named above the table row
            for line in page.prose:
                row = _ROW.match(line.text)
                if not row:
                    named = [n for n in _CAPITALIZED.findall(line.text) if n in valued]
                    current = named[-1] if named else current
                    continue
                member, literal = row.group(1), row.group(2)
                owners = [e for e, values in valued.items() if member in values]
                enum = current if current in owners else (owners[0] if len(owners) == 1 else None)
                if enum is None:
                    continue
                documented = int(literal.replace("_", ""), 0)
                actual = valued[enum][member]
                if documented != actual:
                    shown = f"{actual:#06x}" if literal.lower().startswith("0x") else str(actual)
                    yield Finding(self.code, Severity.ERROR, page.path, line.number,
                                  f"`{enum}.{member}` is `{shown}` in the source but the docs say `{literal}`", f"{enum}.{member}")
