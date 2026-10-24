"""The ``titles`` entries of ``src/config/navigation.ts``."""

from __future__ import annotations

import json
import re
from pathlib import Path

# An item starts with its English title; an optional single-line ``"titles": { ... },`` follows.
_ITEM = re.compile(
    r'(?P<head>\n(?P<indent>[ ]*)"title": "(?P<title>(?:[^"\\]|\\.)*)",)(?P<titles>\n[ ]*"titles": (?P<map>\{[^}\n]*\}),)?'
)


class NavigationFile:
    def __init__(self, path: Path) -> None:
        self._path = path

    def missing(self, locale: str) -> list[str]:
        """English titles that have no entry for ``locale`` yet, in file order and without repeats."""
        found: list[str] = []
        for m in _ITEM.finditer(self._path.read_text(encoding="utf-8")):
            title = json.loads(f'"{m.group("title")}"')
            known = json.loads(m.group("map")) if m.group("map") else {}
            if locale not in known and title not in found:
                found.append(title)
        return found

    def apply(self, locale: str, translations: dict[str, str]) -> int:
        """Adds ``locale`` titles; an existing entry is never replaced. Returns the number of items changed."""
        changed = 0

        def update(m: re.Match) -> str:
            nonlocal changed
            title = json.loads(f'"{m.group("title")}"')
            known = json.loads(m.group("map")) if m.group("map") else {}
            if locale in known or not translations.get(title, "").strip():
                return m.group(0)
            known[locale] = translations[title].strip()
            changed += 1
            body = ", ".join(f"{json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}" for k, v in known.items())
            return f'{m.group("head")}\n{m.group("indent")}"titles": {{ {body} }},'

        text = _ITEM.sub(update, self._path.read_text(encoding="utf-8"))
        self._path.write_text(text, encoding="utf-8")
        return changed
