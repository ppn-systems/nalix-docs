"""Finds the type declarations of one C# file, with the body of each type."""

from __future__ import annotations

import bisect
import re
from dataclasses import dataclass, field

from .normalize import layout_csharp

_MODIFIERS = r"(?:(?:static|sealed|abstract|partial|readonly|unsafe|ref|new|file)\s+)*"
# Groups: 1 structural punctuation, 2 access, 3 modifiers, 4 kind, 5 name.
_TOKEN = re.compile(
    r"([{};])"
    r"|(?:\b(public|internal|protected|private)\s+(?:(?:protected|internal)\s+)?)?"
    rf"({_MODIFIERS})\b(class|struct|interface|enum|record(?:\s+(?:struct|class))?)\s+([A-Za-z_]\w*)",
    re.ASCII,
)
_NAMESPACE = re.compile(r"\bnamespace\s+([\w.]+)\s*[;{]", re.ASCII)
_IDENTIFIER = re.compile(r"\b[A-Z][A-Za-z0-9_]{3,}\b", re.ASCII)
_NOT_A_TYPE_NAME = frozenset({"where", "new", "class", "struct"})
_WHITESPACE = re.compile(r"\s+")


@dataclass
class TypeDeclaration:
    name: str
    kind: str
    access: str
    modifiers: list[str]
    namespace: str
    file: str
    header_start: int
    line: int = 0  # 1-based line of the declaration
    body_line: int = 0  # 1-based line on which the body starts
    header: str = ""
    is_api: bool = False
    body: str = ""
    masked_body: str = ""

    @property
    def qualified_name(self) -> str:
        return f"{self.namespace}.{self.name}" if self.namespace else self.name


@dataclass
class FileScan:
    declarations: list[TypeDeclaration] = field(default_factory=list)
    identifiers: set[str] = field(default_factory=set)


def scan_declarations(file: str, source: str) -> FileScan:
    """Public and non-public type declarations of one file.

    A type is part of the public API when it is declared ``public`` and every enclosing type is too.
    """
    layout = layout_csharp(source)
    text, masked = layout.text, layout.masked
    ns_match = _NAMESPACE.search(masked)
    namespace = ns_match.group(1) if ns_match else ""

    line_starts = [0] + [i + 1 for i, ch in enumerate(text) if ch == "\n"]

    def line_of(offset: int) -> int:
        return bisect.bisect_right(line_starts, offset)

    scan = FileScan()
    stack: list[tuple[TypeDeclaration | None, int]] = []
    pending: TypeDeclaration | None = None

    def enclosing_type() -> TypeDeclaration | None:
        for decl, _ in reversed(stack):
            if decl is not None:
                return decl
        return None

    def header_of(decl: TypeDeclaration, end: int) -> str:
        return _WHITESPACE.sub(" ", masked[decl.header_start:end]).strip()

    for m in _TOKEN.finditer(masked):
        punct = m.group(1)
        if punct == "{":
            parent = enclosing_type()
            if pending is not None:
                pending.header = header_of(pending, m.start())
                pending.is_api = pending.access == "public" and (parent is None or parent.is_api)
            if pending is not None:
                pending.body_line = line_of(m.end())
            stack.append((pending, m.end()))
            pending = None
        elif punct == "}":
            if not stack:
                continue
            decl, body_start = stack.pop()
            if decl is not None:
                decl.body = text[body_start:m.start()]
                decl.masked_body = masked[body_start:m.start()]
                scan.declarations.append(decl)
        elif punct == ";":
            if pending is not None:
                # Body-less declaration: `record R(int A);` or `class X : Attribute;`.
                parent = enclosing_type()
                pending.is_api = pending.access == "public" and (parent is None or parent.is_api)
                pending.header = header_of(pending, m.start())
                scan.declarations.append(pending)
            pending = None
        else:
            before = masked[:m.start()].rstrip()[-1:]
            if before in (":", ",") or m.group(5) in _NOT_A_TYPE_NAME:
                continue  # generic constraint such as `where T : class`
            pending = TypeDeclaration(
                name=m.group(5),
                kind=_WHITESPACE.sub(" ", m.group(4)),
                access=m.group(2) or "internal",
                modifiers=m.group(3).split(),
                namespace=namespace,
                file=file,
                header_start=m.end(),
                line=line_of(m.start(4)),
            )
    scan.identifiers = set(_IDENTIFIER.findall(masked))
    return scan
