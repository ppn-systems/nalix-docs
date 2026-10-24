"""A013 - signatures written in the docs must be overloads that exist in the source."""

from __future__ import annotations

import re
from collections.abc import Iterable

from ..findings import Finding, Severity
from ..markdown import Page
from ..signatures import parse_signature
from .base import AuditContext

_CSHARP = frozenset({"csharp", "cs"})
_TABLE_CODE_SPAN = re.compile(r"`([^`]*\([^`]*\)[^`]*)`")
_NOT_A_DECLARATION = re.compile(r"\s*(var|await|return|new|throw|if|foreach|using)\b")
_MAX_CONTINUATION_LINES = 14
_SUGGESTIONS = 3


def candidates(page: Page) -> Iterable[tuple[int, str]]:
    """``(line, text)`` of signature-like declarations: body-less lines in C# fences and code spans in tables."""
    lines = page.lines
    for i, line in enumerate(lines):
        if line.is_code and line.language in _CSHARP:
            buf, j = line.text, i
            while not re.search(r"[;{]|=>", buf) and j + 1 < len(lines) and j - i < _MAX_CONTINUATION_LINES and not lines[j + 1].text.lstrip().startswith("```"):
                j += 1
                buf += " " + lines[j].text.strip()
            if buf.rstrip().endswith(";") and "=>" not in buf and not re.search(r"=\s*[^=>]", buf.split("(")[0]):
                yield line.number, buf
        elif not line.is_code and line.text.startswith("|"):
            for span in _TABLE_CODE_SPAN.findall(line.text):
                yield line.number, span


class SignaturesExist:
    code = "A013"

    def run(self, ctx: AuditContext) -> Iterable[Finding]:
        known = {name: {(o["arity"], tuple(o["params"])) for o in overloads} for name, overloads in ctx.index.signatures.items()}
        for page in ctx.pages:
            for number, text in candidates(page):
                if "..." in text or "…" in text or _NOT_A_DECLARATION.match(text):
                    continue
                parsed = parse_signature(text)
                if not parsed or parsed.name not in known or parsed.key in known[parsed.name]:
                    continue
                overloads = ctx.index.signatures[parsed.name]
                near = sorted(overloads, key=lambda o: (o["arity"] != parsed.arity, abs(len(o["params"]) - len(parsed.params))))[:_SUGGESTIONS]
                hint = "; the source declares " + " | ".join(f"`{o['type'].rsplit('.', 1)[-1]}.{o['signature'][:90]}` ({o['file']}#L{o['line']})" for o in near)
                shown = re.sub(r"\s+", " ", text).strip()[:100]
                yield Finding(self.code, Severity.WARN, page.path, number, f"`{shown}` is not an overload of `{parsed.name}` in the source{hint}",
                              f"{parsed.name}({','.join(parsed.params)})")
