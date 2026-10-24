# Nalix Documentation (`nalix-docs`)

Official documentation portal for **Nalix** — an enterprise-grade real-time TCP, UDP, and WebSocket networking framework for .NET 10.

Built with **Astro 5**, modeled on the **Unity Documentation (`docs.unity.com/en-us`)** layout and architecture, and equipped with first-class **BCP-47 regional i18n (`en-us` / `vi-vn`)** routing and automated integrity tests.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start local development server (http://localhost:4321/en-us)
npm run dev

# Run i18n, navigation, and link integrity tests
npm test

# Run full check (tests + production static build)
npm run check
```

---

## Project Structure

```text
nalix-docs/
├── public/
│   ├── assets/                 # Logos, architecture SVGs, and self-hosted Inter & JetBrains Mono fonts
│   ├── benchmarks/data/        # Raw JSONL benchmark datasets
│   └── CNAME                   # Custom domain configuration (ppn.io.vn)
├── src/
│   ├── components/             # Global Header + Subheader, Unity-style Home Portal, Sidebar Filter, TOC, Search
│   ├── config/
│   │   └── navigation.ts       # Canonical sidebar tree with i18n section labels
│   ├── content/
│   │   └── docs/
│   │       └── en-us/          # 203 canonical English (en-US) documentation pages
│   ├── i18n/
│   │   ├── config.ts           # Locale registry ('en-us' active, 'vi-vn' configured & ready)
│   │   ├── index.ts            # Locale routing, alias normalization ('en' -> 'en-us', 'vn'/'vi' -> 'vi-vn'), and fallback helpers
│   │   └── locales/
│   │       ├── en-us.ts        # English (en-US) UI dictionary
│   │       └── vi-vn.ts        # Vietnamese (vi-VN) UI dictionary
│   ├── layouts/
│   │   └── DocLayout.astro     # Portal Home & 3-column Documentation Reader layout
│   ├── pages/
│   │   ├── index.astro         # Root portal entry
│   │   ├── [locale]/[...slug].astro  # Localized documentation routes (/en-us/...)
│   │   └── search-index.json.ts      # Build-time search index
│   ├── plugins/
│   │   └── remark-nalix-docs.ts      # Custom Remark plugin (admonitions, Mermaid, locale-aware relative links)
│   └── styles/
│       └── apple.css           # Unity Docs design tokens, grids, and typography
└── tests/
    ├── i18n.test.ts            # Guards i18n dictionaries, 'en-us'/'vi-vn' resolution, and translation parity
    ├── navigation-sync.test.ts # Guards 1:1 sync between navigation.ts and markdown files (Rule R8)
    ├── content-and-links.test.ts # Guards frontmatter, markdown rules, and 100% of internal links
    └── remark-plugin.test.ts   # Guards AST transformations
```

---

## How to Add Vietnamese (`vi-vn` / `vn`) Translations Later

The project is pre-wired for Vietnamese (`vi-vn`, with automatic alias support for `vi` and `vn`):

1. **Create the `vi-vn` content directory:**
   Add translated markdown files under `src/content/docs/vi-vn/` mirroring the exact relative path in `src/content/docs/en-us/` (for example, `src/content/docs/vi-vn/quickstart.md`).
   - *Note:* Relative links inside markdown files (like `[Installation](./installation.md)`) are automatically rewritten to `/vi-vn/installation` by `remarkNalixDocs`.
   - *Automatic Fallback:* Any page not yet translated in `src/content/docs/vi-vn/` automatically falls back to the canonical `en-us` version and displays a localized fallback banner (`Đang cập nhật bản dịch`).
2. **Enable `vi-vn` in `src/i18n/config.ts`:**
   Set `enabled: true` under `LOCALE_REGISTRY['vi-vn']`.
3. **Verify with tests:**
   Run `npm test` to verify there are no orphaned paths, missing frontmatter fields, or broken links.

---

## Contributing & Writing Standards

All technical content must match the Nalix source code in [`ppn-systems/nalix`](https://github.com/ppn-systems/nalix). Before contributing, read:

- [`CLAUDE.md`](./CLAUDE.md) — repository layout, commands, and global rules
- [`.claude/skills/docs-authoring.md`](./.claude/skills/docs-authoring.md) — frontmatter, Markdown rules (R6/R7/R19), callouts, code samples
- [`.claude/skills/docs-structure.md`](./.claude/skills/docs-structure.md) — adding/moving pages, navigation sync (R8), i18n
- [`.claude/skills/docs-source-parity.md`](./.claude/skills/docs-source-parity.md) — verifying pages against source and syncing after source changes

Every change must pass `npm test` (and `npm run check` before release).
