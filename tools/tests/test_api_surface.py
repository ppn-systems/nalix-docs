import unittest

from docsync.domain.api_index import SourceFile, build_api_index
from docsync.domain.declarations import scan_declarations
from docsync.domain.surface import diff_surfaces, file_surface, member_name


def surface(src: str) -> list[str]:
    return [m.signature for m in file_surface("src/Nalix.X/A.cs", src)]


def public_names(src: str) -> list[str]:
    return sorted(d.name for d in scan_declarations("src/Nalix.X/A.cs", src).declarations if d.is_api)


class TypeDiscovery(unittest.TestCase):
    def test_public_types_only_not_internal_ones_or_types_nested_in_them(self):
        src = """
namespace Nalix.X;
public sealed class Open { public sealed class Inner { } private class Hidden { } }
internal class Closed { public class Leaked { } }
public readonly record struct Point(int X, int Y);
public sealed class Marker : Attribute;
public interface IThing { }
public enum Mode : byte { A, B }"""
        self.assertEqual(public_names(src), ["IThing", "Inner", "Marker", "Mode", "Open", "Point"])

    def test_braces_and_keywords_inside_strings_comments_and_constraints_are_ignored(self):
        src = """
namespace Nalix.X;
public sealed class A<T> where T : class
{
    // class Fake { }
    private string s = "} class Nope {";
    private string t = $"{(x ? "{" : "}")}";
    /* public class AlsoFake */
    public int V { get; set; }
}
public sealed class B { }"""
        self.assertEqual(public_names(src), ["A", "B"])


class ApiIndex(unittest.TestCase):
    def test_options_properties_defaults_and_enum_members(self):
        index = build_api_index([SourceFile("src/Nalix.X/FooOptions.cs", """namespace Nalix.X.Options;
public sealed class FooOptions
{
    [ValueRange(1, int.MaxValue)]
    public int Max { get; set; } = 2_000;
    public TimeSpan Wait { get; set; } = TimeSpan.FromSeconds(20);
    public static int Shared { get; set; } = 1;
}
public enum Kind : byte
{
    #region 0-9: General
    NONE = 0,
    Other = 1,
}""")])
        self.assertEqual(index["options"]["FooOptions"]["properties"], [
            {"name": "Max", "type": "int", "default": "2_000"},
            {"name": "Wait", "type": "TimeSpan", "default": "TimeSpan.FromSeconds(20)"},
        ])
        self.assertEqual(index["enums"]["Kind"]["members"], ["NONE", "Other"])
        self.assertIn("Nalix.X.Options", index["namespaces"])

    def test_every_repository_path_is_listed_even_when_not_tracked(self):
        index = build_api_index([SourceFile("src/A.cs", "class A {}")], ["README.md", "src/A.cs"])
        self.assertEqual(index["files"], ["README.md", "src/A.cs"])


class SourceLines(unittest.TestCase):
    SRC = """namespace N;
/* a
 b */
public sealed class A
{
    // c
    [Obsolete("x")]
    public int Count { get; set; } = 5;

    #region r
    public void Run() { }
}
public enum E
{
    #region x
    A = 1,
    [Obsolete]
    B = 2,
}
"""

    def test_every_signature_knows_its_line_in_the_original_file(self):
        lines = {m.signature: m.line for m in file_surface("src/A.cs", self.SRC)}
        self.assertEqual(lines["<sealed class>"], 4)
        self.assertEqual(lines["public int Count {get;set;} = 5"], 8)  # past the attribute, comments and blank lines
        self.assertEqual(lines["public void Run()"], 11)  # past the #region line
        self.assertEqual((lines["<enum>"], lines["A = 1"]), (13, 16))

    def test_the_line_is_not_part_of_a_members_identity(self):
        moved = "\n\n\n" + self.SRC
        self.assertFalse(diff_surfaces(file_surface("src/A.cs", self.SRC), file_surface("src/A.cs", moved)))


class MemberSignatures(unittest.TestCase):
    def test_async_and_non_visible_accessibility_are_not_part_of_the_contract(self):
        before = file_surface("src/A.cs", "namespace N; public class A { public async Task Go() { } private protected void Hook() { } }")
        after = file_surface("src/A.cs", "namespace N; public class A { public Task Go() { } }")
        self.assertEqual([m.signature for m in before], ["<class>", "public Task Go()"])
        self.assertFalse(diff_surfaces(before, after))

    def test_accessors_and_defaults_are_kept_but_method_bodies_are_not(self):
        sigs = surface("""namespace N;
public sealed class A
{
    [Obsolete("x")]
    public int Count { get; private set; } = 5;
    public int Calc(int a) { return a + 1; }
    public int Expr(int a) => a * 2;
    private int hidden;
    protected virtual void Hook() { }
    public A(int x) : this(x, 0) { }
    public A(int x, int y) { }
    public event EventHandler Changed;
}""")
        self.assertEqual(sigs, [
            "<sealed class>",
            "public int Count {get;privateset;} = 5",
            "public int Calc(int a)",
            "public int Expr(int a)",
            "protected virtual void Hook()",
            "public A(int x)",
            "public A(int x, int y)",
            "public event EventHandler Changed",
        ])

    def test_interface_members_are_public_and_enum_values_are_kept(self):
        self.assertEqual(surface("namespace N; public interface I { void Do(int a); int P { get; } }"), ["<interface>", "void Do(int a)", "int P {get;}"])
        self.assertEqual(surface("namespace N; public enum E : byte { A = 1, B = 2 }"), ["<enum : byte>", "A = 1", "B = 2"])

    def test_body_comment_and_formatting_changes_are_invisible_but_signature_and_default_changes_are_not(self):
        before = file_surface("src/A.cs", "namespace N; public class A { public int F(int a) { return 1; } public int P { get; set; } = 1; }")
        body_only = file_surface("src/A.cs", "namespace N; public class A {\n // changed\n public int F(int a) { return 2 + a; }\n public int P { get; set; } = 1; }")
        self.assertFalse(diff_surfaces(before, body_only))

        changed = file_surface("src/A.cs", "namespace N; public class A { public long F(int a) { return 1; } public int P { get; set; } = 2; }")
        diff = diff_surfaces(before, changed)
        self.assertEqual([m.signature for m in diff.removed], ["public int F(int a)", "public int P {get;set;} = 1"])
        self.assertEqual([m.signature for m in diff.added], ["public long F(int a)", "public int P {get;set;} = 2"])

    def test_member_name_of_a_signature(self):
        self.assertEqual(member_name("public static int Encode(ReadOnlySpan<byte> input)"), "Encode")
        self.assertEqual(member_name("public int Count {get;set;} = 5"), "Count")
        self.assertEqual(member_name("public event EventHandler Changed"), "Changed")
        self.assertEqual(member_name("Alpha = 1"), "Alpha")


if __name__ == "__main__":
    unittest.main()
