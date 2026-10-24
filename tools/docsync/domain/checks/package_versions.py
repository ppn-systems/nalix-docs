"""A011 - Nalix package versions shown in the docs cannot be newer than any version the repository knows."""

from __future__ import annotations

import re
from collections.abc import Iterable

from ..findings import Finding, Severity
from .base import AuditContext

_PACKAGE_REFERENCE = re.compile(r'<PackageReference\s+Include="(Nalix\.\w+)"\s+Version="([^"]+)"')
_DOTNET_ADD = re.compile(r"dotnet add (?:\S+ )?package\s+(Nalix\.\w+)\s+(?:--version|-v)\s+(\S+)")


def _numbers(version: str) -> tuple[int, ...]:
    return tuple(int(n) for n in re.findall(r"\d+", version.split("-")[0])[:4])


class PackageVersionsExist:
    code = "A011"

    def run(self, ctx: AuditContext) -> Iterable[Finding]:
        # The samples reference published releases, which can be newer than src/Version.props.
        known = [v for v in (ctx.index.version, *ctx.index.referenced_versions) if v]
        if not known:
            return
        newest = max(known, key=_numbers)
        for page in ctx.pages:
            for line in page.lines:
                for pattern in (_PACKAGE_REFERENCE, _DOTNET_ADD):
                    for package, version in pattern.findall(line.text):
                        if _numbers(version) > _numbers(newest):
                            yield Finding(self.code, Severity.ERROR, page.path, line.number,
                                          f"`{package}` {version} is newer than any version the Nalix repository knows ({newest}: src/Version.props and the samples)", f"{package}:{version}")
