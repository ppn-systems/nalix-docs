"""Comment-free views of C# and XML sources.

C# comments (``//``, ``/* */``, ``///``) and formatting are dropped while string and character
literals are kept byte-for-byte: regular, verbatim, interpolated (with nested holes) and raw
``\"\"\"`` strings. Two views are produced:

* ``normalize_csharp`` - compact text used for hashing; a single space is kept only where two
  identifier characters would otherwise merge.
* ``layout_csharp`` - the same text with line breaks and indentation kept (comments become one
  space) plus a ``masked`` twin of identical length in which every literal is blanked, so that
  braces and keywords inside literals cannot confuse structural scans.
"""

from __future__ import annotations

import functools
import hashlib
import re
from dataclasses import dataclass

_SPACE = frozenset(" \t\r\n\f\v\u00a0\ufeff")
_SPACE_RUN = re.compile(r"[ \t\r\n\f\v\u00a0\ufeff]+")
_PLAIN_RUN = re.compile(r"[^\s/#\"'$@{}\u00a0\ufeff]+")
_STRING_PREFIX = re.compile(r"[$@]*\"")
_TRAILING_COMMENT = re.compile(r"\s*//.*$")
_WHITESPACE = re.compile(r"\s+")


def _is_ident(ch: str) -> bool:
    return bool(ch) and (ch.isalnum() or ch in "_@")


class _Scanner:
    """Single pass over one C# source. Instances are single-use."""

    def __init__(self, src: str, layout: bool) -> None:
        self.src = src
        self.n = len(src)
        self.layout = layout
        self.i = 0
        self.out: list[str] = []
        self.length = 0
        self.last = ""
        self.pending_space = False
        self.line_start = True
        self.literal_ranges: list[tuple[int, int]] = []

    # -- output ---------------------------------------------------------------------------------
    def _put(self, text: str) -> None:
        if text:
            self.out.append(text)
            self.length += len(text)
            self.last = text[-1]

    def _emit(self, text: str) -> None:
        if text and not self.layout and self.pending_space and _is_ident(self.last) and _is_ident(text[0]):
            self._put(" ")
        self._put(text)
        self.pending_space = False

    # -- code -----------------------------------------------------------------------------------
    def scan_code(self, in_hole: bool) -> None:
        """Scans code until EOF or, inside an interpolation hole, the unmatched closing brace."""
        src, n = self.src, self.n
        depth = 0
        while self.i < n:
            i = self.i
            c = src[i]
            if c in _SPACE:
                run = _SPACE_RUN.match(src, i).group()
                if "\n" in run:
                    self.line_start = True
                if self.layout:
                    self._put(run)
                self.pending_space = True
                self.i += len(run)
                continue
            nxt = src[i + 1] if i + 1 < n else ""
            if c == "/" and nxt == "/":
                end = src.find("\n", i)
                self.i = n if end < 0 else end
                self._comment_gap()
                continue
            if c == "/" and nxt == "*":
                end = src.find("*/", i + 2)
                self.i = n if end < 0 else end + 2
                self._comment_gap()
                continue
            if c == "#" and self.line_start and not in_hole:
                self._directive()
                continue
            self.line_start = False
            if c == '"' or (c in "$@" and _STRING_PREFIX.match(src, i, i + 16)):
                self._string()
                continue
            if c == "'":
                self._char()
                continue
            if c != "{" and c != "}":
                run = _PLAIN_RUN.match(src, i)
                if run:
                    self._emit(run.group())
                    self.i = run.end()
                    continue
            if c == "{":
                depth += 1
            elif c == "}":
                if in_hole and depth == 0:
                    return
                depth -= 1
            self._emit(c)
            self.i += 1

    def _comment_gap(self) -> None:
        if self.layout:
            self._put(" ")
        self.pending_space = True

    def _directive(self) -> None:
        """Preprocessor line: kept, minus any trailing comment."""
        end = self.src.find("\n", self.i)
        end = self.n if end < 0 else end
        line = _WHITESPACE.sub(" ", _TRAILING_COMMENT.sub("", self.src[self.i:end])).strip()
        if self.length:
            self._put("\n")
        self._put(line + "\n")
        self.pending_space = False
        self.i = end

    # -- literals -------------------------------------------------------------------------------
    def _char(self) -> None:
        src, n = self.src, self.n
        out_start = self.length
        start = self.i
        self.i += 1
        while self.i < n and src[self.i] != "'" and src[self.i] != "\n":
            self.i += 2 if src[self.i] == "\\" else 1
        self.i += 1
        self._emit(src[start:self.i])
        self.literal_ranges.append((out_start, self.length))

    def _string(self) -> None:
        out_start = self.length
        self._string_body()
        self.literal_ranges.append((out_start, self.length))

    def _string_body(self) -> None:
        src, n = self.src, self.n
        start = self.i
        dollars = 0
        verbatim = False
        while self.i < n and src[self.i] in "$@":
            if src[self.i] == "$":
                dollars += 1
            else:
                verbatim = True
            self.i += 1
        quotes = 0
        while self.i + quotes < n and src[self.i + quotes] == '"':
            quotes += 1

        self._emit(src[start:self.i])  # prefix
        self.pending_space = False

        if quotes >= 3 and not verbatim:
            self._raw_string(quotes, dollars)
            return
        if quotes == 2 and not verbatim:
            self._put('""')
            self.i += 2
            return

        self._put('"')
        self.i += 1
        while self.i < n:
            i = self.i
            c = src[i]
            nxt = src[i + 1] if i + 1 < n else ""
            if verbatim and c == '"' and nxt == '"':
                self._put('""')
                self.i += 2
            elif c == '"':
                self._put('"')
                self.i += 1
                return
            elif not verbatim and c == "\\":
                self._put(src[i:i + 2])
                self.i += 2
            elif dollars and c in "{}" and nxt == c:
                self._put(c + c)
                self.i += 2
            elif dollars and c == "{":
                self._put("{")
                self.i += 1
                self._hole()
                self._put("}")
                self.i += 1
            elif not verbatim and c == "\n":
                return  # unterminated literal; resume as code
            else:
                j = i
                while j < n and src[j] not in '"\\{}\n':
                    j += 1
                if j > i:
                    self._put(src[i:j])
                    self.i = j
                else:
                    self._put(c)
                    self.i += 1

    def _raw_string(self, quotes: int, dollars: int) -> None:
        src, n = self.src, self.n
        fence = '"' * quotes
        self._put(fence)
        self.i += quotes
        while self.i < n:
            i = self.i
            if src.startswith(fence, i):
                run = quotes
                while i + run < n and src[i + run] == '"':
                    run += 1
                self._put(src[i:i + run])
                self.i += run
                return
            if dollars and src[i] == "{":
                run = 0
                while i + run < n and src[i + run] == "{":
                    run += 1
                self._put(src[i:i + run])
                self.i += run
                if run >= dollars:
                    self._hole()
                    close = 0
                    while self.i + close < n and src[self.i + close] == "}" and close < dollars:
                        close += 1
                    self._put("}" * close)
                    self.i += close
                continue
            self._put(src[i])
            self.i += 1

    def _hole(self) -> None:
        self.pending_space = False
        self.scan_code(True)
        self.pending_space = False


