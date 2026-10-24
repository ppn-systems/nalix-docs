"""Command line: ``python tools/run.py <sync-check|sync-update|audit> [options]``."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from .application.ports import SyncError
from .application.use_cases import AuditDocs, CheckDrift, DriftStatus, RecordSnapshot
from .domain.findings import Severity
from .domain.report import render_report, truncate_report
from .infrastructure.sources import GitHubSource, LocalSource
from .infrastructure.stores import DocsDirectory, JsonSnapshotStore

ROOT = Path(__file__).resolve().parents[2]
DOCS_DIR = ROOT / "src" / "content" / "docs" / "en-us"
DEFAULT_REPO = "ppn-systems/nalix"


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="run.py", description="Keep the docs in sync with the Nalix source.")
    sub = parser.add_subparsers(dest="command", required=True)

    def source_options(p: argparse.ArgumentParser) -> None:
        p.add_argument("--ref", default="HEAD", help="Nalix branch, tag or commit (default HEAD)")
        p.add_argument("--repo", default=DEFAULT_REPO, help="owner/name on GitHub")
        p.add_argument("--source", help="read a local clone instead of GitHub")

    check = sub.add_parser("sync-check", help="classify Nalix changes since the last synced commit")
    source_options(check)
    check.add_argument("--report", help="write the full Markdown report")
    check.add_argument("--pr-body", help="write a size-capped Markdown report for a PR body")
    check.add_argument("--json", help="write the report as JSON")
    check.add_argument("--update", action="store_true", help="record the new snapshot when the docs are affected")

    update = sub.add_parser("sync-update", help="record the current Nalix commit as synced")
    source_options(update)

    audit = sub.add_parser("audit", help="check the docs against the stored API index")
    audit.add_argument("--index", help="API index file (default source-api-index.json)")
    audit.add_argument("--baseline", help="JSON file of accepted findings")
    audit.add_argument("--json", help="write findings as JSON")
    audit.add_argument("--markdown", help="write findings as Markdown (empty when none)")
    return parser


def _source(args: argparse.Namespace):
    if args.source or _env("NALIX_SOURCE"):
        return LocalSource(Path(args.source or _env("NALIX_SOURCE")).resolve())
    return GitHubSource(args.repo)


def _env(name: str) -> str | None:
    import os

    return os.environ.get(name)


def _sync_check(args: argparse.Namespace) -> int:
    store = JsonSnapshotStore(ROOT)
    result = CheckDrift(_source(args), GitHubSource(args.repo), store, DocsDirectory(DOCS_DIR))(
        args.ref, warn=lambda message: print(f"warning: {message}", file=sys.stderr)
    )
    print(f"Manifest: {result.manifest_commit or 'none'}  ->  Source: {result.snapshot.commit}")
    if result.status is DriftStatus.IN_SYNC:
        print("Docs are in sync with source (no meaningful file changes).")
        return 0

    report = result.report
    markdown = render_report(args.repo, result.manifest_commit, result.snapshot.commit, report)
    print(f"\n{markdown}")
    if args.report:
        Path(args.report).write_text(markdown, encoding="utf-8")
    if args.pr_body:
        Path(args.pr_body).write_text(truncate_report(markdown), encoding="utf-8")
    if args.json:
        payload = {"from": result.manifest_commit, "to": result.snapshot.commit, "report": asdict(report)}
        Path(args.json).write_text(json.dumps(payload, indent=2), encoding="utf-8")

    if result.status is DriftStatus.NOTHING_FOR_DOCS:
        print(f"\nNothing for the docs to do: {len(report.reflected)} API change(s) already documented, {len(report.internal)} internal change(s) ignored.")
        return 0
    if args.update:
        RecordSnapshot(store)(result.snapshot)
        print(f"source-manifest.json + source-api-index.json updated @ {result.snapshot.commit}")
    return 1


def _sync_update(args: argparse.Namespace) -> int:
    source = _source(args)
    snapshot = source.read(source.resolve(args.ref))
    RecordSnapshot(JsonSnapshotStore(ROOT))(snapshot)
    print(f"source-manifest.json + source-api-index.json updated: {len(snapshot.files)} files @ {snapshot.commit}")
    return 0


def _audit(args: argparse.Namespace) -> int:
    store = JsonSnapshotStore(ROOT)
    index_data = json.loads(Path(args.index).read_text(encoding="utf-8")) if args.index else None
    accepted = frozenset(json.loads(Path(args.baseline).read_text(encoding="utf-8")).get("accepted", {})) if args.baseline else frozenset()
    findings = AuditDocs(store, DocsDirectory(DOCS_DIR))(accepted, index_data)

    if args.json:
        Path(args.json).write_text(json.dumps([f.to_dict() for f in findings], indent=2), encoding="utf-8")
    body = _render_findings(findings)
    if args.markdown:
        Path(args.markdown).write_text(f"## Docs vs source audit\n\n{body}" if findings else "", encoding="utf-8")
    print(body)
    counts = {s: sum(1 for f in findings if f.severity is s) for s in Severity}
    print(f"errors: {counts[Severity.ERROR]}, warnings: {counts[Severity.WARN]}, gaps: {counts[Severity.GAP]}")
    return 1 if counts[Severity.ERROR] else 0


def _render_findings(findings) -> str:
    out: list[str] = []
    for severity in Severity:
        group = [f for f in findings if f.severity is severity]
        if group:
            out += [f"## {severity.value} ({len(group)})", "", *(f"- {f}" for f in group), ""]
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    handlers = {"sync-check": _sync_check, "sync-update": _sync_update, "audit": _audit}
    try:
        return handlers[args.command](args)
    except SyncError as error:
        print(error, file=sys.stderr)
        return 2
