import unittest

from docsync.domain.api_view import ApiIndex
from docsync.domain.audit import DocsAuditor
from docsync.domain.checks.anchors import heading_ids, slugify
from docsync.domain.diagnostics import parse_diagnostics
from docsync.domain.enum_values import enum_values, evaluate
from docsync.domain.markdown import DocFile, parse_page
from docsync.domain.projects import parse_package_versions, parse_references, parse_version
from docsync.domain.signatures import parse_signature


def page(path: str, body: str) -> DocFile:
    return DocFile(path, f"---\ntitle: T\n---\n{body}")


def index(**extra) -> ApiIndex:
    data = {"files": [], "types": [], "options": {}, "enums": {}, "identifiers": []}
    data.update(extra)
    return ApiIndex(data)


def findings(idx: ApiIndex, *docs: DocFile, code: str):
    return [f for f in DocsAuditor().audit(idx, docs) if f.code == code]


class EnumValueEvaluation(unittest.TestCase):
    def test_literals_implicit_increments_flags_and_expressions(self):
        values = enum_values(["None = 0", "A = 1", "B", "C = A | 4", "D = 1 << 3", "E = (byte)0x10", "F = 0xFFu", "G = ~A", "H = Other.X"])
        self.assertEqual(values, {"None": 0, "A": 1, "B": 2, "C": 5, "D": 8, "E": 16, "F": 255, "G": -2})  # H is not constant here

    def test_nothing_but_integer_arithmetic_is_evaluated(self):
        for hostile in ("__import__('os').system('x')", "A.B", "'s'", "1 << 999", "f(1)"):
            self.assertIsNone(evaluate(hostile, {}), hostile)


class EnumValuesCheck(unittest.TestCase):
    IDX = index(enums={"ProtocolOpCode": {"namespace": "N", "members": ["SESSION_INIT", "SYSTEM_CONTROL"], "values": {"SESSION_INIT": 0, "SYSTEM_CONTROL": 1}}},
                types=[{"name": "ProtocolOpCode", "kind": "enum", "namespace": "N", "file": "src/A/P.cs", "modifiers": []}])

    def test_a_wrong_value_is_reported_in_the_notation_the_docs_use(self):
        doc = page("enums.md", "## `ProtocolOpCode`\n\n| Name | Value |\n| :-- | :-- |\n| `SESSION_INIT` | `0x0000` |\n| `SYSTEM_CONTROL` | `0x0002` |")
        (finding,) = findings(self.IDX, doc, code="A007")
        self.assertIn("`ProtocolOpCode.SYSTEM_CONTROL` is `0x0001` in the source but the docs say `0x0002`", finding.message)
        self.assertEqual(finding.line, 9)

    def test_correct_values_and_unknown_names_are_fine(self):
        doc = page("enums.md", "## `ProtocolOpCode`\n\n| `SESSION_INIT` | `0` |\n| `SYSTEM_CONTROL` | 1 |\n| `SOMETHING_ELSE` | `9` |")
        self.assertEqual(findings(self.IDX, doc, code="A007"), [])


class DiagnosticsCheck(unittest.TestCase):
    SOURCE = '''
        public static readonly DiagnosticDescriptor A = new(
            id: "NALIX001",
            title: "Duplicate \\"opcode\\"",
            messageFormat: "x",
            category: "Usage",
            defaultSeverity: DiagnosticSeverity.Warning,
            isEnabledByDefault: true);
        public static readonly DiagnosticDescriptor B = new(
            id: "NALIX002", title: "Second rule", messageFormat: "y", category: Category.Core,
            defaultSeverity: DiagnosticSeverity.Error, isEnabledByDefault: true);'''

    def test_descriptors_are_parsed_with_escaped_quotes(self):
        parsed = parse_diagnostics("analyzers/Nalix.Analyzers/D.cs", self.SOURCE)
        self.assertEqual(parsed["NALIX001"], {"title": 'Duplicate "opcode"', "severity": "Warning", "project": "Nalix.Analyzers"})
        self.assertEqual(parsed["NALIX002"]["severity"], "Error")

    def check(self, body: str):
        idx = index(diagnostics=parse_diagnostics("analyzers/Nalix.Analyzers/D.cs", self.SOURCE))
        return [f.message for f in findings(idx, page("codes.md", body), code="A008")]

    def test_unknown_ids_wrong_severities_and_changed_titles(self):
        messages = self.check("| `NALIX001` | Duplicate \"opcode\" | Error | Usage |\n| `NALIX002` | A totally different heading | Error | x |\n| `NALIX999` | Ghost | Error | x |")
        self.assertEqual(len(messages), 3)
        self.assertTrue(any("is Warning in the source but the docs say Error" in m for m in messages))
        self.assertTrue(any("is titled \"Second rule\"" in m for m in messages))
        self.assertTrue(any("`NALIX999` is documented but no analyzer" in m for m in messages))

    def test_harmless_title_formatting_differences_are_accepted(self):
        self.assertEqual(self.check("| `NALIX001` | Duplicate `\"opcode\"` | Warning | Usage |"), [])


