// Turns "these Nalix files changed" into an actionable report: which changes alter the public API
// (docs must follow), which only change documented behavior (worth a look), and which are internal
// (ignored). Pure functions — no I/O — so the CI logic is unit-tested.
import { diffSurfaces, fileSurface, memberName } from './api-index.mjs';
import { layoutCSharp, normalizeXml } from './csharp.mjs';
import { unifiedDiff } from './line-diff.mjs';

const API_DIRS = ['src/', 'analyzers/'];
const isApiFile = (file) => file.endsWith('.cs') && API_DIRS.some((d) => file.startsWith(d));
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Source paths cited by docs (`src/...`, `samples/...`, `analyzers/...`) -> citing pages. */
export function collectCitations(docs) {
  const citations = new Map();
  for (const { file, text } of docs) {
    for (const m of text.matchAll(/`((?:src|samples|analyzers)\/[^`\s]+)`/g)) {
      const cited = m[1].replace(/[*].*$/, '').replace(/[.,;:)]+$/, '').replace(/\/+$/, '');
      // `src/Nalix.Network` names a whole package, not the files a page describes: too broad to act on.
      if (cited.split('/').length < (cited.startsWith('samples/') ? 2 : 3)) continue;
      if (!citations.has(cited)) citations.set(cited, new Set());
      citations.get(cited).add(file);
    }
  }
  return citations;
}

/** Pages that cite this file directly or through one of its parent folders. */
export function citedBy(file, citations) {
  const pages = new Set();
  for (const [cited, citing] of citations) {
    if (file === cited || file.startsWith(`${cited}/`)) citing.forEach((p) => pages.add(p));
  }
  return [...pages].sort();
}

const simpleName = (type) => type.split('.').pop();

/** `page:line — snippet` pointers for lines of `docs` that mention `name` on pages that mention `typeName`. */
export function docPointers(name, typeName, docs, limit = 5) {
  const nameRe = new RegExp(`\\b${escapeRe(name)}\\b`);
  const typeRe = new RegExp(`\\b${escapeRe(typeName)}\\b`);
  const hits = [];
  for (const { file, text } of docs) {
    if (!typeRe.test(text)) continue;
    const lines = text.split('\n');
    for (let i = 0; i < lines.length && hits.length < limit; i++) {
      if (nameRe.test(lines[i])) hits.push({ page: file, line: i + 1, snippet: lines[i].trim().slice(0, 110) });
    }
  }
  return hits;
}

function sourceLines(file, text) {
  return file.endsWith('.cs') ? layoutCSharp(text).text : normalizeXml(text).replace(/></g, '>\n<');
}

const NOISE = new Set(['this', 'base', 'null', 'true', 'false', 'void', 'return', 'using', 'namespace', 'public', 'private', 'protected', 'internal', 'static', 'readonly', 'sealed', 'class', 'struct', 'string', 'int', 'long', 'bool', 'byte', 'var', 'new', 'else', 'async', 'await', 'ushort', 'uint', 'ulong', 'default', 'throw', 'while', 'foreach', 'switch', 'case', 'break', 'continue', 'out', 'ref', 'in', 'is', 'not', 'and', 'nameof', 'typeof']);
const WORD = /[A-Za-z_][A-Za-z0-9_]{3,}/g;
const NUMBER = /\b\d[\d_]{2,}\b/g;

/** Number of files each word occurs in: words found in many files are too generic to prove relevance. */
function documentFrequency(entries) {
  const df = new Map();
  for (const text of entries.values()) for (const w of new Set(text.match(WORD) ?? [])) df.set(w, (df.get(w) ?? 0) + 1);
  return df;
}

/**
 * Words and numbers of a changed block that the citing pages also mention and that are specific
 * (rare in the codebase): evidence that the page may describe what changed.
 */
export function relevantTokens(changedLines, pageTexts, df, maxDf = 12) {
  const pageWords = new Set();
  const pageNumbers = new Set();
  for (const text of pageTexts) {
    (text.match(WORD) ?? []).forEach((w) => pageWords.add(w));
    (text.replace(/(\d)_(?=\d)/g, '$1').match(NUMBER) ?? []).forEach((n) => pageNumbers.add(n));
  }
  const hits = new Set();
  for (const line of changedLines) {
    for (const w of line.match(WORD) ?? []) {
      if (!NOISE.has(w) && pageWords.has(w) && (df.get(w) ?? 0) <= maxDf) hits.add(w);
    }
    for (const n of line.replace(/(\d)_(?=\d)/g, '$1').match(NUMBER) ?? []) if (pageNumbers.has(n)) hits.add(n);
  }
  return [...hits].sort();
}

/**
 * @param {{ changes: { added: string[], removed: string[], modified: string[] },
 *           oldEntries: Map<string,string> | null, newEntries: Map<string,string>,
 *           docs: { file: string, text: string }[] }} input
 * @returns {{ api: object[], reflected: object[], behavior: object[], internal: object[] }}
 */
export function classifyChanges({ changes, oldEntries, newEntries, docs }) {
  const citations = collectCitations(docs);
  const docsByFile = new Map(docs.map((d) => [d.file, d.text]));
  const blob = docs.map((d) => d.text).join('\n').replace(/\s+/g, '');
  const df = documentFrequency(newEntries);
  const report = { api: [], reflected: [], behavior: [], internal: [] };
  const all = [
    ...changes.modified.map((file) => ({ file, status: 'modified' })),
    ...changes.added.map((file) => ({ file, status: 'added' })),
    ...changes.removed.map((file) => ({ file, status: 'removed' })),
  ].sort((a, b) => a.file.localeCompare(b.file));

  for (const { file, status } of all) {
    const oldText = oldEntries?.get(file);
    const newText = newEntries.get(file);
    const cited = citedBy(file, citations);

    if (isApiFile(file)) {
      // Without the previous version we cannot prove a change is internal, so assume it is API.
      const before = oldEntries ? (oldText != null ? fileSurface(file, oldText) : []) : null;
      const after = newText != null ? fileSurface(file, newText) : [];
      const diff = before ? diffSurfaces(before, after) : { removed: [], added: after };
      if (diff.removed.length || diff.added.length) {
        const change = describeApiChange({ file, status, diff, cited, docs, blob, exact: before !== null });
        (change.entries.every((e) => e.ok) ? report.reflected : report.api).push(change);
        continue;
      }
    }

    if (cited.length && oldText != null && newText != null) {
      const d = unifiedDiff(sourceLines(file, oldText), sourceLines(file, newText), { context: 2, maxLines: 40 });
      const tokens = relevantTokens(d.changed, cited.map((p) => docsByFile.get(p) ?? ''), df);
      if (tokens.length) report.behavior.push({ file, status, pages: cited, tokens, added: d.added, removed: d.removed, text: d.text });
      else report.internal.push({ file, status });
    } else {
      report.internal.push({ file, status });
    }
  }
  return report;
}

const MODIFIER_PREFIX = /^(?:(?:public|protected|internal|static|virtual|override|abstract|sealed|readonly|extern|unsafe|new|partial|async|const|required)\s+)+/;

/** Does any page that mentions the type still mention a removed member (or the removed type itself)? */
function stillMentioned(entry, docs) {
  const typeName = simpleName(entry.type);
  if (entry.signature.startsWith('<')) return docs.some((d) => new RegExp(`\\b${escapeRe(typeName)}\\b`).test(d.text));
  return docPointers(memberName(entry.signature), typeName, docs, 1).length > 0;
}

/** Is this signature spelled out in the docs (whitespace-insensitive)? Declarations count when the type is mentioned. */
function signatureInDocs(entry, blob, docs) {
  if (entry.signature.startsWith('<')) return docs.some((d) => new RegExp(`\\b${escapeRe(simpleName(entry.type))}\\b`).test(d.text));
  const key = entry.signature.replace(MODIFIER_PREFIX, '').replace(/\s+/g, '');
  return key.length > 3 && blob.includes(key);
}

function describeApiChange({ file, status, diff, cited, docs, blob, exact }) {
  const byType = new Map();
  const push = (e, sign) => {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type).push({ sign, signature: e.signature });
  };
  diff.removed.forEach((e) => push(e, '-'));
  diff.added.forEach((e) => push(e, '+'));

  const removedTypes = diff.removed.filter((e) => e.signature.startsWith('<')).map((e) => e.type);
  const addedTypes = diff.added.filter((e) => e.signature.startsWith('<')).map((e) => e.type);
  const newTypes = addedTypes.filter((t) => !removedTypes.includes(t));
  const goneTypes = removedTypes.filter((t) => !addedTypes.includes(t));

  // An added signature is fine when the docs already show it; a removed one is fine when they no longer do.
  const entries = [
    ...diff.removed.map((e) => ({ sign: '-', type: e.type, signature: e.signature, ok: !stillMentioned(e, docs) })),
    ...diff.added.map((e) => ({ sign: '+', type: e.type, signature: e.signature, ok: signatureInDocs(e, blob, docs) })),
  ];

  const pointers = [];
  const pages = new Set(cited);
  for (const type of byType.keys()) {
    const typeName = simpleName(type);
    const names = new Set();
    for (const e of [...diff.removed, ...diff.added]) {
      if (e.type === type && !e.signature.startsWith('<')) names.add(memberName(e.signature));
    }
    if (names.size === 0) names.add(typeName);
    for (const name of names) {
      // Brand-new types have nothing to point at; everything else is looked up in the docs.
      if (newTypes.includes(type)) continue;
      for (const hit of docPointers(name, typeName, docs)) {
        pages.add(hit.page);
        if (!pointers.some((p) => p.page === hit.page && p.line === hit.line)) pointers.push({ ...hit, name });
      }
    }
  }
  return {
    file,
    status,
    exact,
    entries,
    changes: [...byType].map(([type, list]) => ({ type, entries: list.map((x) => ({ ...x, ok: entries.find((e) => e.type === type && e.sign === x.sign && e.signature === x.signature)?.ok })) })),
    newTypes: newTypes.map(simpleName),
    removedTypes: goneTypes.map(simpleName),
    pages: [...pages].sort(),
    pointers: pointers.sort((a, b) => a.page.localeCompare(b.page) || a.line - b.line),
  };
}

// ---------------------------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------------------------

const MAX_BODY = 58_000;

export function renderReport({ repo, from, to, report }) {
  const link = (file) => `[${file}](https://github.com/${repo}/blob/${to}/${file})`;
  const compare = from ? `https://github.com/${repo}/compare/${from}...${to}` : `https://github.com/${repo}/tree/${to}`;
  const head = [
    `Nalix \`${from ? from.slice(0, 7) : 'none'}\` → \`${to.slice(0, 7)}\` ([compare](${compare}))`,
    '',
    '| | Meaning | Files |',
    '| :-- | :-- | --: |',
    `| 🔴 | Public API changed and the docs do not show it yet | ${report.api.length} |`,
    `| 🟡 | Behavior changed in code the docs describe — review, may need no edit | ${report.behavior.length} |`,
    `| ✅ | Public API changed but the docs already match — nothing to do | ${report.reflected.length} |`,
    `| ⚪ | Internal, or not something the docs mention — ignored | ${report.internal.length} |`,
    '',
  ];

  const sections = [];
  if (report.api.length) {
    sections.push('## 🔴 API changes — update the docs', '');
    for (const c of report.api) {
      sections.push(`### ${link(c.file)} (${c.status}${c.exact ? '' : ', previous version unavailable'})`, '');
      if (c.newTypes.length) sections.push(`New public type(s): ${c.newTypes.map((t) => `\`${t}\``).join(', ')} — **no page documents them yet.**`, '');
      if (c.removedTypes.length) sections.push(`Removed public type(s): ${c.removedTypes.map((t) => `\`${t}\``).join(', ')}.`, '');
      sections.push('```diff');
      for (const { type, entries } of c.changes) {
        sections.push(type);
        entries.forEach((e) => sections.push(`${e.sign} ${e.signature}${e.ok ? '   // ✅ docs already match' : ''}`));
      }
      sections.push('```', '');
      if (c.pointers.length) {
        sections.push('Docs lines that mention the changed members:', '');
        c.pointers.slice(0, 12).forEach((p) => sections.push(`- \`${p.page}:${p.line}\` — \`${p.snippet.replace(/`/g, "'")}\``));
        if (c.pointers.length > 12) sections.push(`- … ${c.pointers.length - 12} more`);
        sections.push('');
      }
      for (const page of c.pages) sections.push(`- [ ] \`src/content/docs/en-us/${page}\``);
      sections.push('');
    }
  }
  if (report.behavior.length) {
    sections.push('## 🟡 Behavior changes in documented files — review', '');
    for (const c of report.behavior) {
      sections.push(`### ${link(c.file)} (${c.status}, +${c.added} −${c.removed})`, '');
      if (c.text) sections.push('```diff', c.text, '```', '');
      sections.push(`Cited by: ${c.pages.map((p) => `\`${p}\``).join(', ')}`);
      sections.push(`The changed lines mention: ${c.tokens.slice(0, 12).map((t) => `\`${t}\``).join(', ')}`, '');
    }
  }
  if (report.reflected.length) {
    sections.push(`<details><summary>✅ ${report.reflected.length} API change(s) already reflected in the docs</summary>`, '');
    report.reflected.forEach((c) => sections.push(`- ${link(c.file)} (${c.status}, ${c.entries.length} signature(s))`));
    sections.push('', '</details>', '');
  }
  if (report.internal.length) {
    sections.push(`<details><summary>⚪ ${report.internal.length} internal change(s) ignored</summary>`, '');
    report.internal.forEach((c) => sections.push(`- \`${c.file}\` (${c.status})`));
    sections.push('', '</details>', '');
  }

  return [...head, ...sections].join('\n');
}

/** Cuts a report to `max` characters (PR bodies are capped at 65,536) without leaving a code fence open. */
export function truncateReport(body, max = MAX_BODY) {
  if (body.length <= max) return body;
  let cut = body.slice(0, max);
  if ((cut.match(/```/g) ?? []).length % 2 === 1) cut += '\n```';
  return `${cut}\n\n…_Report truncated; the full report is in the workflow run summary and the \`source-sync-report\` artifact._\n`;
}
