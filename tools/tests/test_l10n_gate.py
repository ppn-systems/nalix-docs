"""The real translations, checked against the English pages."""

import unittest
from pathlib import Path

from l10n.application.use_cases import CheckLocale, State
from l10n.infrastructure.files import DocsFolders, JsonLocks

ROOT = Path(__file__).resolve().parents[2]
FOLDERS = DocsFolders(ROOT / "src/content/docs", "en-us")
CHECK = CheckLocale(FOLDERS, JsonLocks(ROOT / "translations"))


class TranslationsMatchTheEnglishPages(unittest.TestCase):
    def test_every_translated_page_is_valid_and_up_to_date(self):
        for locale in FOLDERS.locales():
            with self.subTest(locale=locale):
                problems = [str(i) for r in CHECK(locale) if r.state is not State.MISSING for i in r.issues]
                self.assertEqual(problems, [], f"run `python3 tools/l10n.py check --locale {locale}` for the details")


if __name__ == "__main__":
    unittest.main()
