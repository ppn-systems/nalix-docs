import io
import json
import tarfile
import tempfile
import unittest
import urllib.error
from email.message import Message
from pathlib import Path
from unittest import mock

from docsync.application.ports import SyncError
from docsync.domain.snapshot import SourceSnapshot, is_tracked
from docsync.infrastructure.github import GitHubApi
from docsync.infrastructure.sources import GitHubSource, LocalSource
from docsync.infrastructure.stores import DocsDirectory, JsonSnapshotStore
from docsync.infrastructure.tarball import read_tarball


def tarball(files: dict[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for name, data in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


def http_error(code: int, headers: dict[str, str] | None = None) -> urllib.error.HTTPError:
    message = Message()
    for key, value in (headers or {}).items():
        message[key] = value
    return urllib.error.HTTPError("https://api.github.com/x", code, "err", message, io.BytesIO(b"body"))


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class Tarball(unittest.TestCase):
    def test_strips_the_top_folder_reads_only_wanted_files_and_lists_every_path(self):
        data = tarball({"repo-abc/src/A/A.cs": b"class A {}", "repo-abc/src/A/obj/G.cs": b"x", "repo-abc/README.md": b"hi"})
        texts, paths = read_tarball(data, is_tracked)
        self.assertEqual(list(texts), ["src/A/A.cs"])
        self.assertEqual(paths, ["README.md", "src/A/A.cs", "src/A/obj/G.cs"])

    def test_a_corrupt_download_is_reported(self):
        with self.assertRaises(SyncError):
            read_tarball(b"not a tarball", is_tracked)


class GitHubApiRetries(unittest.TestCase):
    def api(self, attempts=4):
        self.sleeps: list[float] = []
        return GitHubApi(token="t", attempts=attempts, sleep=self.sleeps.append)

    def test_retries_server_errors_with_growing_delays_then_succeeds(self):
        with mock.patch("urllib.request.urlopen", side_effect=[http_error(503), http_error(502), FakeResponse(b'{"ok": true}')]):
            self.assertEqual(self.api().get_json("/x"), {"ok": True})
        self.assertEqual(self.sleeps, [2, 4])

    def test_retries_network_errors_and_gives_up_after_the_last_attempt(self):
        with mock.patch("urllib.request.urlopen", side_effect=urllib.error.URLError("down")):
            with self.assertRaisesRegex(SyncError, "network error"):
                self.api(attempts=3).get_bytes("/x")
        self.assertEqual(len(self.sleeps), 2)

    def test_not_found_and_exhausted_rate_limits_fail_fast_with_a_clear_message(self):
        with mock.patch("urllib.request.urlopen", side_effect=http_error(404)):
            with self.assertRaisesRegex(SyncError, "not found"):
                self.api().get_bytes("/x")
        with mock.patch("urllib.request.urlopen", side_effect=http_error(403, {"x-ratelimit-remaining": "0", "x-ratelimit-reset": "1893456000"})):
            with self.assertRaisesRegex(SyncError, "rate limit exhausted until 2030"):
                self.api().get_bytes("/x")
        self.assertEqual(self.sleeps, [])

    def test_other_client_errors_are_not_retried(self):
        with mock.patch("urllib.request.urlopen", side_effect=http_error(422)):
            with self.assertRaisesRegex(SyncError, "HTTP 422"):
                self.api().get_bytes("/x")
        self.assertEqual(self.sleeps, [])


class GitHubSourceTests(unittest.TestCase):
    def test_resolves_refs_and_reads_a_commit(self):
        api = mock.Mock()
        api.get_json.return_value = {"sha": "c" * 40}
        api.get_bytes.return_value = tarball({"r-c/src/A.cs": b"class A {}", "r-c/docs/x.md": b"x"})
        source = GitHubSource("o/r", api)
        self.assertEqual(source.resolve("feature/x"), "c" * 40)
        api.get_json.assert_called_with("/repos/o/r/commits/feature%2Fx")
        snapshot = source.read("c" * 40)
        self.assertEqual(snapshot.files, {"src/A.cs": "class A {}"})
        self.assertEqual(snapshot.all_paths, ("docs/x.md", "src/A.cs"))

    def test_a_commit_without_tracked_files_is_refused(self):
        api = mock.Mock()
        api.get_bytes.return_value = tarball({"r-c/README.md": b"x"})
        with self.assertRaisesRegex(SyncError, "No tracked files"):
            GitHubSource("o/r", api).read("c" * 40)


class LocalSourceTests(unittest.TestCase):
    def test_reads_tracked_files_from_the_working_tree(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "src/A/obj").mkdir(parents=True)
            (root / "src/A/A.cs").write_text("class A {}", encoding="utf-8")
            (root / "src/A/obj/G.cs").write_text("x", encoding="utf-8")
            (root / "README.md").write_text("x", encoding="utf-8")
            source = LocalSource(root)
            self.assertEqual(source.resolve("HEAD"), "working-tree")  # not a git repository
            self.assertEqual(source.read("working-tree").files, {"src/A/A.cs": "class A {}"})
            with self.assertRaises(SyncError):
                LocalSource(root / "src/A/obj").read("x")


class Stores(unittest.TestCase):
    def test_manifest_and_index_round_trip(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = JsonSnapshotStore(Path(tmp))
            self.assertEqual(store.load_manifest().commit, None)
            snapshot = SourceSnapshot("abc", {"src/A.cs": "class A {}"}, ("src/A.cs",))
            store.save(snapshot, {"nalixCommit": "abc", "types": []})
            manifest = store.load_manifest()
            self.assertEqual((manifest.commit, list(manifest.files)), ("abc", ["src/A.cs"]))
            self.assertEqual(store.load_index()["nalixCommit"], "abc")

    def test_an_invalid_manifest_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = JsonSnapshotStore(Path(tmp))
            store.manifest_path.write_text("{ nope", encoding="utf-8")
            with self.assertRaisesRegex(SyncError, "not valid JSON"):
                store.load_manifest()

    def test_docs_directory_lists_markdown_pages_relative_to_its_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "api").mkdir()
            (root / "api/a.md").write_text("A", encoding="utf-8")
            (root / "b.md").write_text("B", encoding="utf-8")
            (root / "c.txt").write_text("C", encoding="utf-8")
            self.assertEqual([p.path for p in DocsDirectory(root).pages()], ["api/a.md", "b.md"])


if __name__ == "__main__":
    unittest.main()
