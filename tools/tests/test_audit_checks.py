import unittest

from docsync.domain.api_view import ApiIndex
from docsync.domain.audit import DocsAuditor
from docsync.domain.defaults import doc_default_values, matches, parse_source_default
from docsync.domain.markdown import DocFile, kebab

INDEX = ApiIndex({
    "files": ["src/Nalix.Net/Hub.cs", "src/Nalix.Net/Options/HubOptions.cs", "samples/Chat/README.md"],
    "types": [
        {"name": "Hub", "kind": "class", "namespace": "Nalix.Net", "file": "src/Nalix.Net/Hub.cs", "modifiers": []},
        {"name": "HubOptions", "kind": "class", "namespace": "Nalix.Net.Options", "file": "src/Nalix.Net/Options/HubOptions.cs", "modifiers": []},
        {"name": "Mode", "kind": "enum", "namespace": "Nalix.Net", "file": "src/Nalix.Net/Hub.cs", "modifiers": []},
        {"name": "Orphan", "kind": "class", "namespace": "Nalix.Net", "file": "src/Nalix.Net/Orphan.cs", "modifiers": []},
        {"name": "RateAttribute", "kind": "class", "namespace": "Nalix.Net", "file": "src/Nalix.Net/Rate.cs", "modifiers": []},
    ],
    "internalTypes": [{"name": "Wheel", "kind": "class", "namespace": "Nalix.Net.Internal", "file": "src/Nalix.Net/Internal/Wheel.cs"}],
    "namespaces": ["Nalix.Net", "Nalix.Net.Options", "Nalix.Net.Internal"],
    "options": {"HubOptions": {"namespace": "Nalix.Net.Options", "properties": [
        {"name": "Max", "type": "int", "default": "2_000"},
        {"name": "Wait", "type": "TimeSpan", "default": "TimeSpan.FromMinutes(5)"},
        {"name": "Fast", "type": "bool", "default": "true"},
    ]}},
    "enums": {"Mode": {"namespace": "Nalix.Net", "members": ["Fast", "Slow"]}},
    "identifiers": ["HubOptions", "Fast", "Slow", "Connect", "Orphan", "Wheel"],
})


def page(path: str, body: str) -> DocFile:
    return DocFile(path, f"---\ntitle: T\n---\n{body}")


MENTION = page("api/all.md", "`Hub` `HubOptions` `Mode` `Orphan` `RateAttribute`")


def audit(*docs: DocFile):
    return DocsAuditor().audit(INDEX, [MENTION, *docs])


def codes(*docs: DocFile) -> list[str]:
    return [f.code for f in audit(*docs)]


def subjects(*docs: DocFile) -> list[str]:
    import re
    return [f"{f.code}:{re.search(r'`([\w.]+)`', f.message).group(1)}" for f in audit(*docs)]


class Defaults(unittest.TestCase):
    def test_source_literals(self):
        self.assertEqual(parse_source_default("2_000").value, 2000.0)
        self.assertEqual(parse_source_default("TimeSpan.FromMinutes(5)").value, 300.0)
        self.assertIs(parse_source_default("true").value, True)
        self.assertIsNone(parse_source_default("SomeConstant"))

    def test_the_many_ways_docs_write_a_default(self):
        self.assertIn(2000.0, doc_default_values("`2_000` (`2000`)", "number"))
        self.assertEqual(doc_default_values("`00:05:00` (`5m`)", "time"), [300.0, 300.0])
        self.assertEqual(doc_default_values("1.00:00:00", "time"), [86400.0])
        self.assertEqual(doc_default_values("`true`", "bool"), [True])
        self.assertTrue(matches(parse_source_default("128"), doc_default_values("`128`", "number")))

    def test_kebab_case(self):
        self.assertEqual(kebab("ConnectionGuardOptions"), "connection-guard-options")
        self.assertEqual(kebab("TCPListener"), "tcp-listener")


