import unittest

from l10n.application.use_cases import CheckLocale, FixAnchors, PlanLocale, StampLocale, State, Status
from l10n.domain.anchors import rewrite_fragments, translated_fragment
from l10n.domain.code import comparable
from l10n.domain.compare import compare
from l10n.domain.fingerprint import fingerprint
from l10n.domain.shape import extract_shape
from l10n.domain.untranslated import looks_untranslated

EN = """---
title: Packet Handlers
description: How handlers run.
section: Guides
package: Nalix.Runtime
---

Intro with `PacketOpcode` and a [guide](./other.md#setup-steps).

## Setup steps

| Name | Meaning |
| :--- | :--- |
| `Id` | The id |

```csharp
// Create the handler
var x = new Handler();
```

:::note[Heads up]
Careful.
:::
"""

VI_TEMPLATE = """---
title: Bộ xử lý gói tin
description: Cách bộ xử lý chạy.
section: Guides
package: Nalix.Runtime
---

Phần mở đầu với `PacketOpcode` và một [hướng dẫn](./other.md#{FRAG}).

## Các bước cài đặt

| Tên | Ý nghĩa |
| :--- | :--- |
| `Id` | Mã định danh |

```csharp
// Tạo bộ xử lý
var x = new Handler();
```

:::note[Lưu ý]
Hãy cẩn thận.
:::
"""

VI = VI_TEMPLATE.replace("{FRAG}", "các-bước-cài-đặt")  # the page it links to is translated too
VI_LINKING_ENGLISH = VI_TEMPLATE.replace("{FRAG}", "setup-steps")  # the page it links to is not translated yet

OTHER_EN = "---\ntitle: Other\ndescription: d\nsection: Guides\n---\n\n## Setup steps\n\nText.\n"
OTHER_VI = "---\ntitle: Khác\ndescription: m\nsection: Guides\n---\n\n## Các bước cài đặt\n\nNội dung.\n"


def codes(issues):
    return sorted({i.code for i in issues})


class ShapeTests(unittest.TestCase):
    def test_extracts_the_structure(self):
        s = extract_shape(EN)
        self.assertEqual(s.front["title"], "Packet Handlers")
        self.assertEqual([(h.level, h.slug) for h in s.headings], [(2, "setup-steps")])
        self.assertEqual([(b.language, b.line > 0) for b in s.code_blocks], [("csharp", True)])
        self.assertEqual([(t.rows, t.columns) for t in s.tables], [(2, 2)])
        self.assertEqual([(l.path, l.fragment) for l in s.links], [("./other.md", "setup-steps")])
        self.assertEqual([a for a, _ in s.admonitions], ["note"])
        self.assertEqual(s.code_spans["PacketOpcode"], 1)

    def test_duplicate_headings_get_numbered_ids(self):
        s = extract_shape("## Same\n\n## Same\n")
        self.assertEqual([h.slug for h in s.headings], ["same", "same-1"])

    def test_text_inside_code_is_not_prose(self):
        s = extract_shape("```text\nthe and of the\n```\n\nword\n")
        self.assertNotIn("the and", s.prose)


class CompareTests(unittest.TestCase):
    def compare(self, vi):
        return compare("p.md", extract_shape(EN), extract_shape(vi))

    def test_a_faithful_translation_has_no_issue(self):
        self.assertEqual(self.compare(VI), [])

    def test_translated_comment_in_csharp_is_allowed_but_not_code(self):
        self.assertEqual(self.compare(VI.replace("new Handler()", "new Handler2()")) and codes(self.compare(VI.replace("new Handler()", "new Handler2()"))), ["L003"])

    def test_structure_changes_are_reported(self):
        self.assertEqual(codes(self.compare(VI.replace("## Các", "### Các"))), ["L002"])
        self.assertEqual(codes(self.compare(VI.replace("| `Id` | Mã định danh |\n", "| `Id` | Mã định danh |\n| x | y |\n"))), ["L004"])
        self.assertEqual(codes(self.compare(VI.replace("./other.md", "./another.md"))), ["L005"])
        self.assertEqual(codes(self.compare(VI.replace(":::note", ":::tip"))), ["L006"])
        self.assertEqual(codes(self.compare(VI.replace("`PacketOpcode`", "`PacketOpcodeX`"))), ["L007"])

    def test_front_matter_rules(self):
        self.assertEqual(codes(self.compare(VI.replace("section: Guides", "section: Hướng dẫn"))), ["L001"])
        self.assertEqual(codes(self.compare(VI.replace("package: Nalix.Runtime\n", ""))), ["L001"])

    def test_english_left_in_the_prose_is_reported(self):
        long_english = " ".join(["This is the handler that runs for each packet and returns the result of the call."] * 6)
        source = extract_shape(EN + "\n" + long_english + "\n")
        issues = compare("p.md", source, extract_shape(VI + "\n" + long_english + "\n"))
        self.assertIn("L008", codes(issues))
        self.assertTrue(looks_untranslated(long_english))
        self.assertFalse(looks_untranslated("Hãy dùng bộ xử lý này cho mỗi gói tin " * 10))


