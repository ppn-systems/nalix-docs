import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, ENABLED_LOCALES, getLocaleDefinition, localizePath } from '../i18n';
import { getFlatNavigation } from '../config/navigation';

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = (site?.toString() || 'https://ppn.io.vn').replace(/\/+$/, '');
  const flatNav = getFlatNavigation();

  const urls = flatNav.map((item) => {
    const loc = `${baseUrl}${localizePath(item.slug, DEFAULT_LOCALE)}`;
    const alternates = ENABLED_LOCALES.map((locale) => {
      const def = getLocaleDefinition(locale);
      const href = `${baseUrl}${localizePath(item.slug, locale)}`;
      return `    <xhtml:link rel="alternate" hreflang="${def.htmlLang}" href="${href}" />`;
    }).join('\n');

    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      alternates,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />`,
      '  </url>',
    ].join('\n');
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
