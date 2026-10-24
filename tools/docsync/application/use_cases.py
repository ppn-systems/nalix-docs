"""The three things the tooling does: check for drift, record a snapshot, audit the docs."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from ..domain.api_index import SourceFile, build_api_index
from ..domain.api_view import ApiIndex
from ..domain.audit import DocsAuditor
from ..domain.classifier import ChangeClassifier, ChangeReport
from ..domain.findings import Finding
from ..domain.snapshot import ChangeSet, Manifest, SourceSnapshot
from .ports import DocsRepository, SnapshotStore, SourceReader, SyncError


class DriftStatus(str, Enum):
    IN_SYNC = "in-sync"  # no meaningful file changed
    NOTHING_FOR_DOCS = "nothing-for-docs"  # files changed, none of it matters to the docs
    NEEDS_DOCS = "needs-docs"


@dataclass(frozen=True)
class DriftResult:
    manifest_commit: str | None
    snapshot: SourceSnapshot
    changes: ChangeSet
    report: ChangeReport | None
    previous_available: bool

    @property
    def status(self) -> DriftStatus:
        if self.report is None:
            return DriftStatus.IN_SYNC
        return DriftStatus.NEEDS_DOCS if self.report.needs_docs else DriftStatus.NOTHING_FOR_DOCS


class CheckDrift:
    """Compares a Nalix commit with the one the docs were last synced to."""

    def __init__(self, source: SourceReader, history: SourceReader, store: SnapshotStore, docs: DocsRepository) -> None:
        self._source, self._history, self._store, self._docs = source, history, store, docs

    def __call__(self, ref: str, warn=lambda message: None) -> DriftResult:
        snapshot = self._source.read(self._source.resolve(ref))
        manifest = self._store.load_manifest()
        changes = ChangeSet.between(manifest.files, snapshot.hashes())
        if not len(changes):
            return DriftResult(manifest.commit, snapshot, changes, None, True)

        # The previous version tells API changes from internal ones; without it every API file counts as changed.
        previous: dict[str, str] | None = None
        if manifest.commit:
            try:
                previous = self._history.read(manifest.commit).files
            except SyncError as error:
                warn(f"previous version {manifest.commit[:7]} unavailable ({error}); classification is conservative.")
        report = ChangeClassifier(self._docs.pages()).classify(changes, previous, snapshot.files)
        return DriftResult(manifest.commit, snapshot, changes, report, previous is not None)


class RecordSnapshot:
    """Stores the manifest and the API index of a commit as the new synced state."""

    def __init__(self, store: SnapshotStore) -> None:
        self._store = store

    def __call__(self, snapshot: SourceSnapshot) -> None:
        index = {
            "nalixCommit": snapshot.commit,
            **build_api_index((SourceFile(p, t) for p, t in snapshot.files.items()), snapshot.all_paths),
        }
        self._store.save(snapshot, index)


class AuditDocs:
    """Checks the docs against the stored API index, minus accepted findings."""

    def __init__(self, store: SnapshotStore, docs: DocsRepository, auditor: DocsAuditor | None = None) -> None:
        self._store, self._docs, self._auditor = store, docs, auditor or DocsAuditor()

    def __call__(self, accepted: frozenset[str] = frozenset(), index_data: dict | None = None) -> list[Finding]:
        index = ApiIndex(index_data if index_data is not None else self._store.load_index())
        return [f for f in self._auditor.audit(index, self._docs.pages()) if f.key not in accepted]
