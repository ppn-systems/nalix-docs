"""A008 - ``NALIXnnn`` diagnostics: ids, severities, titles and counts must match the analyzers."""

from __future__ import annotations

import re
from collections import Counter
from collections.abc import Iterable
from difflib import SequenceMatcher

from ..findings import Finding, Severity
from .base import AuditContext

_ROW = re.compile(r"^\|\s*`(NALIX\d+)`\s*\|\s*(.*?)\s*\|\s*(Error|Warning|Info|Hidden)\s*\|")
_TOTAL_CLAIM = re.compile(r"(\d+)\s+(?:active\s+)?(?:compile-time\s+)?diagnostic descriptors", re.I)
_PROJECT_CLAIM = re.compile(r"(\d+)\s+rules?\s+in\s+`analyzers/([^/`]+)/")
_CATALOGUE_MIN_ROWS = 20
_TITLE_SIMILARITY = 0.85


def _words(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


class DiagnosticCodesMatchSource:
    code = "A008"

    def run(self, ctx: AuditContext) -> Iterable[Finding]:
        source = ctx.index.diagnostics
        if not source:
            return
        for page in ctx.pages:
            documented: dict[str, int] = {}
            for line in page.prose:
                row = _ROW.match(line.text)
                if not row:
                    continue
                code, title, severity = row.groups()
                documented[code] = line.number
                actual = source.get(code)
                if actual is None:
                    yield Finding(self.code, Severity.ERROR, page.path, line.number, f"`{code}` is documented but no analyzer or generator declares it", code)
                    continue
                if actual["severity"] != severity:
                    yield Finding(self.code, Severity.ERROR, page.path, line.number,
                                  f"`{code}` is {actual['severity']} in the source but the docs say {severity}", f"{code}:severity")
                plain = title.replace("`", "")
                if _words(plain) != _words(actual["title"]) and SequenceMatcher(None, _words(plain), _words(actual["title"])).ratio() < _TITLE_SIMILARITY:
                    yield Finding(self.code, Severity.WARN, page.path, line.number,
                                  f"`{code}` is titled \"{actual['title']}\" in the source; the docs say \"{plain}\"", f"{code}:title")

            if len(documented) >= _CATALOGUE_MIN_ROWS:  # this page is the catalogue: it must list everything
                for code in sorted(set(source) - set(documented)):
                    yield Finding(self.code, Severity.ERROR, page.path, 0, f"`{code}` (\"{source[code]['title']}\") is declared in the source but missing from the catalogue", f"{code}:missing")
                yield from self._counts(page, source)

    def _counts(self, page, source) -> Iterable[Finding]:
        per_project = Counter(d["project"] for d in source.values())
        for line in page.prose:
            total = _TOTAL_CLAIM.search(line.text)
            if total and int(total.group(1)) != len(source):
                yield Finding(self.code, Severity.ERROR, page.path, line.number,
                              f"the page says {total.group(1)} diagnostic descriptors but the source declares {len(source)}", "count:total")
            for count, project in _PROJECT_CLAIM.findall(line.text):
                if project in per_project and int(count) != per_project[project]:
                    yield Finding(self.code, Severity.ERROR, page.path, line.number,
                                  f"the page says {count} rules in `{project}` but the source declares {per_project[project]}", f"count:{project}")
