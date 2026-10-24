"""Decides what a set of changed Nalix files means for the documentation.

Tiers, from most to least actionable:

* ``api``        - the public API changed and the docs do not show it yet.
* ``behavior``   - code a page cites changed in a way that touches things that page mentions.
* ``reflected``  - the public API changed but the docs already match.
* ``internal``   - everything else: nothing for the docs to do.
"""

from __future__ import annotations

import posixpath
import re
from collections import Counter
from dataclasses import dataclass, field

from .api_index import is_api_file
from .citations import DocPointer, cited_by, collect_citations, doc_pointers, mentions
from .line_diff import unified_diff
from .markdown import DocFile, kebab
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
#: Edits that change the docs come before pages that only need a look.
_KIND_ORDER = {"update": 0, "remove": 1, "add-member": 2, "add-type": 3, "review": 4}


# -- result types ---------------------------------------------------------------------------------
@dataclass(frozen=True)
class EntryChange:
    sign: str  # '-' removed, '+' added
    type: str
    signature: str
    ok: bool  # the docs already agree with this entry
    line: int = 0  # line in the old file ('-') or the new file ('+')


@dataclass(frozen=True)
class EditTask:
    """One concrete edit for one documentation page."""

    page: str
    line: int  # line to edit, or to insert near; 0 = the page as a whole
    kind: str  # update | remove | add-member | add-type | review
    subject: str  # the member, type or file the edit is about
    old: str = ""  # signature before the change
    new: str = ""  # signature after the change (or the tokens a behavior change touches)
    docs_text: str = ""  # what the docs say at that line today
    source: str = ""  # `path#Lnn` to read
    source_side: str = "new"  # 'new' or 'old' commit


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
    new_line: int = 0


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
    plan: list[EditTask] = field(default_factory=list)  # every task of api + behavior changes, by page and line

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


def _is_specific(token: str) -> bool:
    """Identifier-like (``MaxRetries``, ``NALIX068``, ``_send_lock``) or numeric; plain English words are not evidence."""
    return any(c.isdigit() or c == "_" for c in token) or any(c.isupper() for c in token[1:])


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
            if word not in _NOISE and word in page_words and df.get(word, 0) <= max_df and _is_specific(word):
                hits.add(word)
        hits.update(n for n in _NUMBER.findall(_DIGIT_GROUP.sub(r"\1", line)) if n in page_numbers)
    return sorted(hits)


def _source_lines(path: str, text: str) -> str:
    return layout_csharp(text).text if path.endswith(".cs") else normalize_xml(text).replace("><", ">\n<")


