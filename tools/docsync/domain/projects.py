"""Project references and the version, read from ``.csproj`` / ``Version.props``."""

from __future__ import annotations

import posixpath
import re

_PROJECT_REFERENCE = re.compile(r'<ProjectReference\s+Include="([^"]+)"', re.I)
_VERSION = re.compile(r"<Version>\s*([0-9][^<\s]*)\s*</Version>", re.I)


def parse_references(csproj_text: str) -> list[str]:
    """Names of the projects a ``.csproj`` references (``..\\Nalix.Framework\\Nalix.Framework.csproj`` -> ``Nalix.Framework``)."""
    names = []
    for include in _PROJECT_REFERENCE.findall(csproj_text):
        stem = posixpath.basename(include.replace("\\", "/"))
        names.append(stem[: -len(".csproj")] if stem.endswith(".csproj") else stem)
    return sorted(dict.fromkeys(names))


_NALIX_PACKAGE = re.compile(r'<PackageReference\s+Include="Nalix\.\w+"\s+Version="([^"]+)"', re.I)


def parse_package_versions(csproj_text: str) -> list[str]:
    """Versions of the Nalix packages a project depends on (samples pin the published releases)."""
    return sorted(dict.fromkeys(_NALIX_PACKAGE.findall(csproj_text)))


def parse_version(props_text: str) -> str | None:
    m = _VERSION.search(props_text)
    return m.group(1) if m else None
