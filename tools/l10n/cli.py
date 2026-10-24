"""Command line: ``python3 tools/l10n.py <status|check|plan|stamp|fix-anchors|fix-numbers|nav-missing|nav-apply> --locale <code>``."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .application.ports import L10nError
from .application.use_cases import ApplyNavTitles, CheckLocale, FixAnchors, FixNumbers, ListMissingNavTitles, PlanLocale, StampLocale, State, Status
from .domain.findings import Severity
from .infrastructure.files import DocsFolders, JsonLocks
from .infrastructure.navigation import NavigationFile

ROOT = Path(__file__).resolve().parents[2]
CANONICAL = "en-us"


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="l10n.py", description="Keep translated pages in step with the English ones.")
    sub = parser.add_subparsers(dest="command", required=True)

    def locale_option(p: argparse.ArgumentParser) -> None:
        p.add_argument("--locale", required=True, help="translation folder, for example vi-vn")

    status = sub.add_parser("status", help="how much of the site is translated, by section")
    locale_option(status)
    status.add_argument("--json", action="store_true")

    check = sub.add_parser("check", help="compare translated pages with the English ones; exit 1 on errors")
    locale_option(check)
    check.add_argument("pages", nargs="*", help="only these pages (paths relative to the locale folder)")
    check.add_argument("--json", help="write the issues as JSON")
    check.add_argument("--skip-stamps", action="store_true", help="do not require pages to be stamped (while translating)")

    plan = sub.add_parser("plan", help="batches of pages that still need translating, for workers")
    locale_option(plan)
    plan.add_argument("--batch-kb", type=int, default=45, help="English kilobytes per batch (default 45)")
    plan.add_argument("--out", help="write the plan as JSON")

    stamp = sub.add_parser("stamp", help="record that pages match the current English text")
    locale_option(stamp)
    stamp.add_argument("pages", nargs="*", help="only these pages (default: all that pass the check)")

    missing = sub.add_parser("nav-missing", help="English navigation labels that have no translation yet (JSON list)")
    locale_option(missing)
    missing.add_argument("--out", help="write the list to a file instead of printing it")

    apply = sub.add_parser("nav-apply", help="store translated navigation labels from a JSON object {english: translated}")
    locale_option(apply)
    apply.add_argument("--from", dest="source", required=True, help="JSON file")

    fix = sub.add_parser("fix-anchors", help="point page.md#section links at the translated headings")
    locale_option(fix)

    numbers = sub.add_parser("fix-numbers", help="write numbers as in the English page (65,536 not 65.536)")
    locale_option(numbers)
    return parser


def _wiring(args: argparse.Namespace):
    folders = DocsFolders(ROOT / "src" / "content" / "docs", CANONICAL)
    locks = JsonLocks(ROOT / "translations")
    if args.locale == CANONICAL:
        raise L10nError(f"`{CANONICAL}` is the English source, not a translation.")
    return folders, locks, CheckLocale(folders, locks)


def _status(args: argparse.Namespace) -> int:
    _, _, check = _wiring(args)
    data = Status(check)(args.locale)
    if args.json:
        print(json.dumps(data, indent=2))
        return 0
    total = sum(data["total"].values())
    done = data["total"][State.TRANSLATED.value]
    print(f"{args.locale}: {done}/{total} pages translated ({100 * done // max(total, 1)}%)")
    for name, row in data["sections"].items():
        parts = ", ".join(f"{count} {state}" for state, count in row.items() if count)
        print(f"  {name:<14} {parts}")
    return 0


def _check(args: argparse.Namespace) -> int:
    _, _, check = _wiring(args)
    reports = check(args.locale, set(args.pages) or None, check_stamps=not args.skip_stamps)
    issues = [i for r in reports for i in r.issues]
    errors = [i for i in issues if i.severity is Severity.ERROR]
    for report in reports:
        if report.issues:
            print(f"{report.path}  [{report.state.value}]")
            for issue in report.issues:
                print(f"  {issue}")
    counts = {s: sum(1 for r in reports if r.state is s) for s in State}
    print(f"\n{counts[State.TRANSLATED]} ok, {counts[State.INVALID]} invalid, {counts[State.STALE]} stale, {counts[State.ORPHAN]} orphan, {counts[State.MISSING]} not translated yet")
    if args.json:
        Path(args.json).write_text(json.dumps([i.to_dict() for i in issues], indent=2, ensure_ascii=False), encoding="utf-8")
    return 1 if errors else 0


def _plan(args: argparse.Namespace) -> int:
    folders, _, check = _wiring(args)
    data = PlanLocale(folders, check)(args.locale, args.batch_kb * 1024)
    if args.out:
        Path(args.out).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{data['pages']} pages in {len(data['batches'])} batches")
    for batch in data["batches"]:
        print(f"  batch {batch['id']}: {len(batch['pages'])} pages, {batch['bytes'] // 1024} KB")
    return 0


def _stamp(args: argparse.Namespace) -> int:
    folders, locks, check = _wiring(args)
    stamped, refused = StampLocale(folders, locks, check)(args.locale, set(args.pages) or None)
    print(f"stamped {len(stamped)} pages")
    for report in refused:
        print(f"refused {report.path}:")
        for issue in report.issues:
            print(f"  {issue}")
    return 1 if refused else 0


def _fix_anchors(args: argparse.Namespace) -> int:
    folders, _, _ = _wiring(args)
    changed = FixAnchors(folders)(args.locale)
    print(f"updated links in {len(changed)} pages")
    return 0


def _fix_numbers(args: argparse.Namespace) -> int:
    folders, _, _ = _wiring(args)
    changed = FixNumbers(folders)(args.locale)
    print(f"updated numbers in {len(changed)} pages")
    return 0


def _navigation() -> NavigationFile:
    return NavigationFile(ROOT / "src" / "config" / "navigation.ts")


def _nav_missing(args: argparse.Namespace) -> int:
    titles = ListMissingNavTitles(_navigation())(args.locale)
    text = json.dumps(titles, indent=2, ensure_ascii=False)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print(f"{len(titles)} labels to translate -> {args.out}")
    else:
        print(text)
    return 0


def _nav_apply(args: argparse.Namespace) -> int:
    try:
        mapping = json.loads(Path(args.source).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise L10nError(f"cannot read {args.source}: {error}") from error
    changed, still_missing = ApplyNavTitles(_navigation())(args.locale, mapping)
    print(f"updated {changed} navigation items; {len(still_missing)} labels still have no translation")
    for title in still_missing[:10]:
        print(f"  {title}")
    return 1 if still_missing else 0


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    handlers = {"status": _status, "check": _check, "plan": _plan, "stamp": _stamp, "fix-anchors": _fix_anchors, "fix-numbers": _fix_numbers, "nav-missing": _nav_missing, "nav-apply": _nav_apply}
    try:
        return handlers[args.command](args)
    except L10nError as error:
        print(error, file=sys.stderr)
        return 2
