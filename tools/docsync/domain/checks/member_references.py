"""A006 - ``Type.Member`` references to Nalix types must exist in the source."""

from __future__ import annotations

import re
from collections.abc import Iterable

from ..findings import Finding, Severity
from ..markdown import code_spans
from .base import AuditContext

_REFERENCE = re.compile(r"(?<![\w.])([A-Z][A-Za-z0-9]+)\.([A-Z][A-Za-z0-9_]*)\b(?!\.(?:cs|md|csproj)\b)", re.ASCII)
_NOT_CSHARP = re.compile(r"^(?:json|bash|sh|text|ini|xml|yaml|yml|mermaid|diff|powershell|cmd)$", re.I)
_PATH_LIKE = re.compile(r"[\\/]|\.(?:cs|md|csproj|ini|json)\b")
#: Members every object has, or generic names the identifier index cannot vouch for.
_COMMON_MEMBERS = frozenset(
    "ToString Equals GetHashCode GetType Dispose Finalize CompareTo MemberwiseClone ReferenceEquals Empty Length Count "
    "Default Zero Max Min Value Values Key Keys Item Current Create Clear Add Remove Close".split()
)
_MIN_VERIFIABLE_LENGTH = 4  # the identifier index only holds names of four or more characters


class MemberReferencesExist:
    code = "A006"

    def run(self, ctx: AuditContext) -> Iterable[Finding]:
        index = ctx.index
        for page in ctx.pages:
            for line in page.lines:
                if line.language and _NOT_CSHARP.match(line.language):
                    continue
                segments = [line.text] if line.is_code else [s for s in code_spans(line.text) if not _PATH_LIKE.search(s)]
                for segment in segments:
                    for m in _REFERENCE.finditer(segment):
                        type_name, member = m.groups()
                        if not index.is_type(type_name) or member in _COMMON_MEMBERS:
                            continue
                        if type_name in index.enums:
                            # Extension methods are written `Enum.Method` in docs, so a name found elsewhere is fine.
                            elsewhere = len(member) >= _MIN_VERIFIABLE_LENGTH and member in index.identifiers and re.search(r"[a-z]", member)
                            if not index.enum_has_member(type_name, member) and not elsewhere:
                                yield Finding(self.code, Severity.ERROR, page.path, line.number,
                                              f"`{type_name}.{member}` is not a member of enum `{type_name}`", f"{type_name}.{member}")
                        elif len(member) >= _MIN_VERIFIABLE_LENGTH and member not in index.identifiers:
                            yield Finding(self.code, Severity.WARN, page.path, line.number,
                                          f"`{type_name}.{member}` — `{member}` does not exist anywhere in the source", f"{type_name}.{member}")
