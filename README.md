# Nalix Documentation

Source of the documentation site for [Nalix](https://github.com/ppn-systems/nalix), a .NET 10 networking framework (TCP, UDP and WebSocket).

Live site: <https://ppn.io.vn>

The site is a static [Astro](https://astro.build) project. Pages are Markdown files under `src/content/docs/`, tested with Vitest and deployed to Cloudflare Pages.

## Requirements

- Node.js 24 (what CI uses)
- Python 3.10 or newer, only for the tools in `tools/` and their tests (standard library only, nothing to install)

## Getting started

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # content, navigation, i18n and link tests + the Python tool tests
npm run build    # static site into dist/
npm run check    # test + build, the same as CI
```

## Writing documentation

English pages live in `src/content/docs/en-us/`:

| Folder | Content |
| :--- | :--- |
| `index.md`, `installation.md`, `quickstart.md` | Entry pages |
| `guides/` | Task-oriented walkthroughs |
| `concepts/` | How Nalix works: handshake, sessions, sharding, guarantees |
| `api/` | Reference for each package, plus `api/options/` for the `*Options` classes |
| `packages/` | One overview page per NuGet package |
| `benchmarks/` | Benchmark results (raw data in `public/benchmarks/`) |

Every page needs this frontmatter:

```yaml
---
title: Connection Guard Options   # starts with a capital letter or digit
description: One sentence.        # quote it if it contains ': '
section: API Reference
---
```

Rules the tests enforce:

- A page is listed in `src/config/navigation.ts`, and every entry there has a file.
- No `# H1` in the body (the title is rendered from the frontmatter).
- Every code fence has a language tag.
- No backticks inside link labels: write `[LiteSerializer](./x.md)`.
- Links are relative `.md` links and must resolve; they are rewritten per locale at build time.
- Callouts use `:::note[Title]` (also `tip`, `warning`, `danger`); diagrams use ` ```mermaid `.

Technical statements must match the Nalix source. Read the code before documenting a member, option or default value.

## Translations

`vi-vn` is registered but switched off. To start translating:

1. Add pages under `src/content/docs/vi-vn/` with exactly the same relative paths as in `en-us/`. Pages without a translation fall back to English with a notice.
2. Set `enabled: true` for `vi-vn` in `src/i18n/config.ts`.
3. Run `npm test`.

## Keeping the docs accurate

`tools/` contains Python tools (standard library only) that compare the docs with the Nalix source on GitHub:

```bash
npm run audit         # docs vs the stored API snapshot: paths, namespaces, option defaults, enum members and values, diagnostic codes, package graph and versions, heading links, signatures, undocumented types
npm run sync:check    # what changed in Nalix since the docs were last synced, and which of it matters
npm run sync:update   # record the current Nalix commit as synced (after fixing the docs)
```

`sync:check` ignores changes that do not affect the docs: comments, formatting and method bodies are not compared. Each remaining change is reported as one of

- **API change the docs do not show**: a signature diff with source line numbers,
- **behavior change in code a page describes**: a line diff to review, which may need no edit,
- **already documented** or **internal**: nothing to do.

The report starts with an edit plan grouped by page: for each page the docs lines to change, what they say now, the old and new signature, and the source line to read. `--plan plan.json` writes the same plan as JSON so each page can be handed to one person or one agent.

`source-manifest.json` (file hashes) and `source-api-index.json` (public API snapshot) record the Nalix commit the docs match. `npm test` runs the audit against that snapshot, so the docs cannot drift from it unnoticed. Findings that are intentionally accepted are listed with a reason in `tools/docs-audit-baseline.json`.

The workflow `.github/workflows/source-sync.yml` runs the check every day. When Nalix changed in a way that affects the docs, it opens one draft pull request on `bot/source-sync` with the report. Check out that branch, update the listed pages, push and merge.

The repository setting **Allow GitHub Actions to create and approve pull requests** (Settings → Actions → General) must be enabled for the workflow to open that pull request.

## Project structure

```text
.
├── src/
│   ├── content/docs/en-us/     # the documentation pages
│   ├── config/navigation.ts    # sidebar tree
│   ├── components/             # header, sidebar, search, table of contents, home page
│   ├── layouts/DocLayout.astro # page layout
│   ├── pages/                  # routes, search index, sitemap, llms.txt
│   ├── plugins/                # remark plugin: callouts, Mermaid, locale-aware links
│   ├── i18n/                   # locales and UI strings
│   └── styles/nalix.css
├── public/                     # assets, benchmark data, robots.txt, CNAME
├── tests/                      # Vitest: content, navigation, i18n, links, plugin
├── tools/                      # Python: audit and source-sync tools, with unittest tests
├── source-manifest.json        # hashes of the Nalix source the docs were last synced to
├── source-api-index.json       # public API snapshot of that Nalix commit
└── .github/workflows/          # ci.yml, deploy.yml, source-sync.yml
```

## CI and deployment

- `ci.yml` runs the tests and the build on pushes and pull requests.
- `deploy.yml` is started by hand and publishes `dist/` to Cloudflare Pages (project `nalix-docs`).

## License

Apache License 2.0, see [LICENSE](./LICENSE).
