"""Code blocks must survive translation unchanged; only comments may be translated."""

from __future__ import annotations

import re

from docsync.domain.normalize import normalize_csharp

_CSHARP = {"csharp", "cs", "c#"}
_HASH_COMMENT = {"bash", "sh", "shell", "powershell", "ps1", "yaml", "yml", "toml", "ini", "dockerfile", "text", "plaintext", ""}
_FULL_LINE_COMMENT = re.compile(r"^\s*(//|#|%%|--)")
_XML_COMMENT = re.compile(r"<!--.*?-->", re.S)


def comparable(language: str, body: str) -> str:
    """The part of a code block that must be identical in every language."""
    lang = language.lower()
    if lang in _CSHARP:
        try:
            return normalize_csharp(body)
        except Exception:  # an unusual sample: fall back to exact comparison
            return body.strip()
    if lang in {"xml", "html", "csproj"}:
        return re.sub(r"\s+", " ", _XML_COMMENT.sub("", body)).strip()
    kept = [line.rstrip() for line in body.split("\n") if not _FULL_LINE_COMMENT.match(line)]
    return "\n".join(kept).strip()
