"""Roslyn diagnostics (``NALIXnnn``) declared by the Nalix analyzers and generators."""

from __future__ import annotations

import re
from typing import Any

_DESCRIPTOR = re.compile(
    r'id:\s*"(NALIX\d+)"\s*,\s*title:\s*"((?:[^"\\]|\\.)*)"(.*?)defaultSeverity:\s*DiagnosticSeverity\.(\w+)',
    re.S,
)
_UNESCAPE = re.compile(r"\\(.)")


def parse_diagnostics(path: str, text: str) -> dict[str, dict[str, Any]]:
    """``{id: {title, severity, project}}`` for the descriptors declared in one file of ``analyzers/``."""
    project = path.split("/")[1] if path.count("/") >= 1 else ""
    return {
        m.group(1): {"title": _UNESCAPE.sub(r"\1", m.group(2)), "severity": m.group(4), "project": project}
        for m in _DESCRIPTOR.finditer(text)
    }
