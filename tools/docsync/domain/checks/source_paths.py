"""A001 - source paths cited by the docs must exist in the Nalix repository."""

from __future__ import annotations

import re
from collections.abc import Iterable

from ..findings import Finding, Severity
from ..markdown import code_spans
from .base import AuditContext

_CITED_PATH = re.compile(r"^((?:src|samples|analyzers)/[^\s*]+?)/?$")
_TRAILING_PUNCTUATION = re.compile(r"[.,;:)]+$")


class SourcePathsExist:
    code = "A001"

    def run(self, ctx: AuditContext) -> Iterable[Finding]:
        for page in ctx.pages:
            for line in page.prose:
                for span in code_spans(line.text):
                    m = _CITED_PATH.match(span)
                    if not m:
                        continue
                    path = _TRAILING_PUNCTUATION.sub("", m.group(1))
                    if path.startswith("analyzers/dotnet/"):
                        continue  # a path inside the NuGet package, not in the repository
                    if not ctx.index.has_path(path):
                        yield Finding(self.code, Severity.ERROR, page.path, line.number, f"Source path does not exist: `{path}`", path)
