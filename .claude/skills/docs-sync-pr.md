# Handling a Source-Sync PR

## Triggers
- A draft PR `docs: sync with nalix <sha>` on branch `bot/source-sync`
- Asked to "bring the docs up to date with nalix" or to audit the docs against the source

---

## How the PR is produced
`.github/workflows/source-sync.yml` (daily, manual, or `repository_dispatch: nalix-updated`) runs `python3 tools/run.py sync-check --update`. It opens/refreshes **one** draft PR only when a change is 🔴 or 🟡 (see [docs-source-parity](./docs-source-parity.md)). The body holds, per changed file: a `diff` of public signatures (or a line diff for 🟡), the `page:line` pointers to edit, and a checklist of pages; plus the docs-vs-source audit findings. The same report is in the run summary and the `source-sync-report` artifact. Human commits on the branch are never force-pushed away.

## Checklist
1. `git fetch origin bot/source-sync && git switch bot/source-sync`
2. Read the PR body top-down: 🔴 first, then 🟡, then audit findings. Ignore ✅ and ⚪.
3. For each 🔴 item: open the page at the pointer lines, compare with the `+/-` signatures, edit. New public types ("no page documents them") get a section on the most appropriate existing page, or a new page (then register it in `navigation.ts` and bump the page counts in `tests/*.test.ts`).
4. For each 🟡 item: read the diff; edit only when the page's claim is now false. "Reviewed, no change" is a valid outcome — do not touch the page.
5. Audit findings: fix real ones; a false positive means fixing the tool + a test, or a justified baseline entry.
6. `npm test` → push → mark ready → merge. The manifest and API index in the PR record the new synced commit.

## Fanning out (many pages)
Split by docs area (`api/abstractions`, `analyzers`, `codec`, `environment`, `framework`, `hosting`, `network`+`options/network`, `runtime`, `sdk`, `security`, `concepts`, `guides`). Give each worker only its own pages plus the findings/diffs that touch them; forbid edits outside the area, `navigation.ts`, tests and commits; have every worker cite `file:line` evidence and report false positives instead of editing. Run `npm test` once at the end — concurrent workers see each other's half-edited pages.

## Gotchas
- The audit gate (`tools/tests/test_docs_gate.py`) uses the committed `source-api-index.json`; after the bot bumps it, a new Nalix API without docs shows up as an `A010` gap and fails the PR until documented or accepted in `tools/docs-audit-baseline.json`.
- PRs opened with `GITHUB_TOKEN` do not trigger `ci.yml`; pushing a docs commit does.
- If the previous Nalix commit cannot be downloaded, the report says "previous version unavailable" and treats every API file as 🔴.
