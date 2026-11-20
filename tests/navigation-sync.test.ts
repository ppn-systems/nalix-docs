import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  NAVIGATION_TREE,
  getAllNavFiles,
  getFlatNavigation,
  getNavContextForSlug,
  getPrevNextLinks,
} from '../src/config/navigation';
import { DEFAULT_LOCALE } from '../src/i18n';

const EN_DOCS_DIR = path.resolve(__dirname, `../src/content/docs/${DEFAULT_LOCALE}`);

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

describe('Navigation Tree & Content Synchronization (Rule R8)', () => {
  const diskFiles = walkMdFiles(EN_DOCS_DIR);
  const navFiles = getAllNavFiles(NAVIGATION_TREE);

  it('lists every documentation file of src/content/docs/en in the navigation tree exactly once', () => {
    expect(diskFiles.length).toBeGreaterThan(0);
    const listed = Array.from(navFiles);
    expect(listed.length).toBe(diskFiles.length);
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('ensures every file in NAVIGATION_TREE exists on disk', () => {
    const missingOnDisk: string[] = [];
    for (const file of navFiles) {
      if (!diskFiles.includes(file)) {
        missingOnDisk.push(file);
      }
    }
    expect(missingOnDisk, `Navigation references non-existent files: ${missingOnDisk.join(', ')}`).toEqual([]);
  });

  it('ensures every markdown file on disk is registered in NAVIGATION_TREE (no orphaned pages)', () => {
    const unlistedOnNav = diskFiles.filter((f) => !navFiles.has(f));
    expect(unlistedOnNav, `Markdown files missing from navigation.ts: ${unlistedOnNav.join(', ')}`).toEqual([]);
  });

  it('provides valid breadcrumbs and prev/next pagination across all pages', () => {
    const flat = getFlatNavigation();
    expect(flat.length).toBe(diskFiles.length);

    for (let i = 0; i < flat.length; i++) {
      const item = flat[i];
      const ctx = getNavContextForSlug(item.slug);
      expect(ctx.topSection).not.toBeNull();
      expect(ctx.breadcrumbs.length).toBeGreaterThan(0);

      const { prev, next } = getPrevNextLinks(item.slug);
      if (i === 0) expect(prev).toBeNull();
      else expect(prev).not.toBeNull();

      if (i === flat.length - 1) expect(next).toBeNull();
      else expect(next).not.toBeNull();
    }
  });
});
