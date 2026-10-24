import unittest
from collections import Counter

from docsync.domain.citations import cited_by, collect_citations
from docsync.domain.classifier import ChangeClassifier, relevant_tokens
from docsync.domain.markdown import DocFile
from docsync.domain.report import render_report, truncate_report
from docsync.domain.snapshot import ChangeSet

HUB = "src/Nalix.Net/Hub.cs"


def hub(body: str, extra: str = "") -> str:
    return f"namespace Nalix.Net;\npublic sealed class Hub\n{{\n{extra}\n    public int Count {{ get; set; }} = 5;\n    public void Run() {{ {body} }}\n}}\n"


DOCS = [
    DocFile("api/hub.md", "The `Hub` type.\n\n- `src/Nalix.Net/Hub.cs`\n\n`MaxRetries` is 5.\n```csharp\nhub.Run();\n```\n"),
    DocFile("api/other.md", "See `Hub.Count` and `src/Nalix.Net`.\n"),
]
MODIFIED = ChangeSet(modified=(HUB,))


class Citations(unittest.TestCase):
    def test_cited_paths_map_to_pages_and_package_wide_citations_are_ignored(self):
        citations = collect_citations(DOCS)
        self.assertEqual(list(citations), [HUB])
        self.assertEqual(cited_by(HUB, citations), ["api/hub.md"])
        self.assertEqual(cited_by("src/Nalix.Net/Other.cs", citations), [])

    def test_folder_citations_match_files_inside_them(self):
        citations = collect_citations([DocFile("g.md", "`samples/Chat/Server`")])
        self.assertEqual(cited_by("samples/Chat/Server/Program.cs", citations), ["g.md"])
        self.assertEqual(cited_by("samples/Chat/ServerX/Program.cs", citations), [])


class Classification(unittest.TestCase):
    def classify(self, old, new, docs=DOCS, changes=MODIFIED):
        old_files = None if old is None else ({HUB: old} if old != {} else {})
        return ChangeClassifier(docs).classify(changes, old_files, {HUB: new} if new is not None else {})

    def test_a_public_signature_change_the_docs_do_not_show_is_api(self):
        report = self.classify(hub(""), hub("", "public void Stop() { }"))
        self.assertEqual(len(report.api), 1)
        entry = report.api[0].entries[0]
        self.assertEqual((entry.sign, entry.type, entry.signature, entry.ok), ("+", "Nalix.Net.Hub", "public void Stop()", False))
        self.assertIn("api/hub.md", report.api[0].pages)

    def test_an_api_change_the_docs_already_contain_is_reflected(self):
        docs = [DocFile("api/hub.md", "Signature: `public void Stop()`\n`src/Nalix.Net/Hub.cs`")]
        report = self.classify(hub(""), hub("", "public void Stop() { }"), docs)
        self.assertEqual((len(report.api), len(report.reflected)), (0, 1))
        self.assertFalse(report.needs_docs)

    def test_docs_lines_that_still_mention_a_removed_member_are_pointed_at(self):
        docs = [DocFile("api/hub.md", "`Hub` has `Old` for compat.\n`src/Nalix.Net/Hub.cs`")]
        report = self.classify(hub("", "public void Old() { }"), hub(""), docs)
        self.assertEqual([(p.page, p.line) for p in report.api[0].pointers], [("api/hub.md", 1)])

    def test_a_body_change_is_behavior_only_when_the_page_mentions_what_changed(self):
        relevant = self.classify(hub("Go(3);"), hub("Go(MaxRetries);"))
        self.assertEqual(len(relevant.behavior), 1)
        self.assertIn("MaxRetries", relevant.behavior[0].tokens)
        self.assertEqual(relevant.behavior[0].pages, ("api/hub.md",))

        unrelated = self.classify(hub("Go(3);"), hub("Go(3); Cleanup();"))
        self.assertEqual((len(unrelated.behavior), len(unrelated.internal)), (0, 1))

    def test_body_changes_in_files_no_page_cites_are_ignored(self):
        report = self.classify(hub("A();"), hub("B();"), docs=[DocFile("x.md", "nothing")])
        self.assertEqual(report.counts(), Counter(api=0, reflected=0, behavior=0, internal=1))

    def test_every_api_file_counts_as_changed_when_the_previous_version_is_unavailable(self):
        report = ChangeClassifier(DOCS).classify(MODIFIED, None, {HUB: hub("")})
        self.assertEqual(len(report.api), 1)
        self.assertFalse(report.api[0].exact)

    def test_added_and_removed_files_are_judged_by_their_public_surface(self):
        added = ChangeClassifier([]).classify(ChangeSet(added=(HUB,)), {}, {HUB: hub("")})
        self.assertEqual(added.api[0].new_types, ("Hub",))
        removed = ChangeClassifier([DocFile("a.md", "The `Hub` type")]).classify(ChangeSet(removed=(HUB,)), {HUB: hub("")}, {})
        self.assertEqual(removed.api[0].removed_types, ("Hub",))

    def test_generic_words_and_words_found_in_many_files_do_not_prove_relevance(self):
        df = Counter({"Connection": 50, "MaxRetries": 1})
        self.assertEqual(relevant_tokens(["Connection MaxRetries return null"], ["Connection MaxRetries"], df), ["MaxRetries"])
        self.assertEqual(relevant_tokens(["limit = 4_096;"], ["limit 4096 bytes"], df), ["4096", "limit"])


class Rendering(unittest.TestCase):
    def test_tiers_diff_blocks_pointers_and_a_page_checklist(self):
        report = ChangeClassifier(DOCS).classify(MODIFIED, {HUB: hub("", "public void Old() { }")}, {HUB: hub("", "public void Stop() { }")})
        markdown = render_report("o/r", "a" * 40, "b" * 40, report)
        for expected in (
            "| 🔴 | Public API changed and the docs do not show it yet | 1 |",
            "```diff",
            "- public void Old()",
            "+ public void Stop()",
            "- [ ] `src/content/docs/en-us/api/hub.md`",
            f"compare/{'a' * 40}...{'b' * 40}",
        ):
            self.assertIn(expected, markdown)

    def test_truncation_never_leaves_a_code_fence_open(self):
        body = "intro\n```diff\n" + "x\n" * 500 + "```\nend"
        cut = truncate_report(body, 300)
        self.assertEqual(cut.count("```") % 2, 0)
        self.assertIn("Report truncated", cut)
        self.assertEqual(truncate_report("short", 300), "short")


class ChangeSets(unittest.TestCase):
    def test_added_removed_and_modified_files(self):
        changes = ChangeSet.between({"a": "1", "b": "2", "c": "3"}, {"a": "1", "b": "X", "d": "4"})
        self.assertEqual((changes.added, changes.removed, changes.modified), (("d",), ("c",), ("b",)))
        self.assertEqual(len(changes), 3)


if __name__ == "__main__":
    unittest.main()
