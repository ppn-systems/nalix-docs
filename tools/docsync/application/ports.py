"""What the use cases need from the outside world."""

from __future__ import annotations

from typing import Any, Protocol

from ..domain.markdown import DocFile
from ..domain.snapshot import Manifest, SourceSnapshot


class SourceReader(Protocol):
    def resolve(self, ref: str) -> str:
        """Commit SHA a branch, tag or SHA points to."""

    def read(self, commit: str) -> SourceSnapshot:
        """Tracked files of one commit."""


class SnapshotStore(Protocol):
    def load_manifest(self) -> Manifest: ...

    def load_index(self) -> dict[str, Any]: ...

    def save(self, snapshot: SourceSnapshot, index: dict[str, Any]) -> None: ...


class DocsRepository(Protocol):
    def pages(self) -> list[DocFile]: ...


class SyncError(RuntimeError):
    """A failure the user can act on (unreachable source, corrupt download, invalid manifest...)."""
