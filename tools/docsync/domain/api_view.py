"""Read-only, query-friendly view over the API index dict."""

from __future__ import annotations

from typing import Any


class ApiIndex:
    def __init__(self, data: dict[str, Any]) -> None:
        self.nalix_commit: str = data.get("nalixCommit", "")
        self.types: list[dict[str, Any]] = data["types"]
        self.internal_types: list[dict[str, Any]] = data.get("internalTypes", [])
        self.options: dict[str, dict[str, Any]] = data["options"]
        self.enums: dict[str, dict[str, Any]] = data["enums"]
        self.identifiers: frozenset[str] = frozenset(data["identifiers"])
        self.files: frozenset[str] = frozenset(data["files"])
        self.namespaces: frozenset[str] = frozenset(data.get("namespaces", [])) | {t["namespace"] for t in self.types}

        self.dirs: frozenset[str] = frozenset(
            f[:i] for f in self.files for i in range(len(f)) if f[i] == "/"
        )
        by_name: dict[str, list[dict[str, Any]]] = {}
        for t in self.types:
            by_name.setdefault(t["name"], []).append(t)
        self.types_by_name = by_name

    def is_type(self, name: str) -> bool:
        return name in self.types_by_name

    def has_path(self, path: str) -> bool:
        return path in self.files or path in self.dirs

    def enum_has_member(self, enum: str, member: str) -> bool:
        return any(m.split("=")[0].strip() == member for m in self.enums[enum]["members"])
