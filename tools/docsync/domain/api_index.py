"""Compact, committed snapshot of the public API of the Nalix source.

The audit compares the docs with this index, so doc tests need neither a Nalix checkout nor the
network. It lists types, namespaces, option properties with defaults, enum members, identifiers and
every repository path.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Any

from .declarations import scan_declarations
from .diagnostics import parse_diagnostics
from .enum_values import enum_values
from .normalize import layout_csharp
from .projects import parse_package_versions, parse_references, parse_version
from .signatures import parse_signature
from .surface import _enum_member_lines, collapse, file_surface

#: Top-level folders whose public types are API surface (samples are indexed as files only).
API_DIRS = ("src/", "analyzers/")

_AUTO_PROPERTY = re.compile(
    r"\bpublic\s+((?:(?:new|virtual|override|required|static|unsafe)\s+)*)"
    r"([\w.]+(?:\s*<[^;{}()=]*>)?(?:\[\])?\??)\s+([A-Za-z_]\w*)\s*\{\s*get\s*;"
    r"(?:\s*(?:private\s+|protected\s+|internal\s+)?(?:set|init)\s*;)?\s*\}"
    r'(?:\s*=\s*((?:[^;"]|"(?:[^"\\]|\\.)*")*?)\s*;)?',
    re.ASCII,
)
_ANY_PROPERTY = re.compile(
    r"\bpublic\s+((?:(?:new|virtual|override|required|static|unsafe|sealed)\s+)*)"
    r"[\w.]+(?:\s*<[^;{}()=]*>)?(?:\[\])?\??\s+([A-Za-z_]\w*)\s*(?:\{|=>)",
    re.ASCII,
)
_STATIC = re.compile(r"\bstatic\b")


def is_api_file(path: str) -> bool:
    return path.endswith(".cs") and path.startswith(API_DIRS)


def enum_members(body: str) -> list[str]:
    """Member names of an enum body (attributes, values and ``#region`` lines are ignored)."""
    names = []
    for line in _enum_member_lines(body):
        m = re.match(r"([A-Za-z_]\w*)", line, re.ASCII)
        if m:
            names.append(m.group(1))
    return names


def option_properties(body: str) -> list[dict[str, Any]]:
    """Instance properties of an options class: name, type and initializer when it is an auto-property."""
    props: dict[str, dict[str, Any]] = {}
    for m in _AUTO_PROPERTY.finditer(body):
        if _STATIC.search(m.group(1)):
            continue
        prop: dict[str, Any] = {"name": m.group(3), "type": collapse(m.group(2))}
        if m.group(4) is not None:
            prop["default"] = collapse(m.group(4))
        props[m.group(3)] = prop
    for m in _ANY_PROPERTY.finditer(body):
        if not _STATIC.search(m.group(1)) and m.group(2) not in props:
            props[m.group(2)] = {"name": m.group(2)}
    return list(props.values())


@dataclass(frozen=True)
class SourceFile:
    path: str
    text: str


@dataclass
class _Accumulator:
    identifiers: set[str] = field(default_factory=set)
    namespaces: set[str] = field(default_factory=set)
    types: list[dict[str, Any]] = field(default_factory=list)
    internal_types: list[dict[str, Any]] = field(default_factory=list)
    options: dict[str, dict[str, Any]] = field(default_factory=dict)
    enums: dict[str, dict[str, Any]] = field(default_factory=dict)
    diagnostics: dict[str, dict[str, Any]] = field(default_factory=dict)
    projects: dict[str, dict[str, Any]] = field(default_factory=dict)
    signatures: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    version: str = ""
    referenced_versions: set[str] = field(default_factory=set)


def build_api_index(files: Iterable[SourceFile], all_paths: Iterable[str] = ()) -> dict[str, Any]:
    """Builds the index as a plain, JSON-serializable dict."""
    files = list(files)
    acc = _Accumulator()
    for source in files:
        if source.path.endswith(".csproj") and source.path.startswith("samples/"):
            acc.referenced_versions.update(parse_package_versions(source.text))
        if source.path.endswith(".csproj") and source.path.startswith(API_DIRS):
            name = source.path.rsplit("/", 1)[-1][: -len(".csproj")]
            acc.projects[name] = {"references": parse_references(source.text), "file": source.path}
        elif source.path == "src/Version.props":
            acc.version = parse_version(source.text) or ""
        if not is_api_file(source.path):
            continue
        if source.path.startswith("analyzers/") and "DiagnosticDescriptor" in source.text:
            acc.diagnostics.update(parse_diagnostics(source.path, layout_csharp(source.text).text))
        for member in file_surface(source.path, source.text):
            parsed = None if member.is_declaration else parse_signature(member.signature)
            if parsed:
                overloads = acc.signatures.setdefault(parsed.name, [])
                entry = {"type": member.type, "arity": parsed.arity, "params": list(parsed.params), "signature": member.signature, "file": source.path, "line": member.line}
                if not any(o["type"] == entry["type"] and o["arity"] == parsed.arity and o["params"] == entry["params"] for o in overloads):
                    overloads.append(entry)
        scan = scan_declarations(source.path, source.text)
        acc.identifiers |= scan.identifiers
        for decl in scan.declarations:
            if decl.namespace:
                acc.namespaces.add(decl.namespace)
            if not decl.is_api:
                acc.internal_types.append({"name": decl.name, "kind": decl.kind, "namespace": decl.namespace, "file": decl.file})
                continue
            acc.types.append({"name": decl.name, "kind": decl.kind, "namespace": decl.namespace, "file": decl.file, "modifiers": decl.modifiers})
            if decl.kind == "enum":
                entry = acc.enums.setdefault(decl.name, {"namespace": decl.namespace, "members": []})
                entry["members"].extend(enum_members(decl.body))
                entry.setdefault("values", {}).update(enum_values(_enum_member_lines(decl.body)))
            elif decl.kind == "class" and decl.name.endswith("Options"):
                entry = acc.options.setdefault(decl.name, {"namespace": decl.namespace, "properties": []})
                known = {p["name"] for p in entry["properties"]}
                entry["properties"].extend(p for p in option_properties(decl.body) if p["name"] not in known)

    by_name = lambda t: (t["name"], t["file"])  # noqa: E731
    return {
        "files": sorted({*all_paths, *(f.path for f in files)}),
        "types": sorted(acc.types, key=by_name),
        "internalTypes": sorted(acc.internal_types, key=by_name),
        "namespaces": sorted(acc.namespaces),
        "options": dict(sorted(acc.options.items())),
        "enums": dict(sorted(acc.enums.items())),
        "identifiers": sorted(acc.identifiers),
        "diagnostics": dict(sorted(acc.diagnostics.items())),
        "projects": dict(sorted(acc.projects.items())),
        "version": acc.version,
        "referencedVersions": sorted(acc.referenced_versions),
        "signatures": {name: sorted(items, key=lambda o: (o["type"], o["file"], o["line"])) for name, items in sorted(acc.signatures.items())},
    }
