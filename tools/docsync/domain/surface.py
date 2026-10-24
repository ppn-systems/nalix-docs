"""Public API surface of a C# file: type headers and member signatures.

The surface deliberately leaves out method bodies, comments and formatting, so comparing the
surfaces of two versions of a file tells whether the *public contract* changed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .declarations import scan_declarations

_TYPE_KEYWORD = re.compile(r"\b(class|struct|interface|enum|record)\b", re.ASCII)
_ACCESSOR_ONLY = re.compile(r"^\{(?:get|set|init|private|protected|internal|;)*\}$")
_ATTRIBUTE = re.compile(r"\[[^\[\]]*(?:\[[^\]]*\][^\[\]]*)*\]\s*")
_PREPROCESSOR = re.compile(r"^[ \t]*#.*$", re.MULTILINE)
_CTOR_INITIALIZER = re.compile(r"\)\s*:\s*(?:this|base)\s*\(.*$")
_PRIVATE_PROTECTED = re.compile(r"\bprivate\s+protected\b", re.ASCII)
_ASYNC = re.compile(r"\basync\s+", re.ASCII)
_ACCESS = re.compile(r"\b(public|protected)\b", re.ASCII)
_INNER_BRACES = re.compile(r"\{[^{}]*\}")
_OPERATORS_BEFORE_EQUALS = "<>!=+-*/%&|^"


def collapse(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def strip_attributes(head: str) -> str:
    out = head.strip()
    while True:
        m = _ATTRIBUTE.match(out)
        if not m:
            return out
        out = out[m.end():]


@dataclass(frozen=True)
class ApiMember:
    """One line of a type's public contract: a header (``<sealed class : Base>``) or a member."""

    type: str
    signature: str
    line: int = field(default=0, compare=False)  # 1-based line in the file it was read from

    @property
    def is_declaration(self) -> bool:
        return self.signature.startswith("<")


@dataclass(frozen=True)
class SurfaceDiff:
    removed: tuple[ApiMember, ...]
    added: tuple[ApiMember, ...]

    def __bool__(self) -> bool:
        return bool(self.removed or self.added)


def _first_code_offset(raw: str) -> int:
    """Offset of the first real token of a member head, past whitespace, ``#region`` lines and attributes."""
    i = 0
    while i < len(raw):
        if raw[i].isspace():
            i += 1
        elif raw[i] == "#":
            end = raw.find("\n", i)
            i = len(raw) if end < 0 else end
        else:
            m = _ATTRIBUTE.match(raw, i)
            if not m:
                break
            i = m.end()
    return i


def member_signatures(masked_body: str, text_body: str, kind: str) -> list[str]:
    return [signature for signature, _ in member_spans(masked_body, text_body, kind)]


def member_spans(masked_body: str, text_body: str, kind: str) -> list[tuple[str, int]]:
    """Splits a type body into member signatures.

    A member's head ends at ``;``, ``{``, ``=>`` or ``=``. Method and accessor bodies are skipped;
    property accessors and initializers are kept because defaults are part of the contract.
    """
    members: list[tuple[str, int]] = []
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
        if kind != "interface" and (not _ACCESS.search(head) or _PRIVATE_PROTECTED.search(head)):
            return
        head = _ASYNC.sub("", head)  # `async` is an implementation detail, not part of the contract
        offset = start + _first_code_offset(text_body[start:end])
        members.append((collapse(_CTOR_INITIALIZER.sub(")", head + suffix)), offset))

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


def _enum_member_items(body: str) -> list[tuple[str, int]]:
    """Enum members as ``(text, offset)``; attributes and ``#region`` lines do not count."""
    members: list[tuple[str, int]] = []
    depth = 0
    current: list[str] = []
    began = 0

    def flush() -> None:
        text = "".join(current)
        if text.strip():
            members.append((collapse(strip_attributes(collapse(text))), began))
        current.clear()

    blanked = _PREPROCESSOR.sub(lambda m: " " * len(m.group()), body)  # same length: offsets stay valid
    for offset, ch in enumerate(blanked):
        if ch in "([{":
            depth += 1
        if ch in ")]}":
            depth -= 1
        if ch == "," and depth == 0:
            flush()
            continue
        if not current:
            if ch.isspace():
                continue
            began = offset
        current.append(ch)
    flush()
    return members


def _enum_member_lines(body: str) -> list[str]:
    return [text for text, _ in _enum_member_items(body)]


def _is_generator_model(file: str, name: str) -> bool:
    """Source-generator pipeline models are public only so the generator can use them; they are not user API."""
    return file.startswith("analyzers/") and name.endswith("Model")


def file_surface(file: str, source: str) -> list[ApiMember]:
    """Public surface of one file: a header per public type and one entry per public/protected member."""
    out: list[ApiMember] = []
    for decl in scan_declarations(file, source).declarations:
        if not decl.is_api or _is_generator_model(decl.file, decl.name):
            continue
        name = decl.qualified_name
        header = re.sub(r"\s*where\b.*$", "", decl.header) if decl.header else ""
        out.append(ApiMember(name, f"<{' '.join([*decl.modifiers, decl.kind])}{' ' + header if header else ''}>", decl.line))

        def line_at(offset: int) -> int:
            return decl.body_line + decl.body.count("\n", 0, offset)

        if decl.kind == "enum":
            out.extend(ApiMember(name, text, line_at(offset)) for text, offset in _enum_member_items(decl.body))
        else:
            out.extend(ApiMember(name, sig, line_at(offset)) for sig, offset in member_spans(decl.masked_body, decl.body, decl.kind))
    return out


def diff_surfaces(before: list[ApiMember], after: list[ApiMember]) -> SurfaceDiff:
    old, new = set(before), set(after)
    return SurfaceDiff(
        removed=tuple(dict.fromkeys(m for m in before if m not in new)),
        added=tuple(dict.fromkeys(m for m in after if m not in old)),
    )
