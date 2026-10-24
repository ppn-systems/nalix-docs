"""Identifies the version of an English page a translation was made from."""

from __future__ import annotations

import hashlib


def fingerprint(text: str) -> str:
    normalized = "\n".join(line.rstrip() for line in text.replace("\r\n", "\n").split("\n")).strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]
