import type { APIRoute } from 'astro';
import { ENABLED_LOCALES, localizePath } from '../i18n';
import { getAllResolvedDocsForLocale } from '../utils/content-loader';

export interface SearchDocument {
  title: string;
  description: string;
  section: string;
  pkg?: string;
  url: string;
  locale: string;
  headings: string[];
}

export const GET: APIRoute = async () => {
  const docs: SearchDocument[] = [];

  for (const locale of ENABLED_LOCALES) {
    const resolvedList = await getAllResolvedDocsForLocale(locale);
    for (const item of resolvedList) {
      const rawBody = item.entry.body || '';
      const headingMatches = Array.from(rawBody.matchAll(/^#{2,3}\s+(.+)$/gm)).map((m) =>
        m[1].replace(/[`*_~]/g, '').trim()
      );

      docs.push({
        title: item.entry.data.title,
        description: item.entry.data.description || '',
        section: item.entry.data.section || 'Documentation',
        pkg: item.entry.data.package,
        url: localizePath(item.slug, locale),
        locale,
        headings: headingMatches.slice(0, 10),
      });
    }
  }

  return new Response(JSON.stringify(docs), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
