"""Where Nalix source comes from: GitHub, or a local clone."""

from __future__ import annotations

import subprocess
import urllib.parse
from pathlib import Path

from ..application.ports import SyncError
from ..domain.snapshot import SourceSnapshot, TRACKED_DIRS, is_tracked
from .github import GitHubApi
from .tarball import read_tarball


class GitHubSource:
    def __init__(self, repo: str, api: GitHubApi | None = None) -> None:
        self._repo = repo
        self._api = api or GitHubApi()

    def resolve(self, ref: str) -> str:
        return self._api.get_json(f"/repos/{self._repo}/commits/{urllib.parse.quote(ref, safe='')}")["sha"]

    def read(self, commit: str) -> SourceSnapshot:
        data = self._api.get_bytes(f"/repos/{self._repo}/tarball/{commit}")
        try:
            files, all_paths = read_tarball(data, is_tracked)
        except SyncError as error:
            raise SyncError(f"{self._repo}@{commit[:7]}: {error}") from error
        if not files:
            raise SyncError(f"No tracked files found in {self._repo}@{commit[:7]}; refusing to continue.")
        return SourceSnapshot(commit, files, tuple(all_paths))


class LocalSource:
    """The working tree of a local clone (only the checked-out version can be read)."""

    def __init__(self, root: Path) -> None:
        self._root = root

    def _git(self, *args: str) -> str:
        return subprocess.run(["git", "-C", str(self._root), *args], capture_output=True, text=True, check=True).stdout

    def resolve(self, ref: str) -> str:
        try:
            return self._git("rev-parse", ref).strip()
        except (OSError, subprocess.CalledProcessError):
            return "working-tree"

    def read(self, commit: str) -> SourceSnapshot:
        files: dict[str, str] = {}
        for top in TRACKED_DIRS:
            base = self._root / top
            if not base.is_dir():
                continue
            for path in sorted(p for p in base.rglob("*") if p.is_file()):
                rel = path.relative_to(self._root).as_posix()
                if is_tracked(rel):
                    files[rel] = path.read_text(encoding="utf-8", errors="replace")
        if not files:
            raise SyncError(f"No Nalix source found under {self._root} (expected src/, samples/, analyzers/).")
        try:
            all_paths = tuple(p for p in self._git("ls-files").split("\n") if p)
        except (OSError, subprocess.CalledProcessError):
            all_paths = ()
        return SourceSnapshot(commit, files, all_paths)
