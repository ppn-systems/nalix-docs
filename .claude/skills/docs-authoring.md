# Docs Authoring

## Triggers
- Writing or editing any page under `src/content/docs/`
- Adding code samples, callouts or diagrams
- A content test in `tests/content-and-links.test.ts` or `tests/source-code-parity.test.ts` fails

---

## Rules

### Frontmatter (required on every page)
```yaml
---
title: Nalix.Codec            # Starts with an uppercase letter or digit; never a filename like "index"
description: One sentence, plain text, quoted if it contains ':'
section: Packages             # Sidebar section label
package: Nalix.Codec          # Optional — only on package/API pages
---
```

### Markdown hygiene (enforced by tests)
- **No H1 in the body** — the layout renders `title` as the H1. Start at `##`.
- **R7:** every fenced code block has a language tag (`csharp`, `bash`, `json`, `text`, `mermaid`, …).
- **R6 / R19:** no backticks inside link labels — write `[LiteSerializer](./x.md)`, not `` [`LiteSerializer`](./x.md) ``.
- No MkDocs leftovers: `!!! note`, `:fontawesome-…:` shortcodes, `{.md-button}`.
- No leaked working notes: headings like `## Audit Summary`, `## Missing Content Identified`, `## Improvement Rationale`.
- No mojibake — files are UTF-8 without BOM.

### Links
- Use **relative `.md` links** (`./serialization.md`, `../packages/nalix-codec.md`). The remark plugin rewrites them to `/<locale>/<slug>`.
- Every internal link and image must resolve — the link test checks 100% of them.
- Assets live in `public/assets/` and are referenced with absolute `/assets/...` paths.

### Callouts & diagrams
- Callouts: `:::note[Title]` … `:::` (also `tip`, `warning`, `danger`; unknown kinds fall back to `note`).
- Diagrams: ` ```mermaid ` blocks; keep them small and readable in both themes.

### Code samples
- C# 14 / .NET 10, file-scoped namespaces, matching current Nalix APIs.
- Prefer real snippets from `nalix/samples` or `nalix/src`; cite the path (e.g. ``Full source: `samples/BlazorWasm` ``).
- Never show removed APIs (e.g. `MaxGroupConcurrency`, `TotalBuffers`, `BufferAllocations`, `.Listen*<T>()` → use `.Map*<T>()`).

---

## Checklist — editing a page
1. Read the relevant source in `nalix/src` first.
2. Edit the page; keep frontmatter valid.
3. `npm test`.
4. For layout-visible changes, `npm run dev` and check `/en-us/<slug>`.

---

## Gotchas
- A `title` starting lowercase fails the "enterprise title" test even if it is a type name — capitalize or rephrase.
- An unclosed fence makes the rest of the file count as code and hides other violations; the test reports it at EOF.
- Unquoted `description` containing `: ` breaks YAML parsing.