def _body_start(lines: list[str]) -> int:
    """Number of frontmatter lines (the page body starts after them)."""
    if lines and lines[0] == "---" and "---" in lines[1:]:
        return lines.index("---", 1) + 1
    return 0


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
        tasks: list[EditTask] = []
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
                    change, change_tasks = self._describe_api_change(path, status, diff, cited, after, exact=before is not None)
                    (report.reflected if change.reflected else report.api).append(change)
                    if not change.reflected:
                        tasks.extend(change_tasks)
                    continue

            if cited and old_text is not None and new_text is not None:
                d = unified_diff(_source_lines(path, old_text), _source_lines(path, new_text), context=2, max_lines=40)
                # Only what disappeared can make a page wrong; names that exist only in the new code cannot be misdescribed yet.
                tokens = relevant_tokens(d.removed_lines, [self._docs_by_path.get(p, "") for p in cited], df)
                if tokens:
                    tasks.extend(self._behavior_tasks(path, cited, tokens, d.first_new_line))
                    report.behavior.append(BehaviorChange(path, status, tuple(cited), tuple(tokens), d.added, d.removed, d.text, d.first_new_line))
                    continue
            report.internal.append(InternalChange(path, status))
        report.plan = sorted(set(self._link_new_types(tasks)), key=lambda t: (t.page, _KIND_ORDER.get(t.kind, 9), t.line, t.subject))
        return report

    # -- behavior changes -----------------------------------------------------------------------
    def _behavior_tasks(self, path: str, pages: list[str], tokens: list[str], source_line: int) -> list[EditTask]:
        """For each citing page, the lines that mention what the changed code touches."""
        tasks = []
        source = f"{path}#L{source_line}" if source_line else path
        for page in pages:
            lines = self._docs_by_path.get(page, "").split("\n")
            hits: list[tuple[int, str, list[str]]] = []
            for number, line in enumerate(lines, start=1):
                found = [t for t in tokens if re.search(rf"(?<![\w]){re.escape(t)}(?![\w])", line, re.ASCII)]
                if found:
                    hits.append((number, line, found))
            for number, line, found in hits[:3]:
                tasks.append(EditTask(page, number, "review", path.rsplit("/", 1)[-1], new=", ".join(found[:6]), docs_text=line.strip()[:110], source=source))
        return tasks

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

    def _name_documented(self, name: str, type_name: str) -> bool:
        """Is ``name`` written as a code span (`` `Name` `` / `` `Name(...)` ``) on a page that mentions the type?"""
        span = re.compile(rf"`{re.escape(name)}(?:[`(<\s]|$)", re.ASCII)
        type_re = re.compile(rf"\b{re.escape(type_name)}\b", re.ASCII)
        return any(type_re.search(d.text) and span.search(d.text) for d in self._docs)

    def _describe_api_change(self, path: str, status: str, diff: SurfaceDiff, cited: list[str], after: list[ApiMember], exact: bool) -> tuple[ApiChange, list[EditTask]]:
        removed_types = [m.type for m in diff.removed if m.is_declaration]
        added_types = [m.type for m in diff.added if m.is_declaration]
        new_types = [t for t in added_types if t not in removed_types]
        gone_types = [t for t in removed_types if t not in added_types]

        # An added signature is fine when the docs already show it; a removed one when they no longer do.
        # A member that is only added needs just its name documented; a changed one needs the new form shown.
        changed = {(m.type, member_name(m.signature)) for m in diff.removed if not m.is_declaration} & {
            (m.type, member_name(m.signature)) for m in diff.added if not m.is_declaration
        }

        def added_ok(m: ApiMember) -> bool:
            if self._signature_in_docs(m):
                return True
            return not m.is_declaration and (m.type, member_name(m.signature)) not in changed and self._name_documented(member_name(m.signature), _simple_name(m.type))

        def removed_ok(m: ApiMember) -> bool:
            if not m.is_declaration and (m.type, member_name(m.signature)) in changed:
                return not self._signature_in_docs(m)  # same name still exists: only the old form must be gone
            return not self._still_mentioned(m)

        entries = [
            *(EntryChange("-", m.type, m.signature, removed_ok(m), m.line) for m in diff.removed),
            *(EntryChange("+", m.type, m.signature, added_ok(m), m.line) for m in diff.added),
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
        change = ApiChange(
            file=path,
            status=status,
            exact=exact,
            entries=tuple(entries),
            new_types=tuple(_simple_name(t) for t in new_types),
            removed_types=tuple(_simple_name(t) for t in gone_types),
            pages=tuple(sorted(pages)),
            pointers=tuple(sorted(pointers, key=lambda p: (p.page, p.line))),
        )
        ok_entries = frozenset((e.sign, e.type, e.signature) for e in entries if e.ok)
        return change, self._api_tasks(path, diff, after, new_types, gone_types, ok_entries)

    # -- edit tasks -----------------------------------------------------------------------------
    def _api_tasks(self, path: str, diff: SurfaceDiff, after: list[ApiMember], new_types: list[str], gone_types: list[str], ok_entries: frozenset[tuple[str, str, str]] = frozenset()) -> list[EditTask]:
        tasks: list[EditTask] = []
        types = list(dict.fromkeys(m.type for m in (*diff.removed, *diff.added)))
        for type_name in types:
            simple = _simple_name(type_name)
            if type_name in new_types:
                header = next(m for m in diff.added if m.type == type_name and m.is_declaration)
                for page in self._suggest_pages(path):
                    tasks.append(EditTask(page, 0, "add-type", simple, new=header.signature, source=f"{path}#L{header.line}"))
                continue
            if type_name in gone_types:
                for hit in doc_pointers(simple, simple, self._docs, limit=8):
                    tasks.append(EditTask(hit.page, hit.line, "remove", simple, docs_text=hit.snippet, source=path, source_side="old"))
                continue

            removed = [m for m in diff.removed if m.type == type_name]
            added = [m for m in diff.added if m.type == type_name]
            removed_by_name: dict[str, list[ApiMember]] = {}
            added_by_name: dict[str, list[ApiMember]] = {}
            for member in removed:
                removed_by_name.setdefault(self._subject(member, simple), []).append(member)
            for member in added:
                added_by_name.setdefault(self._subject(member, simple), []).append(member)
            siblings = [member_name(m.signature) for m in after if m.type == type_name and not m.is_declaration]

            for name in dict.fromkeys([*removed_by_name, *added_by_name]):
                olds, news = removed_by_name.get(name, []), added_by_name.get(name, [])
                if all(("-", m.type, m.signature) in ok_entries for m in olds) and all(("+", m.type, m.signature) in ok_entries for m in news):
                    continue  # the docs already agree: the new form is shown and the old one is gone
                old_text, new_text = " | ".join(m.signature for m in olds), " | ".join(m.signature for m in news)
                if olds and news:
                    for hit in self._mentions(name, simple, declaration=all(m.is_declaration for m in [*olds, *news])):
                        tasks.append(EditTask(hit.page, hit.line, "update", name, old_text, new_text, hit.snippet, f"{path}#L{news[0].line}"))
                elif olds:
                    for hit in self._mentions(name, simple, declaration=all(m.is_declaration for m in olds)):
                        tasks.append(EditTask(hit.page, hit.line, "remove", name, old_text, "", hit.snippet, f"{path}#L{olds[0].line}", "old"))
                else:
                    tasks.extend(self._add_member_tasks(path, name, simple, news, new_text, siblings))
        return tasks

    @staticmethod
    def _subject(member: ApiMember, type_name: str) -> str:
        return type_name if member.is_declaration else member_name(member.signature)

    def _mentions(self, name: str, type_name: str, declaration: bool) -> list[DocPointer]:
        if not declaration:
            return doc_pointers(name, type_name, self._docs, limit=8)
        # A changed type header: lines that declare the type.
        declares = re.compile(rf"\b(class|struct|interface|enum|record)\b.*\b{re.escape(type_name)}\b|\b{re.escape(type_name)}\b.*\b(class|struct|interface|enum|record)\b")
        hits = []
        for doc in self._docs:
            for number, line in enumerate(doc.text.split("\n"), start=1):
                if declares.search(line):
                    hits.append(DocPointer(doc.path, number, line.strip()[:110], type_name))
        return hits[:8]

    def _add_member_tasks(self, path: str, name: str, type_name: str, news: list[ApiMember], new_text: str, siblings: list[str]) -> list[EditTask]:
        """Suggests where a new member belongs: next to its documented siblings on the page that covers the type."""
        type_re = re.compile(rf"\b{re.escape(type_name)}\b", re.ASCII)
        sibling_re = re.compile("|".join(rf"\b{re.escape(s)}\b" for s in siblings if s != name) or r"(?!x)x", re.ASCII)
        best: tuple[int, str, int, str] | None = None  # (mentions of the type, page, line to insert near, that line)
        for doc in self._docs:
            lines = doc.text.split("\n")
            mentions_of_type = sum(1 for line in lines if type_re.search(line))
            if not mentions_of_type:
                continue
            body = _body_start(lines)
            numbered = [(n, line) for n, line in enumerate(lines, start=1) if n > body]
            siblings_at = [(n, line) for n, line in numbered if sibling_re.search(line)]
            near = self._insertion_point(numbered, sibling_re) or next(((n, line) for n, line in numbered if type_re.search(line)), (0, ""))
            dedicated = kebab(type_name) == posixpath.basename(doc.path)[:-3]
            score = mentions_of_type + (1000 if dedicated else 0)
            if best is None or score > best[0]:
                best = (score, doc.path, near[0], near[1].strip()[:110])
        if best is None:
            return []
        _, page, line, text = best
        return [EditTask(page, line, "add-member", name, new=new_text, docs_text=text, source=f"{path}#L{news[0].line}")]

    @staticmethod
    def _insertion_point(numbered: list[tuple[int, str]], sibling_re: re.Pattern[str]) -> tuple[int, str] | None:
        """Last row of the table (or list) that names the most sibling members: where a new member belongs.

        Falls back to the first prose line that names a sibling.
        """
        blocks: list[list[tuple[int, str]]] = []
        for number, line in numbered:
            stripped = line.lstrip()
            in_block = stripped.startswith("|") or (stripped.startswith(("- ", "* ")) and ".cs" not in line)
            if in_block and blocks and blocks[-1][-1][0] == number - 1:
                blocks[-1].append((number, line))
            elif in_block:
                blocks.append([(number, line)])
        best_block, best_score = None, 0
        for block in blocks:
            score = len({m.group() for _, line in block for m in sibling_re.finditer(line)})
            if score > best_score:
                best_block, best_score = block, score
        if best_block:
            number, line = best_block[-1]
            return number, line
        return next(((n, line) for n, line in numbered if sibling_re.search(line)), None)

    def _suggest_pages(self, path: str) -> list[str]:
        """Pages that cite most files of the same folder, else the package page."""
        folder = path.rsplit("/", 1)[0] + "/"
        weight: Counter = Counter()
        for cited, citing in self._citations.items():
            if cited.startswith(folder) or folder.startswith(cited + "/"):
                weight.update(citing)
        if weight:
            top = max(weight.values())
            return sorted(p for p, w in weight.items() if w == top)[:2]
        package = path.split("/")[1].lower().replace(".", "-") if path.count("/") >= 1 else ""
        candidate = f"packages/{package}.md"
        return [candidate] if any(d.path == candidate for d in self._docs) else []

    @staticmethod
    def _link_new_types(tasks: list[EditTask]) -> list[EditTask]:
        """A new type belongs where the members that use it are documented."""
        out: list[EditTask] = []
        for task in tasks:
            if task.kind != "add-type":
                out.append(task)
                continue
            word = re.compile(rf"\b{re.escape(task.subject)}\b", re.ASCII)
            users = [u for u in tasks if u.kind in ("add-member", "update") and word.search(u.new)]
            if not users:
                out.append(task)
                continue
            out.extend(EditTask(u.page, u.line, "add-type", task.subject, new=task.new, docs_text=f"used by {u.subject}", source=task.source) for u in users)
        return out
