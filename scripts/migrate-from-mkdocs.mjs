import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const SOURCE_ROOT = 'E:/Cs/nalix';
const SOURCE_DOCS = path.join(SOURCE_ROOT, 'docs');
const SOURCE_MKDOCS = path.join(SOURCE_ROOT, 'mkdocs.yml');

const TARGET_ROOT = 'E:/Cs/nalix-docs';
const TARGET_EN_DOCS = path.join(TARGET_ROOT, 'src/content/docs/en-us');
const TARGET_NAV_FILE = path.join(TARGET_ROOT, 'src/config/navigation.ts');

/**
 * Converts a relative markdown path like `guides/index.md` or `index.md` or `quickstart.md`
 * to a canonical URL slug (`guides`, ``, `quickstart`).
 */
function mdPathToSlug(mdPath) {
  const normalized = mdPath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.md$/i, '');
  if (normalized === 'index') return '';
  if (normalized.endsWith('/index')) {
    return normalized.slice(0, -'/index'.length);
  }
  return normalized;
}

/**
 * Normalizes page titles and navigation labels to a clean, consistent Enterprise standard.
 */
function normalizeEnterpriseTitle(rawTitle) {
  let t = String(rawTitle || '')
    .replace(/^\uFEFF/, '')
    .replace(/`/g, '')
    .replace(/:[a-z0-9]+-[a-z0-9-]+:\s*/gi, '')
    .trim();

  const exactMap = {
    'Auto Generation': 'Source Generators',
    'Auto Generation (Source Generators)': 'Source Generators',
    'NALIX Diagnostic Codes': 'Diagnostic Codes',
    'Diagnostic Codes (NALIX001–032)': 'Diagnostic Codes',
    'FrameTransformer Summary': 'FrameTransformer',
    'Snowflake ID Tutorial': 'Snowflake IDs',
    'Networking (Low-Level Transport)': 'Networking',
    'Client (High-Level Session Layer)': 'Client SDK',
    'Server & Hosting (Application Setup)': 'Server & Hosting',
    'ProtocolType & Transport Layer (C#)': 'ProtocolType & Transport Layer',
    'TCP Listener & Session (Low-Level)': 'TCP Listener & Session',
  };

  if (exactMap[t]) {
    return exactMap[t];
  }

  // Normalize Analyzer rule labels: "NALIX014 —Return Type" -> "NALIX014: Return Type"
  const nalixRuleMatch = t.match(/^NALIX(\d+)(?:-(\d+))?\s*[—–-]\s*(.+)$/);
  if (nalixRuleMatch) {
    const [, start, end, rest] = nalixRuleMatch;
    const range = end ? `${start}–${end}` : start;
    return `NALIX${range}: ${rest.trim()}`;
  }

  // Strip noisy trailing parenthetical qualifiers
  t = t
    .replace(/\s+\(Low-Level Transport\)$/i, '')
    .replace(/\s+\(High-Level Session Layer\)$/i, '')
    .replace(/\s+\(Application Setup\)$/i, '')
    .replace(/\s+\(Low-Level\)$/i, '')
    .replace(/\s+\(SDK\)$/i, '')
    .replace(/\s+\(C#\)$/i, '');

  return t.trim();
}

function cleanInlineSyntax(text) {
  return text
    .replace(/:[a-z0-9]+-[a-z0-9-]+:\s*/gi, '')
    .replace(/\s*\{\s*\.md-button(?:\s+\.md-button--primary)?\s*\}/g, '')
    .replace(/\[`([^`\]]+)`\]\(([^)]+)\)/g, '[$1]($2)')
    .replace(/\s+->\s+\[/g, ' — [');
}

/**
 * Converts MkDocs `!!! type "Optional Title"` + 4-space indented lines into `:::type[Optional Title]` blocks.
 * Only operates outside of fenced code blocks.
 */
function convertAdmonitionsAndCleanSyntax(rawMarkdown, relPath) {
  const fixedRaw = rawMarkdown
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    // Fix missing opening ```ini fence before [ObjectPool] in object-pooling.md
    .replace(/### Configuration Example\n\n\[ObjectPool\]/g, '### Configuration Example\n\n```ini\n[ObjectPool]');
  const lines = fixedRaw.split('\n');
  const out = [];
  let inFence = false;
  let fenceMarker = '';

  const typeMap = {
    note: 'note',
    info: 'note',
    tip: 'tip',
    success: 'tip',
    warning: 'warning',
    caution: 'warning',
    danger: 'danger',
    critical: 'danger',
    important: 'important',
    essential: 'important',
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check fence toggle
    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const [, indent, ticks, info] = fenceMatch;
      if (!inFence) {
        inFence = true;
        fenceMarker = ticks;
        // Rule R7: If opening code fence has no language specifier, default to 'text'
        if (!info.trim()) {
          out.push(`${indent}${ticks}text`);
          i++;
          continue;
        }
      } else if (ticks.startsWith(fenceMarker[0]) && ticks.length >= fenceMarker.length && !info.trim()) {
        inFence = false;
        fenceMarker = '';
      }
      out.push(line);
      i++;
      continue;
    }

    if (!inFence) {
      // Check MkDocs admonition: !!! type "Title" or !!! type
      const admMatch = line.match(/^!!!\s+(\w+)(?:\s+"([^"]*)")?\s*$/);
      if (admMatch) {
        const rawType = admMatch[1].toLowerCase();
        const mappedType = typeMap[rawType] || 'note';
        const customTitle = admMatch[2] ? cleanInlineSyntax(admMatch[2].trim()) : '';

        i++;
        const bodyLines = [];
        while (i < lines.length) {
          const nextLine = lines[i];
          if (nextLine.trim() === '') {
            // Check if following non-empty line is still indented by at least 4 spaces
            let lookahead = i + 1;
            while (lookahead < lines.length && lines[lookahead].trim() === '') {
              lookahead++;
            }
            if (lookahead < lines.length && /^( {4}|\t)/.test(lines[lookahead])) {
              bodyLines.push('');
              i++;
              continue;
            } else {
              break;
            }
          }
          if (/^( {4}|\t)/.test(nextLine)) {
            const unindented = cleanInlineSyntax(nextLine.replace(/^( {4}|\t)/, ''));
            bodyLines.push(unindented);
            i++;
          } else {
            break;
          }
        }

        const header = customTitle ? `:::${mappedType}[${customTitle}]` : `:::${mappedType}`;
        out.push(header);
        out.push(...bodyLines);
        out.push(':::');
        continue;
      }

      // Clean MkDocs shortcodes, `{ .md-button ... }` attributes, and backticked link labels (Rule R6)
      const cleanedLine = cleanInlineSyntax(line);

      out.push(cleanedLine);
      i++;
      continue;
    }

    out.push(line);
    i++;
  }

  return out.join('\n');
}

/**
 * Extracts H1 title, first paragraph description, and removes the leading H1 from body.
 */
function extractMetadataAndBody(markdown, relPath) {
  const lines = markdown.split('\n');
  let title = '';
  let h1LineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+)$/);
    if (m) {
      title = normalizeEnterpriseTitle(m[1]);
      h1LineIndex = i;
      break;
    }
  }

  if (!title) {
    title = normalizeEnterpriseTitle(path.basename(relPath, '.md'));
  }

  const bodyLines = h1LineIndex >= 0 ? lines.slice(h1LineIndex + 1) : lines;
  // Trim leading blank lines
  while (bodyLines.length > 0 && bodyLines[0].trim() === '') {
    bodyLines.shift();
  }

  // Find first prose paragraph for description
  let description = '';
  let inFence = false;
  let inDirective = false;
  const paraLines = [];

  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (/^(`{3,}|~{3,})/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (trimmed.startsWith(':::')) {
      inDirective = !inDirective;
      continue;
    }
    if (inDirective) continue;

    if (
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('<') ||
      trimmed.startsWith('|') ||
      trimmed.startsWith('-') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('>') ||
      trimmed.startsWith('![')
    ) {
      if (paraLines.length > 0) break;
      continue;
    }

    paraLines.push(trimmed);
  }

  if (paraLines.length > 0) {
    description = paraLines
      .join(' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[`*_~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (description.length > 180) {
      description = description.slice(0, 177).trimEnd() + '...';
    }
  } else {
    description = `${title} — Nalix .NET 10 documentation.`;
  }

  // Infer section and package metadata
  const normRel = relPath.replace(/\\/g, '/');
  let section = 'Overview';
  if (normRel === 'quickstart.md' || normRel === 'installation.md' || normRel.startsWith('guides/getting-started/your-first-server')) {
    section = 'Start Here';
  } else if (normRel.startsWith('guides/')) {
    section = 'Guides';
  } else if (normRel.startsWith('concepts/')) {
    section = 'Concepts';
  } else if (normRel.startsWith('packages/')) {
    section = 'Packages';
  } else if (normRel.startsWith('api/')) {
    section = 'API Reference';
  } else if (normRel.startsWith('benchmarks/')) {
    section = 'Benchmarks';
  }

  let pkg = undefined;
  const pkgMap = {
    abstractions: 'Nalix.Abstractions',
    analyzers: 'Nalix.Analyzers',
    codec: 'Nalix.Codec',
    environment: 'Nalix.Environment',
    framework: 'Nalix.Framework',
    hosting: 'Nalix.Hosting',
    network: 'Nalix.Network',
    runtime: 'Nalix.Runtime',
    sdk: 'Nalix.SDK',
    security: 'Nalix.Codec / Nalix.Network',
    options: 'Nalix.Network / Nalix.Runtime',
  };
  if (normRel.startsWith('api/')) {
    const seg = normRel.split('/')[1];
    if (pkgMap[seg]) pkg = pkgMap[seg];
  } else if (normRel.startsWith('packages/nalix-')) {
    const seg = path.basename(normRel, '.md').replace('nalix-', '');
    if (pkgMap[seg]) pkg = pkgMap[seg];
  }

  return {
    title,
    description,
    section,
    pkg,
    body: bodyLines.join('\n').trim() + '\n',
  };
}

