"""What the translation tooling does: check, plan, stamp, fix anchors, report status."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from ..domain.anchors import rewrite_fragments, target_page, translated_fragment
from ..domain.compare import compare
from ..domain.findings import Issue, Severity
from ..domain.fingerprint import fingerprint
from ..domain.numbers import restore_notation
from ..domain.shape import Shape, extract_shape
from .ports import L10nError, LockStore, NavigationTitles, PageStore


class State(str, Enum):
    MISSING = "missing"  # not translated yet (the site shows the English page)
    TRANSLATED = "translated"
    STALE = "stale"  # the English page changed after it was translated
    INVALID = "invalid"  # the structure, code or links differ from the English page
    ORPHAN = "orphan"  # no English page with that path


@dataclass
class PageReport:
    path: str
    state: State
    issues: list[Issue] = field(default_factory=list)


def _section(path: str) -> str:
    return path.split("/", 1)[0] if "/" in path else "(root)"


class CheckLocale:
    """Compares every translated page with its English source."""

    def __init__(self, pages: PageStore, locks: LockStore) -> None:
        self._pages, self._locks = pages, locks

    def __call__(self, locale: str, only: set[str] | None = None, check_stamps: bool = True) -> list[PageReport]:
        sources, targets = self._pages.source_pages(), self._pages.translated_pages(locale)
        stamps = self._locks.load(locale)
        shapes: dict[str, Shape] = {}

        def shape_of(pages: dict[str, str], path: str, cache: dict[str, Shape]) -> Shape:
            if path not in cache:
                cache[path] = extract_shape(pages[path])
            return cache[path]

        source_shapes: dict[str, Shape] = {}
        reports: list[PageReport] = []
        for path in sorted(sources.keys() | targets.keys()):
            if only is not None and path not in only:
                continue
            if path not in targets:
                reports.append(PageReport(path, State.MISSING))
                continue
            if path not in sources:
                reports.append(PageReport(path, State.ORPHAN, [Issue("L011", Severity.ERROR, path, 0, "no English page with this path")]))
                continue
            source = shape_of(sources, path, source_shapes)
            target = shape_of(targets, path, shapes)
            issues = compare(path, source, target)
            issues += self._broken_fragments(path, target, sources, targets, source_shapes, shapes)
            if check_stamps and not issues and stamps.get(path) != fingerprint(sources[path]):
                reports.append(PageReport(path, State.STALE, [Issue("L010", Severity.ERROR, path, 0, "the English page changed since this translation (or it was never stamped); update it, then run `stamp`")]))
                continue
            reports.append(PageReport(path, State.INVALID if issues else State.TRANSLATED, issues))
        return reports

    @staticmethod
    def _broken_fragments(path, target, sources, targets, source_shapes, shapes) -> list[Issue]:
        issues = []
        for link in target.links:
            if not link.fragment or link.path.startswith(("http:", "https:", "mailto:")):
                continue
            page = target_page(path, link.path)
            served = targets.get(page) if page in targets else sources.get(page)
            if served is None:
                continue  # unknown pages are the link test's business
            cache, pages = (shapes, targets) if page in targets else (source_shapes, sources)
            if page not in cache:
                cache[page] = extract_shape(pages[page])
            if link.fragment not in {h.slug for h in cache[page].headings}:
                issues.append(Issue("L009", Severity.ERROR, path, link.line, f"`{link.path}#{link.fragment}` — the page has no heading with that id (run `fix-anchors`)"))
        return issues


class PlanLocale:
    """Splits the pages that still need translating into batches of about ``batch_bytes`` of English."""

    def __init__(self, pages: PageStore, check: CheckLocale) -> None:
        self._pages, self._check = pages, check

    def __call__(self, locale: str, batch_bytes: int) -> dict:
        sources = self._pages.source_pages()
        todo = [r for r in self._check(locale) if r.state in (State.MISSING, State.INVALID, State.STALE)]
        batches: list[list[dict]] = [[]]
        used = 0
        for report in sorted(todo, key=lambda r: r.path):
            size = len(sources[report.path].encode("utf-8"))
            if batches[-1] and used + size > batch_bytes:
                batches.append([])
                used = 0
            batches[-1].append({"path": report.path, "state": report.state.value, "bytes": size, "issues": [str(i) for i in report.issues]})
            used += size
        batches = [b for b in batches if b]
        return {"locale": locale, "pages": len(todo), "batches": [{"id": i + 1, "bytes": sum(p["bytes"] for p in b), "pages": b} for i, b in enumerate(batches)]}


class StampLocale:
    """Records that translated pages match the current English text; refuses pages that still have problems."""

    def __init__(self, pages: PageStore, locks: LockStore, check: CheckLocale) -> None:
        self._pages, self._locks, self._check = pages, locks, check

    def __call__(self, locale: str, only: set[str] | None = None) -> tuple[list[str], list[PageReport]]:
        sources = self._pages.source_pages()
        stamps = self._locks.load(locale)
        stamped: list[str] = []
        refused: list[PageReport] = []
        for report in self._check(locale, only):
            if report.state in (State.TRANSLATED, State.STALE):
                stamps[report.path] = fingerprint(sources[report.path])
                stamped.append(report.path)
            elif report.state in (State.INVALID, State.ORPHAN):
                refused.append(report)
        for path in [p for p in stamps if p not in sources]:
            del stamps[path]  # the English page is gone
        self._locks.save(locale, dict(sorted(stamps.items())))
        return stamped, refused


class FixAnchors:
    """Points ``page.md#section`` links of translated pages at the translated heading ids."""

    def __init__(self, pages: PageStore) -> None:
        self._pages = pages

    def __call__(self, locale: str) -> list[str]:
        sources, targets = self._pages.source_pages(), self._pages.translated_pages(locale)
        source_shapes = {p: extract_shape(t) for p, t in sources.items() if p in targets}
        target_shapes = {p: extract_shape(t) for p, t in targets.items()}
        changed: list[str] = []
        for path, text in targets.items():
            if path not in sources:
                continue

            def translate(page: str, fragment: str) -> str:
                if page in source_shapes and page in target_shapes:
                    return translated_fragment(fragment, source_shapes[page], target_shapes[page])
                return fragment

            fixed = rewrite_fragments(path, text, translate)
            if fixed != text:
                self._pages.write(locale, path, fixed)
                changed.append(path)
        return changed


