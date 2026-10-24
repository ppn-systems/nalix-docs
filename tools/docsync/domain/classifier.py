"""Decides what a set of changed Nalix files means for the documentation.

Tiers, from most to least actionable:

* ``api``        - the public API changed and the docs do not show it yet.
* ``behavior``   - code a page cites changed in a way that touches things that page mentions.
* ``reflected``  - the public API changed but the docs already match.
* ``internal``   - everything else: nothing for the docs to do.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field

from .api_index import is_api_file
from .citations import DocPointer, cited_by, collect_citations, doc_pointers, mentions
from .line_diff import unified_diff
from .markdown import DocFile
from .normalize import layout_csharp, normalize_xml
from .snapshot import ChangeSet
from .surface import ApiMember, SurfaceDiff, diff_surfaces, file_surface, member_name

_NOISE = frozenset(
    "this base null true false void return using namespace public private protected internal static readonly sealed class struct "
    "string int long bool byte var new else async await ushort uint ulong default throw while foreach switch case break continue "
    "out ref in is not and nameof typeof".split()
)
_WORD = re.compile(r"[A-Za-z_][A-Za-z0-9_]{3,}", re.ASCII)
_NUMBER = re.compile(r"\b\d[\d_]{2,}\b", re.ASCII)
_DIGIT_GROUP = re.compile(r"(\d)_(?=\d)")
_MODIFIER_PREFIX = re.compile(r"^(?:(?:public|protected|internal|static|virtual|override|abstract|sealed|readonly|extern|unsafe|new|partial|async|const|required)\s+)+")
_MAX_DOCUMENT_FREQUENCY = 12


# -- result types ---------------------------------------------------------------------------------
@dataclass(frozen=True)
class EntryChange:
    sign: str  # '-' removed, '+' added
    type: str
    signature: str
    ok: bool  # the docs already agree with this entry


@dataclass(frozen=True)
class ApiChange:
    file: str
    status: str
    exact: bool
    entries: tuple[EntryChange, ...]
    new_types: tuple[str, ...]
    removed_types: tuple[str, ...]
    pages: tuple[str, ...]
    pointers: tuple[DocPointer, ...]

    @property
    def by_type(self) -> dict[str, list[EntryChange]]:
        grouped: dict[str, list[EntryChange]] = {}
        for entry in self.entries:
            grouped.setdefault(entry.type, []).append(entry)
        return grouped

    @property
    def reflected(self) -> bool:
        return all(e.ok for e in self.entries)


@dataclass(frozen=True)
class BehaviorChange:
    file: str
    status: str
    pages: tuple[str, ...]
    tokens: tuple[str, ...]
    added: int
    removed: int
    diff: str


@dataclass(frozen=True)
class InternalChange:
    file: str
    status: str


@dataclass
class ChangeReport:
    api: list[ApiChange] = field(default_factory=list)
    reflected: list[ApiChange] = field(default_factory=list)
    behavior: list[BehaviorChange] = field(default_factory=list)
    internal: list[InternalChange] = field(default_factory=list)

    @property
    def needs_docs(self) -> bool:
        return bool(self.api or self.behavior)

    def counts(self) -> Counter:
        return Counter(api=len(self.api), reflected=len(self.reflected), behavior=len(self.behavior), internal=len(self.internal))


# -- relevance heuristics -------------------------------------------------------------------------
def document_frequency(files: dict[str, str]) -> Counter:
    """Number of files each word occurs in: words found in many files are too generic to prove relevance."""
    counter: Counter = Counter()
    for text in files.values():
        counter.update(set(_WORD.findall(text)))
    return counter


def relevant_tokens(changed_lines: list[str] | tuple[str, ...], page_texts: list[str], df: Counter, max_df: int = _MAX_DOCUMENT_FREQUENCY) -> list[str]:
    """Specific words and numbers of a changed block that the citing pages also mention."""
    page_words: set[str] = set()
    page_numbers: set[str] = set()
    for text in page_texts:
        page_words.update(_WORD.findall(text))
        page_numbers.update(_NUMBER.findall(_DIGIT_GROUP.sub(r"\1", text)))
    hits: set[str] = set()
    for line in changed_lines:
        for word in _WORD.findall(line):
            if word not in _NOISE and word in page_words and df.get(word, 0) <= max_df:
                hits.add(word)
        hits.update(n for n in _NUMBER.findall(_DIGIT_GROUP.sub(r"\1", line)) if n in page_numbers)
    return sorted(hits)


def _source_lines(path: str, text: str) -> str:
    return layout_csharp(text).text if path.endswith(".cs") else normalize_xml(text).replace("><", ">\n<")


def _simple_name(qualified: str) -> str:
    return qualified.rsplit(".", 1)[-1]


# -- classifier -----------------------------------------------------------------------------------
class ChangeClassifier:
    def __init__(self, docs: list[DocFile]) -> None:
        self._docs = docs
        self._docs_by_path = {d.path: d.text for d in docs}
        self._citations = collect_citations(docs)
        self._blob = re.sub(r"\s+", "", "\n".join(d.text for d in docs))

    def classify(self, changes: ChangeSet, old_files: dict[str, str] | None, new_files: dict[str, str]) -> ChangeReport:
        """``old_files`` is None when the previous version could not be downloaded (every API file is then assumed changed)."""
        report = ChangeReport()
        df = document_frequency(new_files)
        ordered = sorted(
            [*((p, "modified") for p in changes.modified), *((p, "added") for p in changes.added), *((p, "removed") for p in changes.removed)]
        )
        for path, status in ordered:
            old_text = old_files.get(path) if old_files is not None else None
            new_text = new_files.get(path)
            cited = cited_by(path, self._citations)

            if is_api_file(path):
                before = (file_surface(path, old_text) if old_text is not None else []) if old_files is not None else None
                after = file_surface(path, new_text) if new_text is not None else []
                diff = diff_surfaces(before, after) if before is not None else SurfaceDiff((), tuple(after))
                if diff:
                    change = self._describe_api_change(path, status, diff, cited, exact=before is not None)
                    (report.reflected if change.reflected else report.api).append(change)
                    continue

            if cited and old_text is not None and new_text is not None:
                d = unified_diff(_source_lines(path, old_text), _source_lines(path, new_text), context=2, max_lines=40)
                tokens = relevant_tokens(d.changed, [self._docs_by_path.get(p, "") for p in cited], df)
                if tokens:
                    report.behavior.append(BehaviorChange(path, status, tuple(cited), tuple(tokens), d.added, d.removed, d.text))
                    continue
            report.internal.append(InternalChange(path, status))
        return report

    # -- API changes ----------------------------------------------------------------------------
    def _still_mentioned(self, member: ApiMember) -> bool:
        type_name = _simple_name(member.type)
        if member.is_declaration:
            return mentions(type_name, self._docs)
        return bool(doc_pointers(member_name(member.signature), type_name, self._docs, limit=1))

    def _signature_in_docs(self, member: ApiMember) -> bool:
        if member.is_declaration:
            return mentions(_simple_name(member.type), self._docs)
        key = re.sub(r"\s+", "", _MODIFIER_PREFIX.sub("", member.signature))
        return len(key) > 3 and key in self._blob

    def _describe_api_change(self, path: str, status: str, diff: SurfaceDiff, cited: list[str], exact: bool) -> ApiChange:
        removed_types = [m.type for m in diff.removed if m.is_declaration]
        added_types = [m.type for m in diff.added if m.is_declaration]
        new_types = [t for t in added_types if t not in removed_types]
        gone_types = [t for t in removed_types if t not in added_types]

        # An added signature is fine when the docs already show it; a removed one when they no longer do.
        entries = [
            *(EntryChange("-", m.type, m.signature, not self._still_mentioned(m)) for m in diff.removed),
            *(EntryChange("+", m.type, m.signature, self._signature_in_docs(m)) for m in diff.added),
        ]

        pages = set(cited)
        pointers: list[DocPointer] = []
        for type_name in dict.fromkeys(e.type for e in entries):
            if type_name in new_types:
                continue  # brand-new types have nothing to point at
            simple = _simple_name(type_name)
            names = list(dict.fromkeys(
                member_name(m.signature) for m in (*diff.removed, *diff.added) if m.type == type_name and not m.is_declaration
            )) or [simple]
            for name in names:
                for hit in doc_pointers(name, simple, self._docs):
                    pages.add(hit.page)
                    if not any(p.page == hit.page and p.line == hit.line for p in pointers):
                        pointers.append(DocPointer(hit.page, hit.line, hit.snippet, name))
        return ApiChange(
            file=path,
            status=status,
            exact=exact,
            entries=tuple(entries),
            new_types=tuple(_simple_name(t) for t in new_types),
            removed_types=tuple(_simple_name(t) for t in gone_types),
            pages=tuple(sorted(pages)),
            pointers=tuple(sorted(pointers, key=lambda p: (p.page, p.line))),
        )
