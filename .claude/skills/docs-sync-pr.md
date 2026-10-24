# Handling a Source-Sync PR

## Triggers
- A draft PR `docs: sync with nalix <sha>` on branch `bot/source-sync`
- Asked to "bring the docs up to date with nalix" or to audit the docs against the source

---

## How the PR is produced
`.github/workflows/source-sync.yml` (daily, manual, or `repository_dispatch: nalix-updated`) runs `python3 tools/run.py sync-check --update`. It opens/refreshes **one** draft PR only when a change is 🔴 or 🟡 (see [docs-source-parity](./docs-source-parity.md)). The body holds, per changed file: a `diff` of public signatures (or a line diff for 🟡), the `page:line` pointers to edit, and a checklist of pages; plus the docs-vs-source audit findings. The same report is in the run summary and the `source-sync-report` artifact. Human commits on the branch are never force-pushed away.

## The edit plan
The report opens with **Edit plan (by page)**: for every page that needs work, a list of tasks sorted so that edits come before reviews. Each task gives the docs line, what to do, and the source line to read.

| Task | Meaning | What to do |
| :-- | :-- | :-- |
| `update L56 Member` | the docs mention a member whose signature changed | `docs now` is the current text, `was`/`now` the old and new signature; rewrite the line |
| `remove L12 Member` | the docs still mention something that no longer exists | delete or reword the line (source link points at the old commit) |
| `add near L69 Member` | a new public member | add it next to `docs now` (the first table row naming a sibling on the page that covers the type) |
| `add type Name` | a new public type | add a section/row; the line shown is where the members that use the type are documented |
| `review L40 File.cs` | code this line describes changed | read the diff section (hunks are `@@ -old +new @@`) and edit only if the line is now false; `touches` lists the names involved |

`python3 tools/run.py sync-check --plan plan.json` writes the same plan as JSON grouped by page (`{"pages": {page: [task, ...]}}`, also the `source-sync-plan.json` artifact) so each page can be handed to one worker.

## Checklist
1. `git fetch origin bot/source-sync && git switch bot/source-sync`
2. Work the edit plan page by page; open the source link of each task. Use the 🔴/🟡 sections below the plan for the full signature and line diffs. Ignore ✅ and ⚪.
3. New public types ("no page documents them") get a section on the suggested page, or a new page (then register it in `navigation.ts` and bump the page counts in `tests/*.test.ts`).
4. For each `review` task: edit only when the page's claim is now false. "Reviewed, no change" is a valid outcome — do not touch the page.
5. Audit findings: fix real ones; a false positive means fixing the tool + a test, or a justified baseline entry.
6. `npm test` → push → mark ready → merge. The manifest and API index in the PR record the new synced commit.

## Fanning out (many pages)
Split by docs area (`api/abstractions`, `analyzers`, `codec`, `environment`, `framework`, `hosting`, `network`+`options/network`, `runtime`, `sdk`, `security`, `concepts`, `guides`). Give each worker only its own pages' entries from `plan.json` plus the audit findings that touch them; forbid edits outside the area, `navigation.ts`, tests and commits; have every worker cite `file:line` evidence and report false positives instead of editing. Run `npm test` once at the end — concurrent workers see each other's half-edited pages.

## Gotchas
- The audit gate (`tools/tests/test_docs_gate.py`) uses the committed `source-api-index.json`; after the bot bumps it, a new Nalix API without docs shows up as an `A010` gap and fails the PR until documented or accepted in `tools/docs-audit-baseline.json`.
- PRs opened with `GITHUB_TOKEN` do not trigger `ci.yml`; pushing a docs commit does.
- If the previous Nalix commit cannot be downloaded, the report says "previous version unavailable" and treats every API file as 🔴.
