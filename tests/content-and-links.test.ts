import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { DEFAULT_LOCALE, localizePath } from '../src/i18n';
import { fileToSlug, resolveMarkdownHref } from '../src/utils/docs';

const EN_DOCS_DIR = path.resolve(__dirname, `../src/content/docs/${DEFAULT_LOCALE}`);
const PUBLIC_DIR = path.resolve(__dirname, '../public');

function walkMdFiles(dir: string, baseDir = dir): string[] {
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

describe('Documentation Content Quality & Internal Link Integrity', () => {
  const mdFiles = walkMdFiles(EN_DOCS_DIR);
  const validLocalizedUrls = new Set(
    mdFiles.map((f) => localizePath(fileToSlug(f), DEFAULT_LOCALE))
  );

  it('validates YAML frontmatter (title, description, section) and Enterprise title standards on all 203 pages', () => {
    const invalid: string[] = [];
    for (const relFile of mdFiles) {
      const raw = fs.readFileSync(path.join(EN_DOCS_DIR, relFile), 'utf8');
      const parsed = matter(raw);
      const title = typeof parsed.data.title === 'string' ? parsed.data.title.trim() : '';
      const desc = typeof parsed.data.description === 'string' ? parsed.data.description.trim() : '';
      if (!title || !desc) {
        invalid.push(`${relFile} — missing title or description`);
        continue;
      }
      // Title must start with an uppercase letter or digit, never a raw lowercase filename like 'index' or 'hashing-and-mac'
      if (/^[a-z]/.test(title) || title === 'index') {
        invalid.push(`${relFile} — non-enterprise lowercase/filename title: "${title}"`);
      }
      if (/:[a-z0-9]+-[a-z0-9-]+:/i.test(title)) {
        invalid.push(`${relFile} — uncleaned icon shortcode in title: "${title}"`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it('enforces Markdown hygiene (no MkDocs !!! blocks, no :fontawesome-*: shortcodes, no duplicate H1, no {.md-button}, no untagged code blocks, no backticked link labels)', () => {
    const violations: string[] = [];

    for (const relFile of mdFiles) {
      const raw = fs.readFileSync(path.join(EN_DOCS_DIR, relFile), 'utf8');
      const { content } = matter(raw);
      const lines = content.replace(/\r\n/g, '\n').split('\n');

      let inFence = false;
      let fenceMarker = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
        if (fenceMatch) {
          const [, , ticks, info] = fenceMatch;
          if (!inFence) {
            inFence = true;
            fenceMarker = ticks;
            if (!info.trim()) {
              violations.push(`${relFile}:${i + 1} — Untagged fenced code block (Rule R7)`);
            }
          } else if (ticks.startsWith(fenceMarker[0]) && ticks.length >= fenceMarker.length && !info.trim()) {
            inFence = false;
            fenceMarker = '';
          }
          continue;
        }

        if (!inFence) {
          if (/^#\s+.+$/.test(line)) {
            violations.push(`${relFile}:${i + 1} — Duplicate H1 heading in markdown body`);
          }
          if (/^!!!\s+\w+/.test(line)) {
            violations.push(`${relFile}:${i + 1} — Unconverted MkDocs !!! admonition`);
          }
          if (/:(?:fontawesome|material|octicons)-[a-z0-9-]+:/i.test(line)) {
            violations.push(`${relFile}:${i + 1} — Unconverted MkDocs icon shortcode`);
          }
          if (/\{\s*\.md-button/.test(line)) {
            violations.push(`${relFile}:${i + 1} — Leftover {.md-button} attribute`);
          }
          if (/\[`[^`\]]+`\]\([^)]+\)/.test(line)) {
            violations.push(`${relFile}:${i + 1} — Backticked link anchor (Rule R6)`);
          }
        }
      }

      if (inFence) {
        violations.push(`${relFile} — Unclosed fenced code block at end of file`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('verifies that every internal link and image across all 203 docs resolves to an existing route or public asset', () => {
    const brokenLinks: string[] = [];

    for (const relFile of mdFiles) {
      const raw = fs.readFileSync(path.join(EN_DOCS_DIR, relFile), 'utf8');
      const { content } = matter(raw);
      // Strip fenced code blocks before extracting links
      const withoutCode = content.replace(/```[\s\S]*?```/g, '');

      const linkRegex = /!?\[([^\]]*)\]\(([^)]+)\)/g;
      let match: RegExpExecArray | null;
      while ((match = linkRegex.exec(withoutCode)) !== null) {
        const rawHref = match[2].trim();
        if (/^(https?:|mailto:|tel:|data:|#)/i.test(rawHref)) continue;

        const resolved = resolveMarkdownHref(rawHref, relFile, DEFAULT_LOCALE);
        const [pathname] = resolved.split('#');

        // Check if static asset in public/
        const ext = path.posix.extname(pathname).toLowerCase();
        if (ext) {
          const assetDiskPath = path.join(PUBLIC_DIR, pathname.replace(/^\/+/, ''));
          if (!fs.existsSync(assetDiskPath)) {
            brokenLinks.push(`${relFile} -> ${rawHref} (missing asset: ${pathname})`);
          }
        } else {
          if (!validLocalizedUrls.has(pathname)) {
            brokenLinks.push(`${relFile} -> ${rawHref} (resolved to unknown route: ${pathname})`);
          }
        }
      }
    }

    expect(brokenLinks).toEqual([]);
  });
});