class FixNumbers:
    """Puts numbers of translated pages back into the notation of the English page."""

    def __init__(self, pages: PageStore) -> None:
        self._pages = pages

    def __call__(self, locale: str) -> list[str]:
        sources, targets = self._pages.source_pages(), self._pages.translated_pages(locale)
        changed: list[str] = []
        for path, text in targets.items():
            if path not in sources:
                continue
            fixed = restore_notation(text, extract_shape(sources[path]), extract_shape(text))
            if fixed != text:
                self._pages.write(locale, path, fixed)
                changed.append(path)
        return changed


class Status:
    """Progress of one translation by section."""

    def __init__(self, check: CheckLocale) -> None:
        self._check = check

    def __call__(self, locale: str) -> dict:
        reports = self._check(locale)
        sections: dict[str, dict[str, int]] = {}
        for report in reports:
            row = sections.setdefault(_section(report.path), {state.value: 0 for state in State})
            row[report.state.value] += 1
        total = {state.value: sum(row[state.value] for row in sections.values()) for state in State}
        return {"locale": locale, "total": total, "sections": dict(sorted(sections.items()))}


class ListMissingNavTitles:
    """The short English labels of the navigation that still need a translation."""

    def __init__(self, navigation: NavigationTitles) -> None:
        self._navigation = navigation

    def __call__(self, locale: str) -> list[str]:
        return self._navigation.missing(locale)


class ApplyNavTitles:
    """Stores translated navigation labels, after checking the translation covers what was asked."""

    def __init__(self, navigation: NavigationTitles) -> None:
        self._navigation = navigation

    def __call__(self, locale: str, translations: dict[str, str]) -> tuple[int, list[str]]:
        bad = [k for k, v in translations.items() if not isinstance(v, str) or not v.strip()]
        if bad:
            raise L10nError(f"empty translation for: {', '.join(bad[:5])}")
        changed = self._navigation.apply(locale, translations)
        return changed, self._navigation.missing(locale)