class CodeTests(unittest.TestCase):
    def test_comments_do_not_count(self):
        self.assertEqual(comparable("csharp", "// a\nvar x = 1; // b"), comparable("csharp", "// khác\nvar x = 1; // c"))
        self.assertEqual(comparable("bash", "# a\ndotnet run"), comparable("bash", "# b\ndotnet run"))
        self.assertNotEqual(comparable("bash", "dotnet run"), comparable("bash", "dotnet test"))
        self.assertNotEqual(comparable("csharp", 'var s = "a";'), comparable("csharp", 'var s = "b";'))


class AnchorTests(unittest.TestCase):
    def test_fragments_follow_the_translated_heading(self):
        self.assertEqual(translated_fragment("setup-steps", extract_shape(OTHER_EN), extract_shape(OTHER_VI)), "các-bước-cài-đặt")
        self.assertEqual(translated_fragment("nowhere", extract_shape(OTHER_EN), extract_shape(OTHER_VI)), "nowhere")

    def test_rewrite_skips_code_and_external_links(self):
        text = "[a](x.md#one) [b](https://e.com/p#one)\n```\n[c](x.md#one)\n```\n[d](#one)"
        out = rewrite_fragments("dir/p.md", text, lambda page, frag: f"{page}|{frag}!")
        self.assertEqual(out, "[a](x.md#dir/x.md|one!) [b](https://e.com/p#one)\n```\n[c](x.md#one)\n```\n[d](#dir/p.md|one!)")


class MemoryPages:
    def __init__(self, source, translated):
        self.source, self.translated, self.written = dict(source), dict(translated), []

    def source_pages(self):
        return self.source

    def translated_pages(self, locale):
        return self.translated

    def write(self, locale, path, text):
        self.translated[path] = text
        self.written.append(path)


class MemoryLocks:
    def __init__(self, stamps=None):
        self.stamps = dict(stamps or {})

    def load(self, locale):
        return dict(self.stamps)

    def save(self, locale, stamps):
        self.stamps = dict(stamps)


def build(translated, stamps=None, source=None):
    pages = MemoryPages(source or {"a.md": EN, "other.md": OTHER_EN, "c.md": OTHER_EN}, translated)
    locks = MemoryLocks(stamps)
    return pages, locks, CheckLocale(pages, locks)


def states(reports):
    return {r.path: r.state for r in reports}


