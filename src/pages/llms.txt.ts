import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { DEFAULT_LOCALE, localizePath } from '../i18n';
import { getFlatNavigation } from '../config/navigation';

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = (site?.toString() || 'https://docs.ppnsys.com').replace(/\/+$/, '');
  const docsDir = path.resolve(process.cwd(), 'src/content/docs', DEFAULT_LOCALE);
  const flatNav = getFlatNavigation();

  const lines: string[] = [
    '# Nalix Documentation',
    '',
    '> Enterprise-grade, low-latency binary real-time TCP, UDP, and WebSocket networking framework for .NET 10.',
    '',
  ];

  let currentSection = '';
  for (const item of flatNav) {
    if (item.section !== currentSection) {
      currentSection = item.section;
      lines.push(`## ${currentSection}`);
      lines.push('');
    }

    const fullPath = path.join(docsDir, item.file);
    let desc = '';
    let title = item.title;
    if (fs.existsSync(fullPath)) {
      const parsed = matter(fs.readFileSync(fullPath, 'utf8'));
      if (typeof parsed.data.title === 'string' && parsed.data.title.trim()) {
        title = parsed.data.title.trim();
      }
      if (typeof parsed.data.description === 'string' && parsed.data.description.trim()) {
        desc = parsed.data.description.trim();
      }
    }

    const url = `${baseUrl}${localizePath(item.slug, DEFAULT_LOCALE)}`;
    lines.push(`- [${title}](${url})${desc ? `: ${desc}` : ''}`);
  }

  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
