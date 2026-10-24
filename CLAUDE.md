# nalix-docs — Claude Code Guide

Documentation portal for **Nalix** (.NET 10 networking framework), built with **Astro** + **Vitest**.
The source of truth for every technical claim is the sibling repository [`ppn-systems/nalix`](https://github.com/ppn-systems/nalix).

## Layout

| Path | Purpose |
| :--- | :--- |
| `src/content/docs/en-us/` | Canonical English pages (one `.md` per page) |
| `src/content/docs/vi-vn/` | Optional translations, mirroring `en-us` paths 1:1 |
| `src/config/navigation.ts` | Sidebar tree — every page must be registered here |
| `src/i18n/` | Locale registry, routing helpers, UI dictionaries |
| `src/plugins/remark-nalix-docs.ts` | Admonitions, Mermaid, locale-aware link rewriting |
| `tests/` | Vitest gates (frontmatter, links, navigation, i18n, remark plugin, C# parity) |
| `tools/` | Python tools (standard library only): source-sync and docs audit, with `unittest` tests in `tools/tests/` |
| `scripts/` | One-off Node migration script |
| `.github/workflows/source-sync.yml` | Daily drift check; opens a draft PR on `bot/source-sync` only when the docs are affected |
| `source-manifest.json`, `source-api-index.json` | Hashes + public-API snapshot of the `nalix` commit the docs were last synced to |

## Commands

- `npm test` — Vitest gates + Python `unittest` (includes the docs-vs-source audit); run after every content change
- `npm run build` — Astro static build
- `npm run check` — test + build (what CI runs)
- `npm run sync:check` / `sync:update` — classify `nalix` source changes (API / behavior / ignored) and record the synced commit
- `npm run audit` — docs vs source API index (offline); also gated by `tools/tests/test_docs_gate.py`

Run `npm test` after any change under `src/`, `tests/` or `tools/`. Pure `README`/`CLAUDE.md`/skill edits need no validation.

## Global Rules

- **Accuracy first:** never document an API, option, default value or behavior without reading it in `nalix/src`. If the source is not available, say so instead of guessing.
- **English canonical:** write in `en-us`; translations never add content that `en-us` lacks.
- **No new npm or pip dependencies** unless explicitly requested; `tools/` uses the Python standard library only.
- **Surgical changes:** touch only the pages the task requires; match the surrounding tone and structure.
- **Do not rename or move pages** without updating `navigation.ts` and every inbound link (URLs are public).
- Never commit `dist/`, `.astro/`, `node_modules/`.

## Skills Index

| Skill | Focus |
| :--- | :--- |
| [docs-authoring](.claude/skills/docs-authoring.md) | Frontmatter, Markdown rules (R6/R7/R19), admonitions, Mermaid, code samples |
| [docs-structure](.claude/skills/docs-structure.md) | Adding/moving pages, `navigation.ts` sync (R8), i18n `vi-vn` |
| [docs-source-parity](.claude/skills/docs-source-parity.md) | Source-sync tiers (🔴🟡✅⚪), audit codes A001–A010, fixing findings |
| [docs-sync-pr](.claude/skills/docs-sync-pr.md) | Handling the `bot/source-sync` draft PR; fanning out fixes |

The behavioral guidelines in `nalix/CLAUDE.md` (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution) apply here too.
