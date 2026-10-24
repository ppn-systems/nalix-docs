"""Contract shared by every audit rule."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Protocol

from ..api_view import ApiIndex
from ..findings import Finding
from ..markdown import Page


@dataclass(frozen=True)
class AuditContext:
    index: ApiIndex
    pages: tuple[Page, ...]


class Check(Protocol):
    """One audit rule. ``code`` identifies the rule family (several codes may share one check)."""

    code: str

    def run(self, ctx: AuditContext) -> Iterable[Finding]: ...
