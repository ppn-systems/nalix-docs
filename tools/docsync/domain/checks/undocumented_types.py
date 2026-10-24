"""A010 - public types that no page mentions."""

from __future__ import annotations

import re
from collections.abc import Iterable

from ..findings import Finding, Severity
from .base import AuditContext

_INTERNAL_NAMESPACE = re.compile(r"(^|\.)Internal(\.|$)")


class PublicTypesDocumented:
    code = "A010"

    def run(self, ctx: AuditContext) -> Iterable[Finding]:
        corpus = "\n".join(page.full_text for page in ctx.pages)
        seen: set[str] = set()
        for t in ctx.index.types:
            name = t["name"]
            if name in seen or not t["file"].startswith(("src/", "analyzers/")):
                continue
            if _INTERNAL_NAMESPACE.search(t["namespace"]):
                continue
            if t["file"].startswith("analyzers/") and name.endswith("Model"):
                continue  # source-generator pipeline models
            seen.add(name)
            if not re.search(rf"(?<!\w){re.escape(name)}(?!\w)", corpus, re.ASCII):
                yield Finding(self.code, Severity.GAP, "", 0,
                              f"Public {t['kind']} `{t['namespace']}.{name}` ({t['file']}) is not mentioned in any page", name)
