"""A002 - ``**Namespace:**`` / ``**Assembly:**`` headers must agree with the source."""

from __future__ import annotations

import posixpath
import re
from collections.abc import Iterable

from ..findings import Finding, Severity
from ..markdown import kebab
from .base import AuditContext

_FIRST_CODE_SPAN = re.compile(r"`([^`]+)`")


def _join(values: Iterable[str]) -> str:
    return ", ".join(f"`{v}`" for v in dict.fromkeys(values))


class NamespaceMatchesSource:
    code = "A002"

    def run(self, ctx: AuditContext) -> Iterable[Finding]:
        index = ctx.index
        for page in ctx.pages:
            prose = page.prose
            ns_line = next((l for l in prose if l.text.startswith("**Namespace:**")), None)
            if ns_line is None:
                continue
            first = _FIRST_CODE_SPAN.search(ns_line.text)
            namespace = first.group(1) if first else None
            asm_line = next((l for l in prose if l.text.startswith("**Assembly:**")), None)
            asm_match = _FIRST_CODE_SPAN.search(asm_line.text) if asm_line else None
            assembly = asm_match.group(1) if asm_match else None

            if namespace and namespace not in index.namespaces:
                yield Finding(self.code, Severity.ERROR, page.path, ns_line.number, f"Namespace `{namespace}` has no public type in the source", namespace)

            # Only a page dedicated to one type (file name == type name) can contradict its namespace/assembly.
            base = posixpath.basename(page.path)[:-3]
            text = page.prose_text
            declared = [t for t in [*index.types, *index.internal_types] if kebab(t["name"]) == base and text.count(f"`{t['name']}`") >= 2]
            if not declared:
                continue
            name = declared[0]["name"]
            if namespace and not any(d["namespace"] == namespace for d in declared):
                yield Finding(self.code, Severity.ERROR, page.path, ns_line.number,
                              f"`{name}` is declared in {_join(d['namespace'] for d in declared)}, not `{namespace}`", f"{name}:{namespace}")
            if assembly and not any(d["file"].split("/")[1] == assembly for d in declared):
                yield Finding(self.code, Severity.ERROR, page.path, ns_line.number,
                              f"`{name}` lives in assembly {_join(d['file'].split('/')[1] for d in declared)}, not `{assembly}`", f"{name}:{assembly}")
