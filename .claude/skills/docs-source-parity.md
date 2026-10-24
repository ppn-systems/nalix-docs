# Docs ↔ Source Parity

## Triggers
- Documenting or changing any API, option, default value, wire format or behavior
- The `nalix` repository changed and docs may be stale (a `bot/source-sync` PR appeared)
- A reviewer questions the accuracy of a page
- `tests/docs-audit.test.ts` fails

---

## The tools (all dependency-free Node ESM in `scripts/`)

| Tool | Command | What it answers |
| :--- | :--- | :--- |
| `source-sync.mjs` | `npm run sync:check` | What changed in `ppn-systems/nalix` since `source-manifest.json`, **and does it matter to the docs?** |
| `source-sync.mjs` | `npm run sync:update` | Record the current Nalix commit (hashes + `source-api-index.json`). Only after the docs were fixed. |
| `docs-audit.mjs` | `npm run audit` | Is anything in the docs wrong or missing compared with the committed API index? Runs offline. |

`source-api-index.json` = public API snapshot of Nalix (types, namespaces, options + defaults, enum members, identifiers, every repo path). It is what lets the tests run without the network.

### Change tiers (`sync:check`)
| | Meaning | Action |
| :-- | :-- | :-- |
| 🔴 | Public signature/default/enum changed and the docs do not show it | Edit the listed pages; the report gives `+/-` signatures and `page:line` pointers |
| 🟡 | Body changed in a file a page cites **and** the changed lines mention things that page also mentions | Read the diff; edit only if the page is now wrong |
| ✅ | API changed but the docs already contain the new signatures | Nothing |
| ⚪ | Internal, not cited by any page, or only comments/formatting | Nothing — **never edit docs for these** |

Hashing ignores `//`, `/* */`, `///` and formatting; literals (`"//"`, `$"{x}"`, `"""raw"""`, `'"'`) are preserved, so the scanner never mistakes them for comments.

### Audit codes (`docs-audit.mjs`)
| Code | Severity | Meaning |
| :-- | :-- | :-- |
| A001 | error | A cited `src/…`, `samples/…`, `analyzers/…` path does not exist |
| A002 | error | `**Namespace:**` unknown, or a page named after a type disagrees with its namespace/assembly |
| A003 | error | Options table lists a property the class lacks, or (dedicated page) omits one it has |
| A004 | error | Options default differs from the source literal (numbers, bools, `TimeSpan`) |
| A005 | error/warn | Enum section lists a member the enum lacks (warn: omits one) |
| A006 | error/warn | `Enum.Member` or `Type.Member` that does not exist in the source |
| A010 | gap | Public type no page mentions |

---

## Rules
- **Source of truth:** `ppn-systems/nalix` (`src/`, `samples/`, `analyzers/`, `.claude/skills/*.md`). Clone it next to this repo (`../nalix`) for reading code; the tools themselves read GitHub.
- Page → package mapping: `packages/nalix-<pkg>.md` and `api/<pkg>/**` document `src/Nalix.<Pkg>/`; `api/options/<area>/**` document the `*Options` classes of that package. Pages list their files under **Source Mapping** — keep it accurate, the sync tool uses it to find pages.
- Type names, member names, defaults and namespaces are copied from source, never paraphrased.
- When an API is removed in source, remove it from docs and, if it is a likely regression, add it to the deny-list in `tests/source-code-parity.test.ts`.
- **Do not edit a page just because a file changed.** Edit when a statement on the page became false or a public item is missing.

## Checklist — fixing a finding
1. Open the page line and the real source (`grep -rn "<Name>" ../nalix/src`).
2. Decide: real → fix the page; false positive → fix the **tool** (add a test case in `tests/docs-audit.test.ts` / `tests/drift-report.test.ts`) or, if the exception is legitimate, add it to `tests/fixtures/docs-audit-baseline.json` with a reason.
3. `npm test` (includes the audit gate), then `npm run sync:update` if the Nalix commit moved.

## Checklist — a `bot/source-sync` PR (CI)
See [docs-sync-pr](./docs-sync-pr.md).

---

## Gotchas
- `A004` compares against the Options class the table is *about* (nearest type above it) — tables for attribute properties that share names with options are skipped on non-dedicated pages.
- `A006` ignores members shorter than 4 characters (the identifier index cannot hold them) and anything inside paths.
- Page matching for 🟡 uses Source Mapping citations; very broad citations (`src/Nalix.Network`) are ignored on purpose.
- Behind an HTTPS proxy, Node 22 `fetch` needs `NODE_USE_ENV_PROXY=1`.
- Never run `sync:update` without fixing the reported pages — it marks them as reviewed.
