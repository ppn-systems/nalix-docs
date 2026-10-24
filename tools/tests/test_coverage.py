import unittest

from docsync.domain.api_view import ApiIndex
from docsync.domain.coverage import compute_coverage, render_coverage
from docsync.domain.markdown import DocFile, parse_page


def _index() -> ApiIndex:
    def t(name, ns="Nalix.A", file="src/Nalix.A/X.cs"):
        return {"name": name, "kind": "class", "namespace": ns, "file": file, "modifiers": []}

    def sig(owner, file="src/Nalix.A/X.cs"):
        return {"type": f"Nalix.A.{owner}", "arity": 0, "params": [], "signature": "", "file": file, "line": 1}

    return ApiIndex({
        "types": [t("Documented"), t("Missing"), t("Hidden", ns="Nalix.A.Internal"), t("FooModel", file="analyzers/Nalix.G/M.cs")],
        "options": {}, "enums": {}, "identifiers": [], "files": [],
        "signatures": {"Send": [sig("Documented")], "Close": [sig("Documented")], "Drop": [sig("Missing")]},
    })


class CoverageTests(unittest.TestCase):
    def test_counts_types_and_methods_per_package(self):
        pages = (parse_page(DocFile("a.md", "Use Documented to Send data.")),)
        (row,) = compute_coverage(_index(), pages)
        self.assertEqual(row.package, "Nalix.A")
        self.assertEqual((row.types, row.types_documented), (2, 1))  # internal and generator models excluded
        self.assertEqual((row.members, row.members_documented), (3, 1))  # Close and Drop are not mentioned
        self.assertEqual(row.missing_types, ("Missing",))
        self.assertEqual(row.types_pct, 50.0)

    def test_method_of_undocumented_type_does_not_count(self):
        pages = (parse_page(DocFile("a.md", "Drop")),)
        (row,) = compute_coverage(_index(), pages)
        self.assertEqual(row.members_documented, 0)

    def test_markdown_table_lists_packages_and_gaps(self):
        pages = (parse_page(DocFile("a.md", "Documented")),)
        text = render_coverage(compute_coverage(_index(), pages))
        self.assertIn("| `Nalix.A` | 1/2 (50.0%) |", text)
        self.assertIn("`Missing`", text)


if __name__ == "__main__":
    unittest.main()
