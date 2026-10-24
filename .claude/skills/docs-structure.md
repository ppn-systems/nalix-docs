# Docs Structure & i18n

## Triggers
- Adding, removing, renaming or moving a page
- Editing `src/config/navigation.ts`
- Adding Vietnamese (`vi-vn`) translations or UI strings

---

## Rules

### Navigation sync (R8)
- Every `.md` under `src/content/docs/en-us/` has **exactly one** entry in `NAVIGATION_TREE`, and every entry's `file` exists on disk — no orphans, no dangling entries.
- An entry: `{ title, titleVi, slug, file }`. `slug` = path without `.md` (`index.md` → folder slug, root → `''`).
- Group nodes have `title`, `titleVi`, `items` and no `file`.
- Tests also hard-code the total page count (currently **203**) — update the numbers in `tests/*.test.ts` when adding/removing pages.

### i18n
- Locales are BCP-47 lowercase: `en-us` (default), `vi-vn` (aliases `vi`, `vn`).
- `vi-vn` pages mirror an existing `en-us` path exactly; untranslated pages fall back to `en-us` automatically.
- UI strings live in `src/i18n/locales/*.ts`; every key must exist in all locales (parity test).
- Enable a locale only via `LOCALE_REGISTRY[...].enabled` in `src/i18n/config.ts`.

---

## Checklist — adding a page
1. Create `src/content/docs/en-us/<area>/<name>.md` with valid frontmatter.
2. Register it in `navigation.ts` under the right group (with `titleVi`).
3. Link it from the parent `index.md` where relevant.
4. Bump the page count in tests if needed.
5. `npm test`.

## Checklist — moving/renaming a page
1. Move the file; update `slug` and `file` in `navigation.ts`.
2. `grep -rn "old-name.md" src/content` and fix every inbound relative link.
3. Move the `vi-vn` counterpart if it exists.
4. `npm test`.

---

## Gotchas
- Prev/next pagination follows `NAVIGATION_TREE` order — placement in the tree is reading order.
- A `vi-vn` file without an `en-us` counterpart fails the i18n test.
