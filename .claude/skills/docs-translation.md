# Skill: docs-translation

Translate the documentation into another language and keep the translation in step with the English pages. The tooling is language independent: a locale is a folder `src/content/docs/<locale>/` that mirrors `en-us/` path for path.

## Triggers

- Adding a language, translating or updating translated pages.
- The check reports a translated page as `invalid`, `stale` or `orphan`.
- An English page changed (the `stale` state tells you which translations to redo).

## Commands

```bash
python3 tools/l10n.py status --locale vi-vn        # progress by section
python3 tools/l10n.py plan --locale vi-vn --out plan.json   # batches of pages to translate, for workers
python3 tools/l10n.py check --locale vi-vn <pages…> --skip-stamps   # structure check while translating
python3 tools/l10n.py fix-anchors --locale vi-vn   # make page.md#section links follow translated headings
python3 tools/l10n.py stamp --locale vi-vn         # record that pages match the current English text
python3 tools/l10n.py check --locale vi-vn         # the full gate (also run by npm test)
```

`<pages…>` are paths relative to the locale folder, for example `guides/blazor-wasm.md`.

## Rules for a translated page

The check enforces these; a page that breaks one is `invalid`.

1. **Front matter** keeps every key. Only `title` and `description` are translated; `section`, `package` and any other key are copied unchanged.
2. **Headings**: same number, same levels, same order.
3. **Code blocks** are copied exactly (same language tag, same text). In `csharp` blocks only comments may be translated. Never translate Mermaid, bash, JSON, XML or YAML.
4. **Text in backticks** is never changed.
5. **Links**: same number, same targets, same order; only the label is translated. Fragments (`#section`) are fixed afterwards by `fix-anchors`, do not guess them.
6. **Tables**: same number of tables, rows and columns. **Callouts** (`:::note[Title]`): same types in the same order; only the title is translated.
7. **No English left**: the prose must be in the target language (a page that reads as English fails).
8. Do not add or remove content, and do not comment on the translation inside the page.

Use the locale glossary (`translations/<locale>.glossary.md`) so a term has one rendering everywhere.

## Workflow

1. `plan` → batches. Give each worker one batch, the rules above and the glossary.
2. The worker writes `src/content/docs/<locale>/<path>` for each page and runs `check <pages> --skip-stamps` until it passes.
3. When all batches are done: `fix-anchors`, then `check --skip-stamps`, then `stamp`, then the full `check`.
4. When an English page changes later, `check` reports its translation as `stale` (the stamp no longer matches). Redo that page, then `stamp` it.

## Checklist for a new language

1. Add the locale to `src/i18n/config.ts` and a dictionary `src/i18n/locales/<locale>.ts` (the tests require every UI key).
2. Add `titles` for the navigation items (`src/config/navigation.ts`).
3. Create `translations/<locale>.glossary.md`.
4. Translate with the workflow above, then set `enabled: true` for the locale.

## Gotchas

- Untranslated pages are served in English with a notice, so a partial translation is safe to publish.
- A heading translation changes its id; that is why links with fragments need `fix-anchors`.
- `stamp` refuses pages that still fail the check.
