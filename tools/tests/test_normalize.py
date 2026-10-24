import unittest

from docsync.domain.normalize import content_hash, layout_csharp, normalize_csharp, normalize_xml


def digest(text: str) -> str:
    return content_hash("A.cs", text)


class CommentsAndFormatting(unittest.TestCase):
    def test_comments_xml_docs_and_formatting_do_not_change_the_hash(self):
        a = "namespace N;\n/// <summary>Docs</summary>\npublic sealed class A { int x = 1; } // trailing\n"
        b = "namespace N;\r\n/* block\n comment */\npublic   sealed class A\n{\n    int x = 1;\n}\n"
        self.assertEqual(digest(a), digest(b))
        self.assertNotEqual(digest(a), digest(a.replace("x = 1", "x = 2")))

    def test_identifiers_stay_apart_and_punctuation_spacing_goes(self):
        self.assertEqual(normalize_csharp("public  static\nint  F ( int a )  =>  a ;"), "public static int F(int a)=>a;")

    def test_preprocessor_lines_are_kept_without_trailing_comments(self):
        self.assertEqual(normalize_csharp("#if DEBUG // dbg\nint a;\n#endif"), "#if DEBUG\nint a;\n#endif")


class Literals(unittest.TestCase):
    def test_comment_like_text_inside_literals_is_kept(self):
        for literal in ['"http://x"', '"a /* b */ c"', '@"C:\\a\\""//b"', '"esc \\" // still"', "'\"'", "'\\''"]:
            with self.subTest(literal=literal):
                src = f"var s = {literal}; // real comment"
                self.assertEqual(normalize_csharp(src), f"var s={literal};")
                self.assertNotEqual(digest(src), digest('var s = "";'))

    def test_interpolated_strings_with_nested_holes(self):
        src = 'var s = $"{a /* c */ + "}//"} {{x}} {(b ? "x" : "y")}"; // c'
        self.assertEqual(normalize_csharp(src), 'var s=$"{a+"}//"} {{x}} {(b?"x":"y")}";')

    def test_raw_strings_including_interpolated_ones(self):
        raw = 'var j = """\n  { "a": "// not a comment" }\n  """; // c'
        self.assertEqual(normalize_csharp(raw), 'var j="""\n  { "a": "// not a comment" }\n  """;')
        interpolated = 'var j = $$"""{ "v": {{v /* c */}} }"""; // c'
        self.assertEqual(normalize_csharp(interpolated), 'var j=$$"""{ "v": {{v}} }""";')


class LayoutView(unittest.TestCase):
    def test_masked_twin_has_the_same_length_and_blank_literals(self):
        view = layout_csharp('class A { string s = $"x={(a ? "{" : "}")}"; } // c\n')
        self.assertEqual(len(view.text), len(view.masked))
        self.assertEqual(view.masked, "class A { string s =                       ; }  \n")

    def test_line_breaks_survive(self):
        self.assertEqual(layout_csharp("a\n  // c\nb").text, "a\n   \nb")


class Xml(unittest.TestCase):
    def test_comments_and_whitespace_between_tags_go(self):
        self.assertEqual(normalize_xml("<Project>\n  <!-- c -->\n  <A>1</A>\n</Project>"), "<Project><A>1</A></Project>")

    def test_a_byte_order_mark_is_ignored(self):
        self.assertEqual(content_hash("A.csproj", "\ufeff<A/>"), content_hash("A.csproj", "<A/>"))


if __name__ == "__main__":
    unittest.main()
