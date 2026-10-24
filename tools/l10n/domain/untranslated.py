"""A page that is still mostly English was not translated, whatever the target language."""

from __future__ import annotations

import re

#: English function words that rarely occur in other Latin-script languages.
_ENGLISH = frozenset(
    "the and of is are for with that this from you your can when not will which each into by "
    "when where how what should must does has have been than then their there these those".split()
)
_WORD = re.compile(r"[A-Za-z]+")
MIN_WORDS = 40
THRESHOLD = 0.06


def english_ratio(prose: str) -> tuple[float, int]:
    """Share of the words that are English function words, and how many words were looked at."""
    words = [w.lower() for w in _WORD.findall(prose)]
    if not words:
        return 0.0, 0
    return sum(w in _ENGLISH for w in words) / len(words), len(words)


def looks_untranslated(prose: str) -> bool:
    ratio, count = english_ratio(prose)
    return count >= MIN_WORDS and ratio >= THRESHOLD