/**
 * Recursively walks directory to list all .md files
 */
function walkMarkdownFiles(dir, baseDir = dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMarkdownFiles(full, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(path.relative(baseDir, full).replace(/\\/g, '/'));
    }
  }
  return results.sort();
}

/**
 * Parses mkdocs.yml nav block
 */
function parseMkdocsNav() {
  const raw = fs.readFileSync(SOURCE_MKDOCS, 'utf8');
  // Strip !!python/name:... tags so js-yaml can parse cleanly
  const sanitized = raw.replace(/!!python\/name:[^\s\n]+/g, '"python_ref"');
  const parsed = yaml.load(sanitized);
  return parsed.nav;
}

const TOP_SECTION_VI_MAP = {
  'Overview': 'Tổng quan',
  'Start Here': 'Bắt đầu',
  'Guides': 'Hướng dẫn',
  'Concepts': 'Khái niệm',
  'Packages': 'Gói thư viện',
  'API': 'Tài liệu API',
  'Benchmarks': 'Hiệu năng',
};

function transformNavNode(node) {
  if (typeof node === 'string') {
    return {
      title: normalizeEnterpriseTitle(path.basename(node, '.md')),
      slug: mdPathToSlug(node),
      file: node,
    };
  }
  const rawKey = Object.keys(node)[0];
  const key = normalizeEnterpriseTitle(rawKey);
  const val = node[rawKey];
  if (typeof val === 'string') {
    return {
      title: key,
      titleVi: TOP_SECTION_VI_MAP[rawKey] || TOP_SECTION_VI_MAP[key] || undefined,
      slug: mdPathToSlug(val),
      file: val,
    };
  }
  if (Array.isArray(val)) {
    return {
      title: key,
      titleVi: TOP_SECTION_VI_MAP[rawKey] || TOP_SECTION_VI_MAP[key] || undefined,
      items: val.map(transformNavNode),
    };
  }
  throw new Error(`Unexpected nav node: ${JSON.stringify(node)}`);
}