class PackageGraphCheck(unittest.TestCase):
    PROJECTS = {
        "Nalix.Abstractions": {"references": [], "file": "src/Nalix.Abstractions/Nalix.Abstractions.csproj"},
        "Nalix.Environment": {"references": ["Nalix.Abstractions"], "file": "src/Nalix.Environment/Nalix.Environment.csproj"},
        "Nalix.Codec": {"references": ["Nalix.Environment", "Nalix.Abstractions"], "file": "src/Nalix.Codec/Nalix.Codec.csproj"},
        "Nalix.Hosting": {"references": ["Nalix.Codec", "Nalix.Abstractions"], "file": "src/Nalix.Hosting/Nalix.Hosting.csproj"},
    }
    NODES = 'A["Nalix.Abstractions"]\nE["Nalix.Environment"]\nC["Nalix.Codec"]\nH["Nalix.Hosting"]\n'

    def run_check(self, mermaid: str, extra: str = "", path: str = "packages/index.md"):
        doc = page(path, f"```mermaid\nflowchart TD\n{self.NODES}{mermaid}\n```\n{extra}")
        return [f.message for f in findings(index(projects=self.PROJECTS), doc, code="A009")]

    def test_a_reduced_diagram_is_fine_because_references_are_transitive(self):
        self.assertEqual(self.run_check("H --> C\nC --> E\nE --> A"), [])

    def test_an_invented_or_missing_dependency_is_reported(self):
        self.assertIn("the diagram shows `Nalix.Abstractions` -> `Nalix.Hosting` but no project reference", self.run_check("H --> C\nC --> E\nE --> A\nA --> H")[0])
        self.assertTrue(any("has no path from `Nalix.Codec` to `Nalix.Environment`" in m for m in self.run_check("H --> C\nE --> A")))

    def test_a_partial_diagram_is_not_asked_to_show_everything(self):
        doc = page("packages/nalix-environment.md", 'See:\n```mermaid\nflowchart TD\nE["Nalix.Environment"]\nC["Nalix.Codec"]\nA["Nalix.Abstractions"]\nC --> E\n```')
        self.assertEqual(findings(index(projects=self.PROJECTS), doc, code="A009"), [])

    def test_levels_are_the_longest_reference_chain(self):
        table = "| **0** | [**Nalix.Abstractions**](./a.md) |\n| **1** | [**Nalix.Environment**](./e.md) |\n| **2** | [**Nalix.Codec**](./c.md) |\n| **3** | [**Nalix.Hosting**](./h.md) |\n"
        chain = "H --> C\nC --> E\nE --> A"
        self.assertEqual(self.run_check(chain, table), [])
        self.assertTrue(any("`Nalix.Hosting` is level 3" in m and "table says 4" in m for m in self.run_check(chain, table.replace("**3**", "**4**"))))
        claim = page("packages/nalix-codec.md", "`Nalix.Codec` is the **Level 3** package.")
        self.assertEqual(len(findings(index(projects=self.PROJECTS), claim, code="A009")), 1)

    def test_project_files_are_parsed(self):
        csproj = '<Project><ItemGroup><ProjectReference Include="..\\Nalix.Framework\\Nalix.Framework.csproj" /><ProjectReference Include="../Nalix.Abstractions/Nalix.Abstractions.csproj"/></ItemGroup></Project>'
        self.assertEqual(parse_references(csproj), ["Nalix.Abstractions", "Nalix.Framework"])
        self.assertEqual(parse_version("<Project><PropertyGroup><Version>14.2.16</Version></PropertyGroup></Project>"), "14.2.16")
        self.assertEqual(parse_package_versions('<PackageReference Include="Nalix.SDK" Version="14.3.1" /><PackageReference Include="Other" Version="1.0.0" />'), ["14.3.1"])