class UseCaseTests(unittest.TestCase):
    def test_states(self):
        stamps = {"a.md": fingerprint(EN)}
        pages, locks, check = build({"a.md": VI, "other.md": OTHER_VI, "extra.md": VI}, stamps)
        got = states(check("vi-vn"))
        self.assertEqual(got["a.md"], State.TRANSLATED)
        self.assertEqual(got["other.md"], State.STALE)  # never stamped
        self.assertEqual(got["c.md"], State.MISSING)
        self.assertEqual(got["extra.md"], State.ORPHAN)

    def test_changed_english_makes_the_translation_stale(self):
        pages, locks, check = build({"a.md": VI_LINKING_ENGLISH}, {"a.md": fingerprint("old")})
        self.assertEqual(states(check("vi-vn"))["a.md"], State.STALE)
        self.assertEqual(states(check("vi-vn", check_stamps=False))["a.md"], State.TRANSLATED)

    def test_broken_fragment_is_reported_and_fixed(self):
        broken = VI_LINKING_ENGLISH  # English id, but the page it links to is translated
        pages, locks, check = build({"a.md": broken, "other.md": OTHER_VI})
        report = next(r for r in check("vi-vn", check_stamps=False) if r.path == "a.md")
        self.assertEqual(report.state, State.INVALID)
        self.assertEqual(codes(report.issues), ["L009"])
        self.assertEqual(FixAnchors(pages)("vi-vn"), ["a.md"])
        self.assertIn("#các-bước-cài-đặt", pages.translated["a.md"])
        self.assertEqual(states(check("vi-vn", check_stamps=False))["a.md"], State.TRANSLATED)

    def test_fragment_to_an_untranslated_page_keeps_the_english_id(self):
        pages, locks, check = build({"a.md": VI_LINKING_ENGLISH})
        self.assertEqual(states(check("vi-vn", check_stamps=False))["a.md"], State.TRANSLATED)

    def test_stamp_refuses_invalid_pages_and_records_the_good_ones(self):
        pages, locks, check = build({"a.md": VI, "other.md": OTHER_VI.replace("## Các", "### Các")})
        stamped, refused = StampLocale(pages, locks, check)("vi-vn")
        self.assertEqual(stamped, ["a.md"])
        self.assertEqual([r.path for r in refused], ["other.md"])
        self.assertEqual(locks.stamps, {"a.md": fingerprint(EN)})

    def test_plan_batches_what_is_left(self):
        pages, locks, check = build({"a.md": VI_LINKING_ENGLISH}, {"a.md": fingerprint(EN)})
        plan = PlanLocale(pages, check)("vi-vn", 10)
        self.assertEqual(plan["pages"], 2)
        self.assertEqual([[p["path"] for p in b["pages"]] for b in plan["batches"]], [["c.md"], ["other.md"]])

    def test_status_counts_by_section(self):
        pages, locks, check = build({"a.md": VI_LINKING_ENGLISH}, {"a.md": fingerprint(EN)})
        data = Status(check)("vi-vn")
        self.assertEqual(data["total"]["translated"], 1)
        self.assertEqual(data["total"]["missing"], 2)


if __name__ == "__main__":
    unittest.main()


class NavigationFileTests(unittest.TestCase):
    NAV = """export const NAVIGATION_TREE = [
  {
    "title": "Quick Start",
    "titles": { "vi-vn": "Bắt đầu nhanh" },
    "slug": "quickstart"
  },
  {
    "title": "Installation",
    "slug": "installation"
  },
  {
    "title": "Quote \\"Q\\"",
    "titles": { "fr-fr": "Citation" },
    "slug": "q"
  }
];
"""

    def setUp(self):
        import tempfile
        from pathlib import Path

        from l10n.infrastructure.navigation import NavigationFile

        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "navigation.ts"
        self.path.write_text(self.NAV, encoding="utf-8")
        self.nav = NavigationFile(self.path)

    def tearDown(self):
        self.dir.cleanup()

    def test_lists_labels_without_a_translation(self):
        self.assertEqual(self.nav.missing("vi-vn"), ["Installation", 'Quote "Q"'])
        self.assertEqual(self.nav.missing("fr-fr"), ["Quick Start", "Installation"])

    def test_apply_adds_titles_and_keeps_existing_ones(self):
        changed = self.nav.apply("vi-vn", {"Installation": "Cài đặt", "Quick Start": "Khác", 'Quote "Q"': "Trích dẫn"})
        self.assertEqual(changed, 2)  # Quick Start already had one
        text = self.path.read_text(encoding="utf-8")
        self.assertIn('"titles": { "vi-vn": "Bắt đầu nhanh" }', text)
        self.assertIn('"titles": { "vi-vn": "Cài đặt" }', text)
        self.assertIn('"titles": { "fr-fr": "Citation", "vi-vn": "Trích dẫn" }', text)
        self.assertEqual(self.nav.missing("vi-vn"), [])
