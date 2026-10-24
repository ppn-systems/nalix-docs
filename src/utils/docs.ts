import path from 'node:path';
import { DEFAULT_LOCALE, localizePath, normalizeLocale, resolveLocaleCode, type LocaleCode } from '../i18n';

/**
 * Converts a relative markdown path (e.g., `guides/index.md`, `index.md`, `api/codec/lz4.md`)
 * into a canonical doc slug (`guides`, ``, `api/codec/lz4`).
 */
export function fileToSlug(relFilePath: string): string {
  const norm = relFilePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.md$/i, '');
  if (norm === 'index') return '';
  if (norm.endsWith('/index')) {
    return norm.slice(0, -'/index'.length);
  }
  return norm;
}

/**
 * Splits an Astro Content Collection entry id (e.g., `en/guides/build-a-chat-room` or `en/guides/index.md`)
 * into `{ locale, relFile, slug }`.
 */
export function parseCollectionEntryId(entryId: string): {
  locale: LocaleCode;
  relFile: string;
  slug: string;
} {
  const normalized = entryId.replace(/\\/g, '/').replace(/^\/+/, '');
  const segments = normalized.split('/');
  const maybeLocale = resolveLocaleCode(segments[0]);

  const locale: LocaleCode = maybeLocale ?? DEFAULT_LOCALE;
  const rest = maybeLocale ? segments.slice(1).join('/') : normalized;
  const relFile = rest.endsWith('.md') ? rest : `${rest}.md`;
  const slug = fileToSlug(relFile);

  return { locale, relFile, slug };
}

/**
 * Resolves a relative link or asset href inside a Markdown file located at `currentRelFile`
 * (relative to `src/content/docs/<locale>/`, e.g. `guides/networking/tcp-patterns.md`)
 * into a canonical web URL for `locale`.
 */
export function resolveMarkdownHref(
  rawHref: string,
  currentRelFile: string,
  localeInput: LocaleCode = DEFAULT_LOCALE
): string {
  const href = rawHref.trim();
  if (!href) return href;

  // External links, mailto, or pure anchor links remain untouched
  if (/^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(href)) {
    return href;
  }

  const locale = normalizeLocale(localeInput);
  const [pathAndQuery, hashFragment] = href.split('#');
  const [rawPath, queryString] = pathAndQuery.split('?');
  const suffix = (queryString ? `?${queryString}` : '') + (hashFragment ? `#${hashFragment}` : '');

  const normCurrent = currentRelFile.replace(/\\/g, '/').replace(/^\/+/, '');
  const currentDir = path.posix.dirname(normCurrent);

  // Resolve POSIX path relative to current markdown file's directory
  let resolvedPosix: string;
  if (rawPath.startsWith('/')) {
    resolvedPosix = path.posix.normalize(rawPath).replace(/^\/+/, '');
  } else {
    resolvedPosix = path.posix.normalize(
      currentDir === '.' ? rawPath : path.posix.join(currentDir, rawPath)
    );
  }

  // Strip any accidental leading ../
  resolvedPosix = resolvedPosix.replace(/^(\.\.\/)+/, '');

  // Check if it's a static asset (image, svg, font, jsonl data, etc.)
  const ext = path.posix.extname(resolvedPosix).toLowerCase();
  if (ext && ext !== '.md' && ext !== '.mdx') {
    return `/${resolvedPosix}${suffix}`;
  }

  // Check if path already starts with a locale segment (e.g., `en/quickstart`)
  const firstSeg = resolvedPosix.split('/')[0];
  if (resolveLocaleCode(firstSeg) !== null) {
    const withoutLocale = resolvedPosix.split('/').slice(1).join('/');
    const slug = fileToSlug(withoutLocale);
    return `${localizePath(slug, locale)}${suffix}`;
  }

  // Standard markdown doc reference
  const slug = fileToSlug(resolvedPosix);
  return `${localizePath(slug, locale)}${suffix}`;
}
