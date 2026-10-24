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
1. Identify changed files in `nalix/src` since the last synced revision.
2. Map each changed file to the pages that document it (mapping above + `grep` for type names).
3. Update those pages, then record the new synced revision.

> A script that snapshots the `nalix` source tree with per-file hashes and reports changed files (to automate steps 1 and 3) is planned under `scripts/`. Until it exists, use `git -C ../nalix diff --stat <last-rev> HEAD -- src`.

---

## Gotchas
- `nalix/.claude/skills/*.md` encode invariants (pipeline order, crypto rules) that docs must not contradict.
- Sample code in `nalix/samples` may lag `src`; trust `src` when they disagree.
