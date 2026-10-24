import unittest

from docsync.domain.line_diff import diff_lines, unified_diff


class LineDiff(unittest.TestCase):
    def test_removals_come_before_additions_with_context_and_hunk_separators(self):
        a = "a\nb\nc\nd\ne\nf\ng\nh\ni\nj\n"
        b = "a\nb\nC\nd\ne\nf\ng\nh\nj\nk\n"
        d = unified_diff(a, b, context=1)
        self.assertEqual(d.text, "@@ -2 +2 @@\n b\n-c\n+C\n d\n@@ -8 +8 @@\n h\n-i\n j\n+k")
        self.assertEqual((d.added, d.removed), (2, 2))
        self.assertEqual(d.changed, ("c", "C", "i", "k"))

    def test_hunk_headers_carry_the_original_line_numbers_of_both_sides(self):
        d = unified_diff("a\n\nb\nc\nd\n", "a\nb\nC\nd\n", context=1)
        self.assertEqual(d.text.split("\n")[0], "@@ -3 +2 @@")  # the blank line counts on the old side only
        self.assertEqual(d.first_new_line, 2)

    def test_blank_lines_and_trailing_whitespace_are_ignored(self):
        self.assertEqual(unified_diff("a  \n\nb\n", "a\nb\n").text, "")

    def test_long_diffs_are_truncated_and_huge_ones_skipped(self):
        many = "\n".join(f"line{i}" for i in range(200))
        d = unified_diff("", many, max_lines=10)
        self.assertEqual(len(d.text.split("\n")), 11)
        self.assertIn("more line(s)", d.text)
        self.assertIsNone(diff_lines(["a", "b"], ["c", "d"], max_cells=1))


if __name__ == "__main__":
    unittest.main()
