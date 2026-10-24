"""Markdown rendering of a change report (PR bodies, job summaries)."""

from __future__ import annotations

from dataclasses import asdict

from .classifier import ApiChange, ChangeReport, EditTask

MAX_BODY = 58_000
_MAX_POINTERS = 12
_MAX_TOKENS = 12


def render_report(repo: str, old_commit: str | None, new_commit: str, report: ChangeReport) -> str:
    def link(path: str) -> str:
        return f"[{path}](https://github.com/{repo}/blob/{new_commit}/{path})"

    compare = f"https://github.com/{repo}/compare/{old_commit}...{new_commit}" if old_commit else f"https://github.com/{repo}/tree/{new_commit}"
    lines = [
        f"Nalix `{old_commit[:7] if old_commit else 'none'}` → `{new_commit[:7]}` ([compare]({compare}))",
        "",
        "| | Meaning | Files |",
        "| :-- | :-- | --: |",
        f"| 🔴 | Public API changed and the docs do not show it yet | {len(report.api)} |",
        f"| 🟡 | Behavior changed in code the docs describe — review, may need no edit | {len(report.behavior)} |",
        f"| ✅ | Public API changed but the docs already match — nothing to do | {len(report.reflected)} |",
        f"| ⚪ | Internal, or not something the docs mention — ignored | {len(report.internal)} |",
        "",
    ]

    if report.plan:
        lines += _plan_section(repo, old_commit, new_commit, report.plan)
    if report.api:
        lines += ["## 🔴 API changes — update the docs", ""]
        for change in report.api:
            lines += _api_section(change, link)
    if report.behavior:
        lines += ["## 🟡 Behavior changes in documented files — review", ""]
        for b in report.behavior:
            where = f"{b.file}#L{b.new_line}" if b.new_line else b.file
            lines += [f"### [{where}](https://github.com/{repo}/blob/{new_commit}/{where}) ({b.status}, +{b.added} −{b.removed})", ""]
            if b.diff:
                lines += ["```diff", b.diff, "```", ""]
            lines.append("Cited by: " + ", ".join(f"`{p}`" for p in b.pages))
            lines += ["The changed lines mention: " + ", ".join(f"`{t}`" for t in b.tokens[:_MAX_TOKENS]), ""]
    if report.reflected:
        lines += [f"<details><summary>✅ {len(report.reflected)} API change(s) already reflected in the docs</summary>", ""]
        lines += [f"- {link(c.file)} ({c.status}, {len(c.entries)} signature(s))" for c in report.reflected]
        lines += ["", "</details>", ""]
    if report.internal:
        lines += [f"<details><summary>⚪ {len(report.internal)} internal change(s) ignored</summary>", ""]
        lines += [f"- `{c.file}` ({c.status})" for c in report.internal]
        lines += ["", "</details>", ""]
    return "\n".join(lines)


def _api_section(change: ApiChange, link) -> list[str]:
    out = [f"### {link(change.file)} ({change.status}{'' if change.exact else ', previous version unavailable'})", ""]
    if change.new_types:
        out += [f"New public type(s): {', '.join(f'`{t}`' for t in change.new_types)} — **no page documents them yet.**", ""]
    if change.removed_types:
        out += [f"Removed public type(s): {', '.join(f'`{t}`' for t in change.removed_types)}.", ""]
    out.append("```diff")
    for type_name, entries in change.by_type.items():
        out.append(type_name)
        out += [f"{e.sign} {e.signature}{f'   // L{e.line}' if e.line else ''}{'  ✅ docs already match' if e.ok else ''}" for e in entries]
    out += ["```", ""]
    if change.pointers:
        out += ["Docs lines that mention the changed members:", ""]
        out += [f"- `{p.page}:{p.line}` — `{p.snippet.replace(chr(96), chr(39))}`" for p in change.pointers[:_MAX_POINTERS]]
        if len(change.pointers) > _MAX_POINTERS:
            out.append(f"- … {len(change.pointers) - _MAX_POINTERS} more")
        out.append("")
    out += [f"- [ ] `src/content/docs/en-us/{page}`" for page in change.pages]
    out.append("")
    return out


def truncate_report(body: str, limit: int = MAX_BODY) -> str:
    """Cuts a report to ``limit`` characters (PR bodies are capped at 65,536) without leaving a code fence open."""
    if len(body) <= limit:
        return body
    cut = body[:limit]
    if cut.count("```") % 2 == 1:
        cut += "\n```"
    return cut + "\n\n…_Report truncated; the full report is in the workflow run summary and the `source-sync-report` artifact._\n"


_KIND_LABEL = {"update": "update", "remove": "remove", "add-member": "add near", "add-type": "add type", "review": "review"}


def plan_by_page(plan: list[EditTask]) -> dict[str, list[dict]]:
    """The edit plan as ``{page: [task, ...]}`` for tools that hand one page to one worker."""
    pages: dict[str, list[dict]] = {}
    for task in plan:
        pages.setdefault(task.page, []).append(asdict(task))
    return pages


def _plan_section(repo: str, old_commit: str | None, new_commit: str, plan: list[EditTask]) -> list[str]:
    def source_link(task: EditTask) -> str:
        path, _, anchor = task.source.partition("#")
        commit = old_commit if task.source_side == "old" and old_commit else new_commit
        label = f"{path.rsplit('/', 1)[-1]}{'#' + anchor if anchor else ''}"
        return f"[{label}](https://github.com/{repo}/blob/{commit}/{task.source})"

    def code(text: str) -> str:
        return "`" + text.replace("`", "'") + "`"

    out = ["## Edit plan (by page)", "", "Each entry names the docs line to edit and the source line to read. Pages not listed need no edit.", ""]
    for page in dict.fromkeys(t.page for t in plan):
        out += [f"### `src/content/docs/en-us/{page}`", ""]
        for task in (t for t in plan if t.page == page):
            where = f"L{task.line}" if task.line else "page"
            head = f"- **{_KIND_LABEL[task.kind]} {where}** {code(task.subject)}"
            if task.source:
                head += f" · {source_link(task)}"
            if task.kind == "review":
                out.append(f"{head} — touches {code(task.new)}")  # one line: the reader opens the docs line themselves
                continue
            out.append(head)
            if task.docs_text:
                out.append(f"  - docs now: {code(task.docs_text)}")
            if task.old:
                out.append(f"  - was: {code(task.old)}")
            if task.new:
                out.append(f"  - now: {code(task.new)}")
        out.append("")
    return out
