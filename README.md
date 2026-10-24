# Nalix Documentation

Source of the documentation site for [Nalix](https://github.com/ppn-systems/nalix), a .NET 10 networking framework (TCP, UDP and WebSocket).

Live site: <https://docs.ppnsys.com>

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

A translation is a folder `src/content/docs/<locale>/` that mirrors `en-us/` path for path (`vi-vn` is the first one). A page without a translation is shown in English with a notice, so a partial translation can be published.

```bash
npm run l10n:status   # how much is translated, by section
npm run l10n:check    # compare every translated page with its English source
python3 tools/l10n.py plan --locale vi-vn --out plan.json   # batches of pages still to translate
python3 tools/l10n.py fix-anchors --locale vi-vn            # make page.md#section links follow translated headings
python3 tools/l10n.py fix-numbers --locale vi-vn            # write numbers as in the English page
python3 tools/l10n.py stamp --locale vi-vn                  # record that pages match the current English text
```

`check` fails (and so does `npm test`) when a translated page

- changes the structure: front matter keys other than `title` and `description`, heading levels, tables, callouts or the number and targets of links;
- changes code: code blocks and text in backticks must be identical (only comments in `csharp` blocks may be translated); numbers keep the English notation (`65,536`);
- still reads as English;
- has a link fragment (`#section`) that matches no heading;
- is out of date: the English page changed after it was translated (`translations/<locale>.lock.json` holds the stamp), or no English page exists.

Adding a language: add it to `src/i18n/config.ts` with a UI dictionary in `src/i18n/locales/`, give the navigation items their `titles`, write `translations/<locale>.glossary.md`, translate with the commands above, then set `enabled: true`. The workflow for people and agents is in `.claude/skills/docs-translation.md`.

## Keeping the docs accurate

`tools/` contains Python tools (standard library only) that compare the docs with the Nalix source on GitHub:

```bash
npm run audit         # docs vs the stored API snapshot: paths, namespaces, option defaults, enum members and values, diagnostic codes, package graph and versions, heading links, signatures, undocumented types
npm run coverage      # per package: share of public types and methods that pages mention (add --live for the current source)
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

The same workflow also runs a **full audit every day**, even when Nalix did not change: `audit --live` builds the API index from the current GitHub source in memory and compares the pages with it, and `coverage --live` prints the per-package table. Both go to the run summary and an artifact; unaccepted audit errors fail the job.

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
├── tools/                      # Python: audit and source-sync tools (docsync), translation tools (l10n), unittest tests
├── translations/               # per-language glossary and stamps of the English text each page was translated from
├── source-manifest.json        # hashes of the Nalix source the docs were last synced to
├── source-api-index.json       # public API snapshot of that Nalix commit
└── .github/workflows/          # ci.yml, preview.yml, deploy.yml, source-sync.yml
```

## CI and deployment

- `ci.yml` runs the tests and the build on pushes and pull requests.
- `preview.yml` deploys a Cloudflare Pages preview for pull requests (branch `pr-<number>`, URL posted as a sticky comment). It only runs when the PR changes `src/`, `public/`, `astro.config.*`, `package*.json` or `tsconfig.json`; changes to `tools/`, `tests/`, workflows, README or the sync snapshot deploy nothing. Fork PRs are skipped because they have no secrets.
- `deploy.yml` is started by hand and publishes `dist/` to Cloudflare Pages (project `nalix-docs`).

## License

Apache License 2.0, see [LICENSE](./LICENSE).
