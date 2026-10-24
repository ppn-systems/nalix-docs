import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, ENABLED_LOCALES, type LocaleCode } from '../i18n';
import { parseCollectionEntryId } from './docs';

export interface ResolvedDoc {
  entry: CollectionEntry<'docs'>;
  locale: LocaleCode;
  sourceLocale: LocaleCode;
  slug: string;
  relFile: string;
  isFallback: boolean;
}

export async function getAllResolvedDocsForLocale(targetLocale: LocaleCode): Promise<ResolvedDoc[]> {
  const allEntries = await getCollection('docs');

  const byLocaleAndSlug = new Map<LocaleCode, Map<string, { entry: CollectionEntry<'docs'>; relFile: string }>>();

  for (const entry of allEntries) {
    const { locale, relFile, slug } = parseCollectionEntryId(entry.id);
    if (!byLocaleAndSlug.has(locale)) {
      byLocaleAndSlug.set(locale, new Map());
    }
    byLocaleAndSlug.get(locale)!.set(slug, { entry, relFile });
  }

  const defaultMap = byLocaleAndSlug.get(DEFAULT_LOCALE) ?? new Map();
  const localeMap = byLocaleAndSlug.get(targetLocale) ?? new Map();

  // Union of canonical slugs from DEFAULT_LOCALE and any locale-specific slugs
  const allSlugs = new Set<string>([...defaultMap.keys(), ...localeMap.keys()]);
  const resolved: ResolvedDoc[] = [];

  for (const slug of allSlugs) {
    const localized = localeMap.get(slug);
    if (localized) {
      resolved.push({
        entry: localized.entry,
        locale: targetLocale,
        sourceLocale: targetLocale,
        slug,
        relFile: localized.relFile,
        isFallback: false,
      });
      continue;
    }

    const fallback = defaultMap.get(slug);
    if (fallback) {
      resolved.push({
        entry: fallback.entry,
        locale: targetLocale,
        sourceLocale: DEFAULT_LOCALE,
        slug,
        relFile: fallback.relFile,
        isFallback: targetLocale !== DEFAULT_LOCALE,
      });
    }
  }

  return resolved;
}

export async function getStaticPathsForAllEnabledLocales() {
  const paths: Array<{
    params: { locale: string; slug: string | undefined };
    props: ResolvedDoc;
  }> = [];

  for (const locale of ENABLED_LOCALES) {
    const docs = await getAllResolvedDocsForLocale(locale);
    for (const doc of docs) {
      paths.push({
        params: {
          locale,
          slug: doc.slug === '' ? undefined : doc.slug,
        },
        props: doc,
      });
    }
  }

  return paths;
}
