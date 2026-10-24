# Docs ↔ Source Parity

## Triggers
- Documenting or changing any API, option, default value, wire format or behavior
- The `nalix` repository changed and docs may be stale
- A reviewer questions the accuracy of a page

---

## Rules
- **Source of truth:** `ppn-systems/nalix` (`src/`, `samples/`, `.claude/skills/*.md`). Clone it next to this repo (`../nalix`).
- Page → package mapping: `packages/nalix-<pkg>.md` and `api/<pkg>/**` document `src/Nalix.<Pkg>/`; `api/options/<area>/**` document the `*Options` classes of that package.
- Type names, member names, defaults and namespaces are copied from source, never paraphrased.
- Respect the Nalix dependency levels (Abstractions → Environment → Codec/Framework → Runtime/Network/SDK → Hosting) when describing where a type lives.
- When an API is removed in source, remove it from docs and, if it is a likely regression, add it to the deny-list in `tests/source-code-parity.test.ts`.

---

## Checklist — verifying a page
1. `grep -rn "<TypeName>" ../nalix/src` to locate the definition.
2. Check every member, default value and code sample on the page against it.
3. Fix discrepancies; `npm test`.

## Checklist — syncing after source changes
1. Pull the latest `../nalix`, then `npm run sync:check`.
   - Compares `../nalix/src` + `samples` (`.cs`, `.csproj`) against `source-manifest.json` (SHA-256 per file, CRLF-normalized).
   - Prints modified / added / removed files and, under each, the pages that mention its type name (`Foo.Types.cs` → `Foo`). Exits `1` when anything changed.
   - Other location: `--source <path>` or `NALIX_SOURCE=<path>`.
2. Read each change (`git -C ../nalix diff <manifest nalixCommit> HEAD -- <file>`) and fix the listed pages; `grep` for renamed members the name match misses.
3. `npm test`, then `npm run sync:update` to record the new hashes + commit, and commit `source-manifest.json` together with the doc fixes.

---

## Gotchas
- Page matching is by type name only: generic file names (`Program.cs`, `Extensions.cs`) list noisy pages, and pages that never name the type are missed.
- Never run `sync:update` without fixing the reported pages — it marks them as reviewed.
- `nalix/.claude/skills/*.md` encode invariants (pipeline order, crypto rules) that docs must not contradict.
- Sample code in `nalix/samples` may lag `src`; trust `src` when they disagree.
