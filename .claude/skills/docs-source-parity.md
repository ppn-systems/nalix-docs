# Docs ↔ Source Parity

## Triggers
- Documenting or changing any API, option, default value, wire format or behavior
- The `nalix` repository changed and docs may be stale (a `bot/source-sync` PR appeared)
- A reviewer questions the accuracy of a page
- `tools/tests/test_docs_gate.py` fails

---

## The tools (`tools/`, Python 3.10+, standard library only)

| Command | What it answers |
| :--- | :--- |
| `npm run sync:check` | What changed in `ppn-systems/nalix` since `source-manifest.json`, **and does it matter to the docs?** |
| `npm run sync:update` | Record the current Nalix commit (hashes + `source-api-index.json`). Only after the docs were fixed. |
| `npm run audit` | Is anything in the docs wrong or missing compared with the committed API index? Runs offline. |

`source-api-index.json` is a public-API snapshot of Nalix (types, namespaces, options + defaults, enum members, identifiers, every repo path). It is what lets the tests run without the network.

### Change tiers (`sync:check`)
| | Meaning | Action |
| :-- | :-- | :-- |
| 🔴 | Public signature/default/enum changed and the docs do not show it | Edit the listed pages; the report gives `+/-` signatures and `page:line` pointers |
| 🟡 | Body changed in a file a page cites **and** the changed lines mention things that page also mentions | Read the diff; edit only if the page is now wrong |
| ✅ | API changed but the docs already contain the new signatures | Nothing |
| ⚪ | Internal, not cited by any page, or only comments/formatting | Nothing — **never edit docs for these** |

`sync-check` ends its report with an **Edit plan by page** (docs line + what to change + source line); see [docs-sync-pr](./docs-sync-pr.md). Signatures ignore `async`, `private protected` members and source-generator `*Model` types (not part of the contract).

Hashing ignores `//`, `/* */`, `///` and formatting; literals (`"//"`, `$"{x}"`, `"""raw"""`, `'"'`) are preserved, so the scanner never mistakes them for comments.

### Audit codes
| Code | Severity | Meaning |
| :-- | :-- | :-- |
| A001 | error | A cited `src/…`, `samples/…`, `analyzers/…` path does not exist |
| A002 | error | `**Namespace:**` unknown, or a page named after a type disagrees with its namespace/assembly |
| A003 | error | Options table lists a property the class lacks, or (dedicated page) omits one it has |
| A004 | error | Options default differs from the source literal (numbers, bools, `TimeSpan`) |
| A005 | error/warn | Enum section lists a member the enum lacks (warn: omits one) |
| A006 | error/warn | `Enum.Member` or `Type.Member` that does not exist in the source |
| A007 | error | A numeric value listed for an enum member (opcodes, flags) differs from the source |
| A008 | error/warn | `NALIXnnn` id unknown/missing from the catalogue, wrong severity or counts; warn: title differs |
| A009 | error | Package diagram edge with no project reference behind it (or a missing one in a complete diagram); wrong "Level N" |
| A010 | gap | Public type no page mentions |
| A011 | error | A Nalix package version newer than any version the repository knows (`Version.props`, samples) |
| A012 | error | `page.md#heading` link whose heading does not exist (the message suggests the closest heading) |
| A013 | warn | A signature written in a C# fence or table is not an overload in the source (the message lists the real ones) |

### Code map
```text
tools/run.py                      entry point (sync-check | sync-update | audit)
tools/docsync/domain/             pure logic, no I/O
  normalize.py                    comment-free C#/XML views, content hash
  declarations.py, surface.py     type scan, member signatures, surface diff
  api_index.py, api_view.py       the API index (build / query)
  enum_values.py, diagnostics.py, projects.py, signatures.py   facts the checks compare against
  checks/                         one module per audit rule, registered in checks/__init__.py
  classifier.py, report.py        change tiers and Markdown report
tools/docsync/application/        use cases (CheckDrift, RecordSnapshot, AuditDocs) and their ports
tools/docsync/infrastructure/     GitHub client, tarball reader, local clone, JSON stores
tools/tests/                      unittest suite
tools/docs-audit-baseline.json    accepted findings, each with a reason
```
Add an audit rule: create a module in `checks/` with a `code` and `run(ctx)` returning `Finding`s, register it in `checks/__init__.py`, and add a case to `tools/tests/test_audit_checks.py`.

---

## Rules
- **Source of truth:** `ppn-systems/nalix` (`src/`, `samples/`, `analyzers/`, `.claude/skills/*.md`). Clone it next to this repo (`../nalix`) for reading code; the tools themselves read GitHub.
- Page → package mapping: `packages/nalix-<pkg>.md` and `api/<pkg>/**` document `src/Nalix.<Pkg>/`; `api/options/<area>/**` document the `*Options` classes of that package. Pages list their files under **Source Mapping** — keep it accurate, the sync tool uses it to find pages.
- Type names, member names, defaults and namespaces are copied from source, never paraphrased.
- When an API is removed in source, remove it from docs and, if it is a likely regression, add it to the deny-list in `tests/source-code-parity.test.ts`.
- **Do not edit a page just because a file changed.** Edit when a statement on the page became false or a public item is missing.

## Checklist — fixing a finding
1. Open the page line and the real source (`grep -rn "<Name>" ../nalix/src`).
2. Decide: real → fix the page; false positive → fix the **tool** and add a test case in `tools/tests/`, or, if the exception is legitimate, add it to `tools/docs-audit-baseline.json` with a reason.
3. `npm test`, then `npm run sync:update` if the Nalix commit moved.

## Checklist — a `bot/source-sync` PR (CI)
See [docs-sync-pr](./docs-sync-pr.md).

---

## Gotchas
- A004 compares against the Options class the table is *about* (nearest type above it) — tables for attribute properties that share names with options are skipped on non-dedicated pages.
- A006 ignores members shorter than 4 characters (the identifier index cannot hold them) and anything inside paths.
- Page matching for 🟡 uses Source Mapping citations; very broad citations (`src/Nalix.Network`) are ignored on purpose.
- Never run `sync:update` without fixing the reported pages — it marks them as reviewed.