class PackageVersionsCheck(unittest.TestCase):
    def check(self, body: str):
        idx = index(version="14.2.16", referencedVersions=["14.3.1"])
        return [f.message for f in findings(idx, page("g.md", body), code="A011")]

    def test_versions_newer_than_anything_the_repository_knows_are_reported(self):
        self.assertEqual(self.check('<PackageReference Include="Nalix.SDK" Version="14.3.1" />\ndotnet add package Nalix.SDK --version 14.2.0'), [])
        (message,) = self.check('<PackageReference Include="Nalix.SDK" Version="14.9.0" />')
        self.assertIn("14.9.0 is newer than any version the Nalix repository knows (14.3.1", message)
        self.assertEqual(len(self.check("dotnet add package Nalix.SDK --version 15.0.0")), 1)


class AnchorCheck(unittest.TestCase):
    def test_slugs_follow_the_heading_id_rules_of_the_site(self):
        self.assertEqual(slugify("1. Configuration & Validation"), "1-configuration--validation")
        self.assertEqual(slugify("The `Hub` [type](./x.md) <b>now</b>"), "the-hub-type-now")
        ids = heading_ids(parse_page(page("a.md", "## Setup\n\n## Setup\n\n```md\n## Not a heading\n```\n")))
        self.assertEqual(ids, {"setup", "setup-1"})

    def test_broken_anchors_get_a_suggestion_and_good_ones_pass(self):
        a = page("api/a.md", "## 1. Configuration & Validation\n\nSee [x](#1-configuration-validation) and [y](./b.md#details) and [z](./b.md#detail) and [w](./b.md#nope).\n")
        b = page("api/b.md", "## Details\n")
        found = findings(index(), a, b, code="A012")
        self.assertEqual(sorted(f.message.split("`")[1] for f in found), ["#1-configuration-validation", "./b.md#detail", "./b.md#nope"])
        self.assertTrue(any("did you mean `#1-configuration--validation`" in f.message for f in found))
        self.assertTrue(any("did you mean `#details`" in f.message for f in found))

    def test_links_to_unknown_pages_and_external_links_are_not_this_checks_business(self):
        a = page("api/a.md", "[x](./missing.md#a) [y](https://example.com/p#a) `[z](./b.md#nope)`")
        self.assertEqual(findings(index(), a, code="A012"), [])


class SignatureParsing(unittest.TestCase):
    def test_only_what_callers_see_is_kept(self):
        sig = parse_signature("public static async Task<int> Run<[DynamicallyAccessedMembers(All)] T>(this System.Net.Foo x, ref T value, int n = 1, params string[] rest)")
        self.assertEqual((sig.name, sig.arity, sig.params), ("Run", 1, ("Foo", "T", "int", "string[]")))
        self.assertIsNone(parse_signature("var x = Foo(1);"))


class SignaturesCheck(unittest.TestCase):
    IDX = index(signatures={"Await": [
        {"type": "N.Ext", "arity": 0, "params": ["ITransport", "Func<Control,bool>", "int"], "signature": "public static Task Await(this ITransport t, Func<Control, bool> p, int ms)", "file": "src/Ext.cs", "line": 12},
    ]})

    def check(self, body: str):
        return findings(self.IDX, page("api/ext.md", body), code="A013")

    def test_an_overload_that_does_not_exist_is_reported_with_the_real_ones(self):
        (found,) = self.check("```csharp\npublic static Task Await(this ITransport t, ControlType type, uint seq = 0);\n```")
        self.assertIn("is not an overload of `Await`", found.message)
        self.assertIn("src/Ext.cs#L12", found.message)

    def test_existing_overloads_abbreviations_bodies_and_user_code_pass(self):
        self.assertEqual(self.check("```csharp\npublic static Task Await(this ITransport client, Func<Control, bool> predicate, int timeoutMs);\n```"), [])
        self.assertEqual(self.check("```csharp\npublic Task Await(ITransport t, int a, ...);\n```"), [])
        self.assertEqual(self.check("```csharp\npublic Task Await(int x) => Task.CompletedTask;\n```"), [])
        self.assertEqual(self.check("```csharp\nvar x = Await(1, 2);\n```"), [])
        self.assertEqual(self.check("```text\npublic Task Await(int x);\n```"), [])

    def test_table_code_spans_are_checked_too(self):
        self.assertEqual(len(self.check("| Name | Signature |\n| :-- | :-- |\n| `Await` | `Task Await(ITransport t, int ms)` |")), 1)


if __name__ == "__main__":
    unittest.main()
