import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  ALL_LOCALE_CODES,
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  LOCALE_REGISTRY,
  TRANSLATIONS,
  getLocaleFromPathname,
  localizePath,
  normalizeLocale,
  resolveLocaleCode,
  switchLocaleInPath,
  useTranslations,
} from '../src/i18n';
import { enUs } from '../src/i18n/locales/en-us';
import { resolveMarkdownHref } from '../src/utils/docs';

const DOCS_ROOT = path.resolve(__dirname, '../src/content/docs');

function walkMdFiles(dir: string, baseDir = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMdFiles(full, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(path.relative(baseDir, full).replace(/\\/g, '/'));
    }
  }
  return results.sort();
}

describe('i18n Configuration & Locale Resolution (en-us / vi-vn)', () => {
  it('defines English (en-us) as the default and active locale', () => {
    expect(DEFAULT_LOCALE).toBe('en-us');
    expect(ENABLED_LOCALES).toContain('en-us');
    expect(LOCALE_REGISTRY['en-us'].enabled).toBe(true);
    expect(resolveLocaleCode('en')).toBe('en-us');
    expect(resolveLocaleCode('en-US')).toBe('en-us');
  });

  it('registers Vietnamese (vi-vn) and resolves "vi" and "vn" aliases to "vi-vn"', () => {
    expect(ALL_LOCALE_CODES).toContain('vi-vn');
    expect(resolveLocaleCode('vi-vn')).toBe('vi-vn');
    expect(resolveLocaleCode('vi')).toBe('vi-vn');
    expect(resolveLocaleCode('vn')).toBe('vi-vn');
    expect(resolveLocaleCode('VN')).toBe('vi-vn');
    expect(resolveLocaleCode('vi-VN')).toBe('vi-vn');
    expect(normalizeLocale('vn')).toBe('vi-vn');
    expect(normalizeLocale('unknown-lang')).toBe('en-us');
  });

  it('enforces 100% UI translation key parity across all registered locales', () => {
    const referenceKeys = Object.keys(enUs).sort();
    expect(referenceKeys.length).toBeGreaterThan(20);

    for (const code of ALL_LOCALE_CODES) {
      const dict = TRANSLATIONS[code];
      expect(dict, `Missing translation dictionary for locale "${code}"`).toBeDefined();

      const localeKeys = Object.keys(dict).sort();
      expect(localeKeys, `Key mismatch in locale "${code}"`).toEqual(referenceKeys);

      for (const key of referenceKeys) {
        const val = dict[key as keyof typeof enUs];
        expect(
          typeof val === 'string' && val.trim().length > 0,
          `Empty translation for key "${key}" in locale "${code}"`
        ).toBe(true);
      }
    }
  });

  it('localizes paths and switches locales while preserving slugs and hashes', () => {
    expect(localizePath('', 'en-us')).toBe('/en-us');
    expect(localizePath('index.md', 'en-us')).toBe('/en-us');
    expect(localizePath('quickstart.md', 'en-us')).toBe('/en-us/quickstart');
    expect(localizePath('guides/index.md', 'vi-vn')).toBe('/vi-vn/guides');
    expect(localizePath('api/network/tcp-listener.md', 'vn')).toBe('/vi-vn/api/network/tcp-listener');

    expect(switchLocaleInPath('/en-us/quickstart#run-it', 'vn')).toBe('/vi-vn/quickstart#run-it');
    expect(switchLocaleInPath('/vi-vn/guides/build-a-chat-room', 'en')).toBe('/en-us/guides/build-a-chat-room');
    expect(getLocaleFromPathname('/vn/api/index')).toBe('vi-vn');
    expect(getLocaleFromPathname('/en-us/packages')).toBe('en-us');
  });

  it('resolves relative markdown links into the current locale automatically', () => {
    expect(resolveMarkdownHref('./quickstart.md', 'index.md', 'en-us')).toBe('/en-us/quickstart');
    expect(resolveMarkdownHref('./quickstart.md', 'index.md', 'vi-vn')).toBe('/vi-vn/quickstart');
    expect(
      resolveMarkdownHref('../deployment/production-checklist.md#tls', 'guides/getting-started/server-blueprint.md', 'vi-vn')
    ).toBe('/vi-vn/guides/deployment/production-checklist#tls');
  });

  it('provides translated strings via useTranslations()', () => {
    const tEn = useTranslations('en-us');
    const tVi = useTranslations('vi-vn');
    expect(tEn('home.exploreTopics')).toBe('Explore topics');
    expect(tVi('home.exploreTopics')).toBe('Khám phá chủ đề');
    expect(tEn('nav.searchShortcut')).toBe('Ctrl K');
    expect(tVi('nav.searchShortcut')).toBe('Ctrl K');
  });
});

describe('Content Directory i18n Guardrails', () => {
  it('only allows valid registered locale folders inside src/content/docs', () => {
    const entries = fs.readdirSync(DOCS_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      expect(
        entry.isDirectory(),
        `Unexpected file "${entry.name}" directly inside src/content/docs/. Place docs inside a locale folder like src/content/docs/en-us/.`
      ).toBe(true);
      expect(
        ALL_LOCALE_CODES.includes(entry.name as any),
        `Folder "src/content/docs/${entry.name}" is not a registered locale in LOCALE_REGISTRY (${ALL_LOCALE_CODES.join(', ')}).`
      ).toBe(true);
    }
  });

  it('verifies that any translated files in secondary locales map to canonical English (en-us) files', () => {
    const enFiles = new Set(walkMdFiles(path.join(DOCS_ROOT, DEFAULT_LOCALE)));
    expect(enFiles.size).toBe(203);

    for (const locale of ALL_LOCALE_CODES) {
      if (locale === DEFAULT_LOCALE) continue;
      const localeDir = path.join(DOCS_ROOT, locale);
      if (!fs.existsSync(localeDir)) continue;

      const translatedFiles = walkMdFiles(localeDir);
      for (const relFile of translatedFiles) {
        expect(
          enFiles.has(relFile),
          `Orphaned translation "${locale}/${relFile}" has no matching canonical file in "${DEFAULT_LOCALE}/${relFile}"`
        ).toBe(true);

        const raw = fs.readFileSync(path.join(localeDir, relFile), 'utf8');
        const parsed = matter(raw);
        expect(
          typeof parsed.data.title === 'string' && parsed.data.title.trim().length > 0,
          `Translated file "${locale}/${relFile}" is missing a valid frontmatter title`
        ).toBe(true);
      }
    }
  });
});
