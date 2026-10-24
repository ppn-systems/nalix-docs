"""Which pages describe which source files, and where the docs mention a name."""

from __future__ import annotations

import re
from dataclasses import dataclass

from .markdown import DocFile

_CITATION = re.compile(r"`((?:src|samples|analyzers)/[^`\s]+)`")
_GLOB_TAIL = re.compile(r"[*].*$")
_TRAILING_PUNCTUATION = re.compile(r"[.,;:)]+$")
_TRAILING_SLASHES = re.compile(r"/+$")


@dataclass(frozen=True)
class DocPointer:
    page: str
    line: int
    snippet: str
    name: str = ""


def collect_citations(docs: list[DocFile]) -> dict[str, set[str]]:
    """Source paths cited by docs -> citing pages. Package-wide citations (``src/Nalix.Network``) are ignored."""
    citations: dict[str, set[str]] = {}
    for doc in docs:
        for m in _CITATION.finditer(doc.text):
            cited = _TRAILING_SLASHES.sub("", _TRAILING_PUNCTUATION.sub("", _GLOB_TAIL.sub("", m.group(1))))
            if len(cited.split("/")) < (2 if cited.startswith("samples/") else 3):
                continue
            citations.setdefault(cited, set()).add(doc.path)
    return citations


def cited_by(path: str, citations: dict[str, set[str]]) -> list[str]:
    """Pages that cite this file directly or through one of its parent folders."""
    pages: set[str] = set()
    for cited, citing in citations.items():
        if path == cited or path.startswith(cited + "/"):
            pages |= citing
    return sorted(pages)


def _word(name: str) -> re.Pattern[str]:
    return re.compile(rf"\b{re.escape(name)}\b", re.ASCII)


def doc_pointers(name: str, type_name: str, docs: list[DocFile], limit: int = 5) -> list[DocPointer]:
    """Lines that mention ``name`` on pages that mention ``type_name``."""
    name_re, type_re = _word(name), _word(type_name)
    hits: list[DocPointer] = []
    for doc in docs:
        if not type_re.search(doc.text):
            continue
        for number, line in enumerate(doc.text.split("\n"), start=1):
            if len(hits) >= limit:
                break
            if name_re.search(line):
                hits.append(DocPointer(doc.path, number, line.strip()[:110]))
    return hits


def mentions(type_name: str, docs: list[DocFile]) -> bool:
    pattern = _word(type_name)
    return any(pattern.search(d.text) for d in docs)
