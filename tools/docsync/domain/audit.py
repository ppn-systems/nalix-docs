"""Runs the audit rules over the documentation."""

from __future__ import annotations

from collections.abc import Iterable, Sequence

from .api_view import ApiIndex
from .checks import ALL_CHECKS, AuditContext, Check
from .findings import Finding
from .markdown import DocFile, parse_page


class DocsAuditor:
    def __init__(self, checks: Sequence[Check] = ALL_CHECKS) -> None:
        self._checks = tuple(checks)

    def audit(self, index: ApiIndex, docs: Iterable[DocFile]) -> list[Finding]:
        ctx = AuditContext(index=index, pages=tuple(parse_page(d) for d in docs))
        findings = [f for check in self._checks for f in check.run(ctx)]
        return sorted(findings, key=lambda f: (f.code, f.page, f.line))