def normalize_csharp(src: str) -> str:
    scanner = _Scanner(src, layout=False)
    scanner.scan_code(False)
    return "".join(scanner.out).strip()


@dataclass(frozen=True)
class LayoutText:
    """Comment-free text with its original line layout, and a same-length twin with literals blanked."""

    text: str
    masked: str


@functools.lru_cache(maxsize=1024)
def layout_csharp(src: str) -> LayoutText:
    scanner = _Scanner(src, layout=True)
    scanner.scan_code(False)
    text = "".join(scanner.out)
    # Interpolation holes can contain literals, so ranges may nest: sort and merge before masking.
    ranges = sorted(scanner.literal_ranges, key=lambda r: (r[0], -r[1]))
    pieces: list[str] = []
    last = 0
    for start, end in ranges:
        if end <= last:
            continue
        begin = max(start, last)
        pieces.append(text[last:begin])
        pieces.append(re.sub(r"[^\n]", " ", text[begin:end]))
        last = end
    pieces.append(text[last:])
    return LayoutText(text=text, masked="".join(pieces))


def normalize_xml(src: str) -> str:
    """Drops XML comments and collapses whitespace between tags (used for ``.csproj``)."""
    src = src.replace("\ufeff", " ")
    src = re.sub(r"<!--[\s\S]*?-->", "", src)
    src = re.sub(r">\s+<", "><", src)
    return _WHITESPACE.sub(" ", src).strip()


def content_hash(path: str, text: str) -> str:
    """SHA-256 of the meaningful content of a tracked file."""
    normalized = normalize_csharp(text) if path.endswith(".cs") else normalize_xml(text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()
