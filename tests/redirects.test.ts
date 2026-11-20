import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_LOCALE_CODES } from '../src/i18n';

const DOCS_ROOT = path.resolve(__dirname, '../src/content/docs');
const REDIRECTS = path.resolve(__dirname, '../public/_redirects');

function pageExists(urlPath: string): boolean {
  const [, locale, ...rest] = urlPath.split('/');
  if (!ALL_LOCALE_CODES.includes(locale as (typeof ALL_LOCALE_CODES)[number])) return false;
  return fs.existsSync(path.join(DOCS_ROOT, locale, `${rest.join('/')}.md`));
}

describe('Cloudflare Pages redirects (public/_redirects)', () => {
  const rules = fs
    .readFileSync(REDIRECTS, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(/\s+/));

  it('uses well-formed "<from> <to> <status>" rules', () => {
    for (const rule of rules) {
      expect(rule.length, rule.join(' ')).toBeGreaterThanOrEqual(3);
      expect(rule[0].startsWith('/'), rule.join(' ')).toBe(true);
      expect(rule[1].startsWith('/'), rule.join(' ')).toBe(true);
      expect(['301', '302', '308'], rule.join(' ')).toContain(rule[2]);
    }
  });

  it('sends every renamed page to a page that exists, and the old URL is no longer a page', () => {
    const problems: string[] = [];
    for (const [from, to] of rules.filter((r) => r[2] === '301')) {
      if (pageExists(from)) problems.push(`${from} is redirected but still exists as a page`);
      if (!pageExists(to)) problems.push(`${from} -> ${to}: the target page does not exist`);
    }
    expect(problems).toEqual([]);
  });
});
