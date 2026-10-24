"""A version of the Nalix source, and the record of which version the docs were last synced to."""

from __future__ import annotations

from dataclasses import dataclass, field

from .normalize import content_hash

TRACKED_DIRS = ("analyzers", "samples", "src")
_SKIPPED_SEGMENTS = frozenset({"bin", "obj", ".git", ".vs"})


def is_tracked(path: str) -> bool:
    """``.cs`` / ``.csproj`` / ``.props`` files under ``analyzers/``, ``samples/`` or ``src/``, outside build output."""
    segments = path.split("/")
    return (
        segments[0] in TRACKED_DIRS
        and path.endswith((".cs", ".csproj", ".props"))
        and not _SKIPPED_SEGMENTS.intersection(segments)
    )


@dataclass(frozen=True)
class SourceSnapshot:
    """Tracked files (path -> text) of one commit, plus every path of the repository."""

    commit: str
    files: dict[str, str]
    all_paths: tuple[str, ...] = ()

    def hashes(self) -> dict[str, str]:
        return {path: content_hash(path, text) for path, text in sorted(self.files.items())}


@dataclass(frozen=True)
class Manifest:
    """Content hashes of the last synced commit."""

    commit: str | None = None
    files: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class ChangeSet:
    added: tuple[str, ...] = ()
    removed: tuple[str, ...] = ()
    modified: tuple[str, ...] = ()

    def __len__(self) -> int:
        return len(self.added) + len(self.removed) + len(self.modified)

    @classmethod
    def between(cls, old: dict[str, str], new: dict[str, str]) -> "ChangeSet":
        return cls(
            added=tuple(sorted(p for p in new if p not in old)),
            removed=tuple(sorted(p for p in old if p not in new)),
            modified=tuple(sorted(p for p in new if p in old and old[p] != new[p])),
        )
