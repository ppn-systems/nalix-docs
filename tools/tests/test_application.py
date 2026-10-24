import unittest

from docsync.application.ports import SyncError
from docsync.application.use_cases import AuditDocs, CheckDrift, DriftStatus, RecordSnapshot
from docsync.domain.markdown import DocFile
from docsync.domain.snapshot import Manifest, SourceSnapshot

HUB = "src/Nalix.Net/Hub.cs"


def hub(extra: str = "", body: str = "") -> str:
    return f"namespace Nalix.Net;\npublic sealed class Hub\n{{\n{extra}\n    public void Run() {{ {body} }}\n}}\n"


class FakeSource:
    def __init__(self, snapshots: dict[str, SourceSnapshot], fail_for: set[str] = frozenset()):
        self.snapshots, self.fail_for = snapshots, fail_for

    def resolve(self, ref: str) -> str:
        return {"HEAD": "new"}.get(ref, ref)

    def read(self, commit: str) -> SourceSnapshot:
        if commit in self.fail_for:
            raise SyncError("gone")
        return self.snapshots[commit]


class FakeStore:
    def __init__(self, manifest: Manifest = Manifest(), index: dict | None = None):
        self.manifest, self.index, self.saved = manifest, index, None

    def load_manifest(self) -> Manifest:
        return self.manifest

    def load_index(self) -> dict:
        return self.index

    def save(self, snapshot, index) -> None:
        self.saved = (snapshot, index)


class FakeDocs:
    def __init__(self, *pages: DocFile):
        self._pages = list(pages)

    def pages(self) -> list[DocFile]:
        return self._pages


def snapshot(commit: str, text: str) -> SourceSnapshot:
    return SourceSnapshot(commit, {HUB: text}, (HUB, "README.md"))


def synced(text: str) -> Manifest:
    return Manifest("old", snapshot("old", text).hashes())


class CheckDriftTests(unittest.TestCase):
    def run_check(self, old_text, new_text, docs=(), fail_for=frozenset()):
        source = FakeSource({"old": snapshot("old", old_text), "new": snapshot("new", new_text)}, set(fail_for))
        return CheckDrift(source, source, FakeStore(synced(old_text)), FakeDocs(*docs))("HEAD")

    def test_nothing_changed(self):
        self.assertIs(self.run_check(hub(), hub()).status, DriftStatus.IN_SYNC)

    def test_comment_and_format_only_changes_are_not_drift(self):
        self.assertIs(self.run_check(hub(), "// note\n" + hub().replace("\n", "\r\n")).status, DriftStatus.IN_SYNC)

    def test_internal_changes_leave_the_docs_alone(self):
        result = self.run_check(hub(body="A();"), hub(body="B();"))
        self.assertIs(result.status, DriftStatus.NOTHING_FOR_DOCS)
        self.assertEqual(len(result.report.internal), 1)

    def test_a_new_public_member_needs_docs(self):
        result = self.run_check(hub(), hub("public void Stop() { }"))
        self.assertIs(result.status, DriftStatus.NEEDS_DOCS)
        self.assertEqual(len(result.report.api), 1)

    def test_an_unavailable_previous_version_is_reported_and_treated_conservatively(self):
        warnings: list[str] = []
        source = FakeSource({"old": snapshot("old", hub()), "new": snapshot("new", hub(body="B();"))}, {"old"})
        result = CheckDrift(source, source, FakeStore(synced(hub())), FakeDocs())("HEAD", warn=warnings.append)
        self.assertFalse(result.previous_available)
        self.assertIs(result.status, DriftStatus.NEEDS_DOCS)
        self.assertEqual(len(warnings), 1)

    def test_a_first_run_without_a_manifest_treats_everything_as_new(self):
        source = FakeSource({"new": snapshot("new", hub())})
        result = CheckDrift(source, source, FakeStore(), FakeDocs())("HEAD")
        self.assertIs(result.status, DriftStatus.NEEDS_DOCS)


class RecordSnapshotTests(unittest.TestCase):
    def test_stores_the_manifest_hashes_and_an_index_for_the_same_commit(self):
        store = FakeStore()
        RecordSnapshot(store)(snapshot("abc", hub()))
        saved, index = store.saved
        self.assertEqual(index["nalixCommit"], "abc")
        self.assertEqual([t["name"] for t in index["types"]], ["Hub"])
        self.assertEqual(index["files"], ["README.md", HUB])


class AuditDocsTests(unittest.TestCase):
    INDEX = {"types": [{"name": "Hub", "kind": "class", "namespace": "N", "file": "src/Hub.cs", "modifiers": []}],
             "options": {}, "enums": {}, "identifiers": [], "files": ["src/Hub.cs"]}

    def test_accepted_findings_are_filtered_out(self):
        audit = AuditDocs(FakeStore(index=self.INDEX), FakeDocs(DocFile("a.md", "nothing here")))
        self.assertEqual([f.key for f in audit()], ["A010||Hub"])
        self.assertEqual(audit(frozenset({"A010||Hub"})), [])


if __name__ == "__main__":
    unittest.main()
