import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { DEFAULT_LOCALE } from '../src/i18n';

const EN_DOCS_DIR = path.resolve(__dirname, `../src/content/docs/${DEFAULT_LOCALE}`);
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const PAGES_DIR = path.resolve(__dirname, '../src/pages');

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

describe('Ground-Truth Source-Code Parity & Adversarial Audit Gates', () => {
  const mdFiles = walkMdFiles(EN_DOCS_DIR);

  it('ensures zero leaked Audit Summary headings, zero mojibake, and zero backticked link labels (R19) across all 203 docs', () => {
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
          } else if (ticks.startsWith(fenceMarker[0]) && ticks.length >= fenceMarker.length && !info.trim()) {
            inFence = false;
            fenceMarker = '';
          }
          continue;
        }

        if (!inFence) {
          if (/^##+\s*(Audit Summary|Missing Content Identified|Improvement Rationale)/i.test(line)) {
            violations.push(`${relFile}:${i + 1} — Leaked audit heading: ${line}`);
          }
          if (/\[[^\]]*`[^`\]]+`[^\]]*\]\([^)]+\)/.test(line)) {
            violations.push(`${relFile}:${i + 1} — Backticks inside markdown link label (R19): ${line}`);
          }
        }

        if (/ðŸ|â€”|â€“|â†’/.test(line)) {
          violations.push(`${relFile}:${i + 1} — UTF-8 mojibake sequence detected: ${line}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('verifies that deleted C# options and obsolete Listen* builder calls do not appear in active documentation examples', () => {
    const violations: string[] = [];
    const deletedOptionPattern = /\b(MaxGroupConcurrency|TotalBuffers|BufferAllocations)\b/;

    for (const relFile of mdFiles) {
      const raw = fs.readFileSync(path.join(EN_DOCS_DIR, relFile), 'utf8');
      const lines = raw.replace(/\r\n/g, '\n').split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const optMatch = line.match(deletedOptionPattern);
        if (optMatch && !/removed|no longer|earlier versions|does not exist|replaced|deleted/i.test(line)) {
          violations.push(`${relFile}:${i + 1} — References deleted C# property '${optMatch[1]}'`);
        }

        if (/\.Listen(Tcp|Udp|WebSocket)</.test(line) && !/Obsolete|marked|Use Map/i.test(line)) {
          violations.push(`${relFile}:${i + 1} — Uses obsolete .Listen*<TProtocol>() instead of .Map*<TProtocol>(): ${line.trim()}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('verifies website SEO & AI discoverability endpoints (robots.txt, sitemap.xml.ts, llms.txt.ts)', () => {
    expect(fs.existsSync(path.join(PUBLIC_DIR, 'robots.txt'))).toBe(true);
    expect(fs.existsSync(path.join(PAGES_DIR, 'sitemap.xml.ts'))).toBe(true);
    expect(fs.existsSync(path.join(PAGES_DIR, 'llms.txt.ts'))).toBe(true);

    const robots = fs.readFileSync(path.join(PUBLIC_DIR, 'robots.txt'), 'utf8');
    expect(robots).toContain('Sitemap:');
    expect(robots).toContain('llms.txt');
  });
});
