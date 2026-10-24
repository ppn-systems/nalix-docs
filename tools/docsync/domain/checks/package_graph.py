"""A009 - the package dependency diagram and the "Level N" claims must match the project references."""

from __future__ import annotations

import posixpath
import re
from collections.abc import Iterable

from ..findings import Finding, Severity
from ..markdown import kebab
from .base import AuditContext

_NODE = re.compile(r'\b(\w+)\["(Nalix\.\w+)"\]')
_EDGE = re.compile(r"\b(\w+)\s*-->\s*(\w+)\b")
_LEVEL_ROW = re.compile(r"^\|\s*\*\*(\d)\*\*\s*\|\s*\[?\*{0,2}(Nalix\.\w+)\*{0,2}\]?")
_LEVEL_CLAIM = re.compile(r"\bLevel (\d)\b")
_MIN_DIAGRAM_NODES = 4


def _closure(graph: dict[str, set[str]], start: str) -> set[str]:
    seen: set[str] = set()
    stack = [start]
    while stack:
        for nxt in graph.get(stack.pop(), ()):
            if nxt not in seen:
                seen.add(nxt)
                stack.append(nxt)
    return seen


def _levels(graph: dict[str, set[str]]) -> dict[str, int]:
    levels: dict[str, int] = {}

    def level(name: str, trail: tuple[str, ...] = ()) -> int:
        if name not in levels:
            deps = [d for d in graph.get(name, ()) if d not in trail]
            levels[name] = 0 if not deps else 1 + max(level(d, (*trail, name)) for d in deps)
        return levels[name]

    for name in graph:
        level(name)
    return levels


class PackageGraphMatchesProjects:
    code = "A009"

    def run(self, ctx: AuditContext) -> Iterable[Finding]:
        projects = ctx.index.projects
        graph = {name: {r for r in info["references"] if r in projects} for name, info in projects.items() if info["file"].startswith("src/")}
        if len(graph) < _MIN_DIAGRAM_NODES:
            return
        levels = _levels(graph)
        by_page = {kebab(name.replace(".", "-")): name for name in graph}  # nalix-sdk -> Nalix.SDK

        for page in ctx.pages:
            yield from self._diagram(page, graph)
            expected = by_page.get(posixpath.basename(page.path)[:-3])
            for line in page.prose:
                row = _LEVEL_ROW.match(line.text)
                if row and row.group(2) in levels and int(row.group(1)) != levels[row.group(2)]:
                    yield Finding(self.code, Severity.ERROR, page.path, line.number,
                                  f"`{row.group(2)}` is level {levels[row.group(2)]} (longest reference chain) but the table says {row.group(1)}", f"level:{row.group(2)}")
            if expected:
                text = "\n".join(l.text for l in page.prose if l.number < page.prose[0].number + 12)
                claim = _LEVEL_CLAIM.search(text)
                if claim and int(claim.group(1)) != levels[expected]:
                    yield Finding(self.code, Severity.ERROR, page.path, 0,
                                  f"`{expected}` is level {levels[expected]} (longest reference chain) but the page says Level {claim.group(1)}", f"level:{expected}")

    def _diagram(self, page, graph: dict[str, set[str]]) -> Iterable[Finding]:
        block = [l for l in page.lines if l.is_code and l.language == "mermaid"]
        if not block:
            return
        text = "\n".join(l.text for l in block)
        nodes = {alias: name for alias, name in _NODE.findall(text) if name in graph}
        edges = [(nodes[a], nodes[b]) for a, b in _EDGE.findall(text) if a in nodes and b in nodes]
        if len(nodes) < _MIN_DIAGRAM_NODES:
            return
        first = block[0].number
        drawn: dict[str, set[str]] = {}
        for a, b in edges:
            drawn.setdefault(a, set()).add(b)
            if b not in _closure(graph, a):
                yield Finding(self.code, Severity.ERROR, page.path, first, f"the diagram shows `{a}` -> `{b}` but no project reference leads from `{a}` to `{b}`", f"edge:{a}>{b}")
        if set(nodes.values()) < set(graph):
            return  # a partial diagram (e.g. the neighbours of one package) cannot be asked to show every reference
        for a in nodes.values():
            for b in graph[a]:
                if b not in _closure(drawn, a):
                    yield Finding(self.code, Severity.ERROR, page.path, first, f"`{a}` references `{b}` but the diagram has no path from `{a}` to `{b}`", f"missing-edge:{a}>{b}")