// Run migration
const mdFiles = walkMarkdownFiles(SOURCE_DOCS);
console.log(`Found ${mdFiles.length} markdown files to migrate.`);

for (const relPath of mdFiles) {
  const srcFull = path.join(SOURCE_DOCS, relPath);
  const rawContent = fs.readFileSync(srcFull, 'utf8');
  const cleaned = convertAdmonitionsAndCleanSyntax(rawContent, relPath);
  const { title, description, section, pkg, body } = extractMetadataAndBody(cleaned, relPath);

  const frontmatterObj = {
    title,
    description,
    section,
    ...(pkg ? { package: pkg } : {}),
  };

  const fmYaml = yaml.dump(frontmatterObj, { lineWidth: -1, quotingType: '"' }).trim();
  const finalMd = `---\n${fmYaml}\n---\n\n${body}`;

  const destFull = path.join(TARGET_EN_DOCS, relPath);
  fs.mkdirSync(path.dirname(destFull), { recursive: true });
  fs.writeFileSync(destFull, finalMd, 'utf8');
}

const rawNav = parseMkdocsNav();
const navTree = rawNav.map(transformNavNode);

const navTsContent = `// Auto-generated and synchronized with Nalix documentation structure (Rule R8)
import type { LocaleCode } from '../i18n/config';
import { localizePath } from '../i18n';

export interface NavItem {
  title: string;
  titleVi?: string;
  /** Canonical doc slug (empty string '' for root index) */
  slug?: string;
  /** Source markdown file path relative to locale folder */
  file?: string;
  items?: NavItem[];
}

export const NAVIGATION_TREE: NavItem[] = ${JSON.stringify(navTree, null, 2)};

export interface FlatNavLink {
  title: string;
  slug: string;
  file: string;
  section: string;
  breadcrumbs: string[];
}

/**
 * Returns localized title for a NavItem
 */
export function getNavTitle(item: NavItem, locale: LocaleCode): string {
  if (locale === 'vi-vn' && item.titleVi) {
    return item.titleVi;
  }
  return item.title;
}

/**
 * Flattens all leaf links in the navigation tree in reading order (deduplicating repeated links).
 */
export function getFlatNavigation(tree: NavItem[] = NAVIGATION_TREE): FlatNavLink[] {
  const result: FlatNavLink[] = [];
  const seenSlugs = new Set<string>();

  function walk(items: NavItem[], topSection: string, trail: string[]) {
    for (const item of items) {
      const currentTop = topSection || item.title;
      const nextTrail = [...trail, item.title];
      if (typeof item.slug === 'string' && item.file) {
        if (!seenSlugs.has(item.slug)) {
          seenSlugs.add(item.slug);
          result.push({
            title: item.title,
            slug: item.slug,
            file: item.file,
            section: currentTop,
            breadcrumbs: nextTrail,
          });
        }
      }
      if (item.items && item.items.length > 0) {
        walk(item.items, currentTop, nextTrail);
      }
    }
  }

  walk(tree, '', []);
  return result;
}

/**
 * Returns all referenced markdown files in the navigation tree (including duplicates if any).
 */
export function getAllNavFiles(tree: NavItem[] = NAVIGATION_TREE): Set<string> {
  const files = new Set<string>();
  function walk(items: NavItem[]) {
    for (const item of items) {
      if (item.file) files.add(item.file);
      if (item.items) walk(item.items);
    }
  }
  walk(tree);
  return files;
}

/**
 * Finds Previous and Next links for a given canonical slug.
 */
export function getPrevNextLinks(slug: string): { prev: FlatNavLink | null; next: FlatNavLink | null } {
  const flat = getFlatNavigation();
  const idx = flat.findIndex((item) => item.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}

/**
 * Finds the top-level navigation section and breadcrumb trail for a given slug.
 */
export function getNavContextForSlug(slug: string): {
  topSection: NavItem | null;
  breadcrumbs: string[];
} {
  for (const top of NAVIGATION_TREE) {
    if (top.slug === slug) {
      return { topSection: top, breadcrumbs: [top.title] };
    }
    if (top.items) {
      const found = findInSubtree(top.items, slug, [top.title]);
      if (found) {
        return { topSection: top, breadcrumbs: found };
      }
    }
  }
  return { topSection: NAVIGATION_TREE[0] ?? null, breadcrumbs: [] };
}

function findInSubtree(items: NavItem[], targetSlug: string, trail: string[]): string[] | null {
  for (const item of items) {
    const nextTrail = [...trail, item.title];
    if (item.slug === targetSlug) {
      return nextTrail;
    }
    if (item.items) {
      const res = findInSubtree(item.items, targetSlug, nextTrail);
      if (res) return res;
    }
  }
  return null;
}

/**
 * Top-level header tabs for quick jumping across major documentation pillars.
 */
export function getTopLevelTabs(locale: LocaleCode) {
  const isVi = locale === 'vi-vn';
  return [
    { title: isVi ? 'Bắt đầu' : 'Get Started', sectionTitle: 'Start Here', href: localizePath('quickstart', locale) },
    { title: isVi ? 'Hướng dẫn' : 'Guides', sectionTitle: 'Guides', href: localizePath('guides', locale) },
    { title: isVi ? 'Khái niệm' : 'Concepts', sectionTitle: 'Concepts', href: localizePath('concepts', locale) },
    { title: isVi ? 'Gói thư viện' : 'Packages', sectionTitle: 'Packages', href: localizePath('packages', locale) },
    { title: isVi ? 'Tài liệu API' : 'API Reference', sectionTitle: 'API', href: localizePath('api', locale) },
    { title: isVi ? 'Hiệu năng' : 'Benchmarks', sectionTitle: 'Benchmarks', href: localizePath('benchmarks', locale) },
  ];
}
`;

fs.mkdirSync(path.dirname(TARGET_NAV_FILE), { recursive: true });
fs.writeFileSync(TARGET_NAV_FILE, navTsContent, 'utf8');
console.log('Successfully generated src/config/navigation.ts and migrated all 203 markdown files.');
