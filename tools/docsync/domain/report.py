"""Markdown rendering of a change report (PR bodies, job summaries)."""

from __future__ import annotations

from .classifier import ApiChange, ChangeReport

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

    if report.api:
        lines += ["## 🔴 API changes — update the docs", ""]
        for change in report.api:
            lines += _api_section(change, link)
    if report.behavior:
        lines += ["## 🟡 Behavior changes in documented files — review", ""]
        for b in report.behavior:
            lines += [f"### {link(b.file)} ({b.status}, +{b.added} −{b.removed})", ""]
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
        out += [f"{e.sign} {e.signature}{'   // ✅ docs already match' if e.ok else ''}" for e in entries]
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
