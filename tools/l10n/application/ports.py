"""What the use cases need from the outside world."""

from __future__ import annotations

from typing import Protocol


class PageStore(Protocol):
    def source_pages(self) -> dict[str, str]:
        """Canonical (English) pages: path relative to the locale folder -> text."""

    def translated_pages(self, locale: str) -> dict[str, str]:
        """The pages of one translation, same keys."""

    def write(self, locale: str, path: str, text: str) -> None: ...


class LockStore(Protocol):
    def load(self, locale: str) -> dict[str, str]:
        """Page -> fingerprint of the English text it was translated from."""

    def save(self, locale: str, stamps: dict[str, str]) -> None: ...


class NavigationTitles(Protocol):
    def missing(self, locale: str) -> list[str]:
        """English navigation titles that have no translation yet."""

    def apply(self, locale: str, translations: dict[str, str]) -> int:
        """Stores translations for the titles that lack one; returns how many items changed."""


class L10nError(RuntimeError):
    """A failure the user can act on."""
