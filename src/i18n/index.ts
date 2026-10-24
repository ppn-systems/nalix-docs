import {
  ALL_LOCALE_CODES,
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  LOCALE_REGISTRY,
  type LocaleCode,
  type LocaleDefinition,
} from './config';
import { enUs, type TranslationDictionary, type TranslationKey } from './locales/en-us';
import { viVn } from './locales/vi-vn';

export * from './config';
export type { TranslationDictionary, TranslationKey };

export const TRANSLATIONS: Record<LocaleCode, TranslationDictionary> = {
  'en-us': enUs,
  'vi-vn': viVn,
};

/**
 * Resolves a raw locale string (including aliases like 'en' -> 'en-us', 'vn'/'vi' -> 'vi-vn')
 * to a valid LocaleCode. Returns null if the input does not match any registered locale or alias.
 */
export function resolveLocaleCode(input: string | undefined | null): LocaleCode | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase().replace(/_/g, '-');
  for (const code of ALL_LOCALE_CODES) {
    if (code === normalized) return code;
    if (LOCALE_REGISTRY[code].aliases.map((a) => a.toLowerCase().replace(/_/g, '-')).includes(normalized)) {
      return code;
    }
  }
  return null;
}

/**
 * Normalizes a locale input to a valid LocaleCode, falling back to DEFAULT_LOCALE ('en-us').
 */
export function normalizeLocale(input: string | undefined | null): LocaleCode {
  return resolveLocaleCode(input) ?? DEFAULT_LOCALE;
}

/**
 * Checks whether a string resolves to an enabled locale code.
 */
export function isEnabledLocale(input: string | undefined | null): input is LocaleCode {
  const code = resolveLocaleCode(input);
  return code !== null && ENABLED_LOCALES.includes(code);
}

/**
 * Gets the LocaleDefinition for a locale code.
 */
export function getLocaleDefinition(locale: string): LocaleDefinition {
  const code = normalizeLocale(locale);
  return LOCALE_REGISTRY[code];
}

/**
 * Returns a translator function `t(key)` for the given locale, with automatic fallback to `DEFAULT_LOCALE`.
 */
export function useTranslations(localeInput: string) {
  const locale = normalizeLocale(localeInput);
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LOCALE];
  const fallback = TRANSLATIONS[DEFAULT_LOCALE];

  return function t(key: TranslationKey): string {
    return dict[key] ?? fallback[key] ?? key;
  };
}

/**
 * Extracts the locale code from a URL pathname (e.g., `/en-us/guides` -> `en-us`, `/vn/quickstart` -> `vi-vn`).
 */
export function getLocaleFromPathname(pathname: string): LocaleCode {
  const clean = pathname.replace(/^\/+/, '');
  const firstSegment = clean.split('/')[0];
  return resolveLocaleCode(firstSegment) ?? DEFAULT_LOCALE;
}

/**
 * Builds a canonical localized path: `/en-us/quickstart` or `/en-us` for index.
 */
export function localizePath(slug: string, localeInput: string = DEFAULT_LOCALE): string {
  const targetLocale = normalizeLocale(localeInput);
  const cleanedSlug = slug
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\.md$/i, '')
    .replace(/(^|\/)index$/i, '');

  if (!cleanedSlug) {
    return `/${targetLocale}`;
  }
  return `/${targetLocale}/${cleanedSlug}`;
}

/**
 * Switches the locale prefix of an existing URL pathname while preserving the doc slug and hash/search.
 */
export function switchLocaleInPath(pathname: string, targetLocaleInput: string): string {
  const targetLocale = normalizeLocale(targetLocaleInput);
  const [pathWithoutHash, hash] = pathname.split('#');
  const segments = pathWithoutHash.replace(/^\/+/, '').split('/').filter(Boolean);

  if (segments.length > 0 && resolveLocaleCode(segments[0]) !== null) {
    segments[0] = targetLocale;
  } else {
    segments.unshift(targetLocale);
  }

  const newPath = '/' + segments.join('/');
  return hash ? `${newPath}#${hash}` : newPath;
}
