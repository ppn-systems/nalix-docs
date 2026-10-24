"""Files the tooling reads and writes inside the docs repository."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..application.ports import SyncError
from ..domain.markdown import DocFile
from ..domain.snapshot import Manifest, SourceSnapshot


class JsonSnapshotStore:
    """``source-manifest.json`` (file hashes) and ``source-api-index.json`` (public API snapshot)."""

    def __init__(self, root: Path) -> None:
        self.manifest_path = root / "source-manifest.json"
        self.index_path = root / "source-api-index.json"

    def load_manifest(self) -> Manifest:
        if not self.manifest_path.exists():
            return Manifest()
        try:
            data = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise SyncError(f"{self.manifest_path.name} is not valid JSON ({error}); fix or regenerate it with sync-update.") from error
        return Manifest(commit=data.get("nalixCommit"), files=data.get("files", {}))

    def load_index(self) -> dict[str, Any]:
        try:
            return json.loads(self.index_path.read_text(encoding="utf-8"))
        except FileNotFoundError as error:
            raise SyncError(f"{self.index_path.name} not found; run sync-update first.") from error

    def save(self, snapshot: SourceSnapshot, index: dict[str, Any]) -> None:
        manifest = {"nalixCommit": snapshot.commit, "files": snapshot.hashes()}
        self.manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        self.index_path.write_text(json.dumps(index, separators=(",", ":")) + "\n", encoding="utf-8")


class DocsDirectory:
    def __init__(self, root: Path) -> None:
        self._root = root

    def pages(self) -> list[DocFile]:
        return [
            DocFile(path.relative_to(self._root).as_posix(), path.read_text(encoding="utf-8"))
            for path in sorted(self._root.rglob("*.md"))
        ]
