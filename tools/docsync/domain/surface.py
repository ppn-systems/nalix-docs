"""Public API surface of a C# file: type headers and member signatures.

The surface deliberately leaves out method bodies, comments and formatting, so comparing the
surfaces of two versions of a file tells whether the *public contract* changed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .declarations import scan_declarations

_TYPE_KEYWORD = re.compile(r"\b(class|struct|interface|enum|record)\b", re.ASCII)
_ACCESSOR_ONLY = re.compile(r"^\{(?:get|set|init|private|protected|internal|;)*\}$")
_ATTRIBUTE = re.compile(r"^\[[^\[\]]*(?:\[[^\]]*\][^\[\]]*)*\]\s*")
_PREPROCESSOR = re.compile(r"^[ \t]*#.*$", re.MULTILINE)
_CTOR_INITIALIZER = re.compile(r"\)\s*:\s*(?:this|base)\s*\(.*$")
_ACCESS = re.compile(r"\b(public|protected)\b", re.ASCII)
_INNER_BRACES = re.compile(r"\{[^{}]*\}")
_OPERATORS_BEFORE_EQUALS = "<>!=+-*/%&|^"


def collapse(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def strip_attributes(head: str) -> str:
    out = head.strip()
    previous = None
    while previous != out:
        previous = out
        out = _ATTRIBUTE.sub("", out)
    return out


@dataclass(frozen=True)
class ApiMember:
    """One line of a type's public contract: a header (``<sealed class : Base>``) or a member."""

    type: str
    signature: str

    @property
    def is_declaration(self) -> bool:
        return self.signature.startswith("<")


@dataclass(frozen=True)
class SurfaceDiff:
    removed: tuple[ApiMember, ...]
    added: tuple[ApiMember, ...]

    def __bool__(self) -> bool:
        return bool(self.removed or self.added)


def member_signatures(masked_body: str, text_body: str, kind: str) -> list[str]:
    """Splits a type body into member signatures.

    A member's head ends at ``;``, ``{``, ``=>`` or ``=``. Method and accessor bodies are skipped;
    property accessors and initializers are kept because defaults are part of the contract.
    """
    members: list[str] = []
    n = len(masked_body)

    def skip_balanced(start: int, opener: str, closer: str) -> int:
        depth = 0
        for k in range(start, n):
            ch = masked_body[k]
            if ch == opener:
                depth += 1
            elif ch == closer:
                depth -= 1
                if depth == 0:
                    return k
        return n - 1

    def statement_end(start: int) -> int:
        depth = 0
        for k in range(start, n):
            ch = masked_body[k]
            if ch in "([{":
                depth += 1
            elif ch in ")]}":
                depth -= 1
            elif ch == ";" and depth == 0:
                return k
        return n

    def add(start: int, end: int, suffix: str) -> None:
        head = strip_attributes(collapse(_PREPROCESSOR.sub("", text_body[start:end])))
        if not head or (_TYPE_KEYWORD.search(head) and "(" not in head):
            return
        if kind != "interface" and not _ACCESS.search(head):
            return
        members.append(collapse(_CTOR_INITIALIZER.sub(")", head + suffix)))

    start = i = 0
    while i < n:
        c = masked_body[i]
        nxt = masked_body[i + 1] if i + 1 < n else ""
        if c in "([":
            i = skip_balanced(i, c, ")" if c == "(" else "]") + 1
        elif c == ";":
            add(start, i, "")
            i += 1
            start = i
        elif c == "=" and nxt == ">":
            add(start, i, "")
            i = statement_end(i) + 1
            start = i
        elif c == "=" and nxt != "=" and (masked_body[i - 1] if i > 0 else " ") not in _OPERATORS_BEFORE_EQUALS:
            end = statement_end(i)
            add(start, i, f" = {collapse(text_body[i + 1:end])}")
            i = end + 1
            start = i
        elif c == "{":
            close = skip_balanced(i, "{", "}")
            head = strip_attributes(collapse(masked_body[start:i]))
            suffix = ""
            if "(" not in head:
                # Property or indexer: keep the accessor list, drop accessor bodies.
                block = masked_body[i:close + 1]
                block = _INNER_BRACES.sub(lambda m: m.group() if m.start() == 0 else "{}", block)
                flat = re.sub(r"\s+", "", block)
                suffix = f" {flat}" if _ACCESSOR_ONLY.match(flat) else " {…}"
                after = close + 1
                while after < n and masked_body[after] in " \n":
                    after += 1
                if after < n and masked_body[after] == "=" and masked_body[after + 1:after + 2] != ">":
                    end = statement_end(after)
                    suffix += f" = {collapse(text_body[after + 1:end])}"
                    add(start, i, suffix)
                    i = end + 1
                    start = i
                    continue
            add(start, i, suffix)
            i = close + 1
            start = i
        else:
            i += 1
    return members


def member_name(signature: str) -> str:
    """Identifier a signature declares: ``public int Foo(int a)`` -> ``Foo``."""
    head = re.split(r"\s=\s|\s=>\s", signature)[0]
    head = re.sub(r"\([\s\S]*$", "", head)
    head = re.sub(r"\{[\s\S]*$", "", head)
    head = re.sub(r"<[^<>]*>\s*$", "", head).strip()
    m = re.search(r"([A-Za-z_]\w*)\s*$", head, re.ASCII)
    return m.group(1) if m else signature


def _enum_member_lines(body: str) -> list[str]:
    members: list[str] = []
    depth = 0
    current: list[str] = []

    def flush() -> None:
        text = "".join(current)
        if text.strip():
            members.append(collapse(strip_attributes(collapse(text))))
        current.clear()

    for ch in _PREPROCESSOR.sub("", body):
        if ch in "([{":
            depth += 1
        if ch in ")]}":
            depth -= 1
        if ch == "," and depth == 0:
            flush()
        else:
            current.append(ch)
    flush()
    return members


def file_surface(file: str, source: str) -> list[ApiMember]:
    """Public surface of one file: a header per public type and one entry per public/protected member."""
    out: list[ApiMember] = []
    for decl in scan_declarations(file, source).declarations:
        if not decl.is_api:
            continue
        header = re.sub(r"\s*where\b.*$", "", decl.header) if decl.header else ""
        out.append(ApiMember(decl.qualified_name, f"<{' '.join([*decl.modifiers, decl.kind])}{' ' + header if header else ''}>"))
        if decl.kind == "enum":
            out.extend(ApiMember(decl.qualified_name, line) for line in _enum_member_lines(decl.body))
        else:
            out.extend(ApiMember(decl.qualified_name, sig) for sig in member_signatures(decl.masked_body, decl.body, decl.kind))
    return out


def diff_surfaces(before: list[ApiMember], after: list[ApiMember]) -> SurfaceDiff:
    old, new = set(before), set(after)
    return SurfaceDiff(
        removed=tuple(dict.fromkeys(m for m in before if m not in new)),
        added=tuple(dict.fromkeys(m for m in after if m not in old)),
    )
