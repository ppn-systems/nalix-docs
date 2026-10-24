"""The documentation folders and the stamp files inside the repository."""

from __future__ import annotations

import json
from pathlib import Path

from ..application.ports import L10nError


class DocsFolders:
    """``src/content/docs/<locale>/**/*.md``."""

    def __init__(self, docs_root: Path, canonical: str) -> None:
        self._root, self._canonical = docs_root, canonical

    def locales(self) -> list[str]:
        """Translation folders that exist (the canonical one excluded)."""
        return sorted(p.name for p in self._root.iterdir() if p.is_dir() and p.name != self._canonical)

    def _read(self, locale: str) -> dict[str, str]:
        folder = self._root / locale
        return {p.relative_to(folder).as_posix(): p.read_text(encoding="utf-8") for p in sorted(folder.rglob("*.md"))} if folder.is_dir() else {}

    def source_pages(self) -> dict[str, str]:
        pages = self._read(self._canonical)
        if not pages:
            raise L10nError(f"no pages under {self._root / self._canonical}")
        return pages

    def translated_pages(self, locale: str) -> dict[str, str]:
        return self._read(locale)

    def write(self, locale: str, path: str, text: str) -> None:
        target = self._root / locale / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")


class JsonLocks:
    """``translations/<locale>.lock.json``: which English text each translated page was made from."""

    def __init__(self, folder: Path) -> None:
        self._folder = folder

    def _path(self, locale: str) -> Path:
        return self._folder / f"{locale}.lock.json"

    def load(self, locale: str) -> dict[str, str]:
        path = self._path(locale)
        if not path.exists():
            return {}
        try:
            return json.loads(path.read_text(encoding="utf-8")).get("pages", {})
        except json.JSONDecodeError as error:
            raise L10nError(f"{path.name} is not valid JSON ({error}); delete it and run `stamp` again.") from error

    def save(self, locale: str, stamps: dict[str, str]) -> None:
        self._folder.mkdir(parents=True, exist_ok=True)
        self._path(locale).write_text(json.dumps({"locale": locale, "pages": stamps}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