class SourcePaths(unittest.TestCase):
    def test_a001_accepts_files_folders_and_package_paths_and_flags_missing_ones(self):
        ok = page("a.md", "- `src/Nalix.Net/Hub.cs`\n- `src/Nalix.Net`\n- `samples/Chat/README.md`\n- `analyzers/dotnet/cs`")
        self.assertEqual(codes(ok), [])
        self.assertEqual(codes(page("b.md", "- `src/Nalix.Net/Gone.cs`")), ["A001"])


class Namespaces(unittest.TestCase):
    def test_a002_namespace_must_exist_and_a_dedicated_page_must_match_its_type(self):
        self.assertEqual(codes(page("x.md", "**Namespace:** `Nalix.Nope`\n**Assembly:** `Nalix.Net`")), ["A002"])
        wrong = page("hub.md", "**Namespace:** `Nalix.Net.Options`\n**Assembly:** `Nalix.Net`\n\n`Hub` is the hub. `Hub` again.")
        self.assertEqual(codes(wrong), ["A002"])
        right = page("hub.md", "**Namespace:** `Nalix.Net`\n**Assembly:** `Nalix.Net`\n\n`Hub` is the hub. `Hub` again.")
        self.assertEqual(codes(right), [])
        internal = page("wheel.md", "**Namespace:** `Nalix.Net.Internal`\n**Assembly:** `Nalix.Net`\n`Wheel` `Wheel`")
        self.assertEqual(codes(internal), [])


class OptionsTables(unittest.TestCase):
    TABLE = "| Property | Type | Default |\n| :-- | :-- | :-- |\n"

    def test_a003_a004_a_correct_table_is_clean(self):
        good = page("hub-options.md", "`HubOptions`\n\n" + self.TABLE + "| `Max` | `int` | `2_000` (`2000`) |\n| `Wait` | `TimeSpan` | `00:05:00` |\n| `Fast` | `bool` | `true` |")
        self.assertEqual(codes(good), [])

    def test_a003_a004_wrong_defaults_unknown_and_missing_properties(self):
        bad = page("hub-options.md", "`HubOptions`\n\n" + self.TABLE + "| `Max` | `int` | `1000` |\n| `Wait` | `TimeSpan` | `00:10:00` |\n| `Ghost` | `int` | `1` |")
        self.assertEqual(sorted(subjects(bad)), ["A003:Ghost", "A003:HubOptions.Fast", "A004:HubOptions.Max", "A004:HubOptions.Wait"])

    def test_tables_about_other_types_are_left_alone_on_non_dedicated_pages(self):
        other = page("policy.md", "`HubOptions` is the fallback.\n\n```csharp\npublic sealed class RateAttribute { public int Max { get; init; } = -1; }\n```\n\n" + self.TABLE + "| `Max` | `int` | `-1` |")
        self.assertEqual(codes(other), [])


class Enums(unittest.TestCase):
    def test_a005_a_section_may_not_list_a_member_the_enum_lacks(self):
        enums = page("enums.md", "## `Mode`\n\n| Value | Meaning |\n| :-- | :-- |\n| `Fast` | f |\n| `Turbo` | t |")
        self.assertEqual(subjects(enums), ["A005:Mode.Turbo"])


class MemberReferences(unittest.TestCase):
    def test_a006_ignores_paths_short_names_and_existing_members(self):
        refs = page("r.md", "Use `Hub.Connect` and `Mode.Slow`.\n\n- `Hub.Foo.cs`\n- `Hub.Get`\n")
        self.assertEqual(codes(refs), [])

    def test_a006_flags_stale_references_in_prose_and_code(self):
        stale = page("r.md", "Use `Hub.Removed` and `Mode.Turbo`.\n\n```csharp\nvar x = Hub.AlsoGone;\n```")
        self.assertEqual(subjects(stale), ["A006:Hub.Removed", "A006:Mode.Turbo", "A006:Hub.AlsoGone"])


class UndocumentedTypes(unittest.TestCase):
    def test_a010_lists_public_types_no_page_mentions(self):
        findings = DocsAuditor().audit(INDEX, [page("x.md", "`Hub` `HubOptions` `Mode` `RateAttribute`")])
        self.assertEqual([f.key for f in findings if f.code == "A010"], ["A010||Orphan"])


if __name__ == "__main__":
    unittest.main()
