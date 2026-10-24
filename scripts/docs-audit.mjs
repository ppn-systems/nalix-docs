// Compares the documentation with the public API of the Nalix source (source-api-index.json) and
// reports what is wrong or missing. Pure functions over `{ index, docs }`, so it runs offline in
// tests and in CI; `node scripts/docs-audit.mjs` is the CLI.
//
// Severity: `error` = the docs state something the source contradicts; `warn` = likely stale;
// `gap` = public API the docs never mention.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = path.join(ROOT, 'src/content/docs/en-us');

const OBJECT_MEMBERS = new Set(['ToString', 'Equals', 'GetHashCode', 'GetType', 'Dispose', 'Finalize', 'CompareTo', 'MemberwiseClone', 'ReferenceEquals', 'Empty', 'Length', 'Count', 'Default', 'Zero', 'Max', 'Min', 'Value', 'Values', 'Key', 'Keys', 'Item', 'Current', 'Create', 'Clear', 'Add', 'Remove', 'Close']);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').toLowerCase();

// ---------------------------------------------------------------------------------------------
// Docs parsing
// ---------------------------------------------------------------------------------------------

/** Splits a page into lines tagged as prose or code, with 1-based line numbers of the original file. */
export function parsePage({ file, text }) {
  const raw = text.replace(/\r\n/g, '\n').split('\n');
  let start = 0;
  if (raw[0] === '---') {
    const end = raw.indexOf('---', 1);
    if (end > 0) start = end + 1;
  }
  const lines = [];
  let fence = null;
  for (let i = start; i < raw.length; i++) {
    const m = raw[i].match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (m) {
      if (!fence) fence = { marker: m[1][0], size: m[1].length, lang: m[2].trim() };
      else if (m[1][0] === fence.marker && m[1].length >= fence.size && !m[2].trim()) fence = null;
      lines.push({ n: i + 1, text: raw[i], code: true, fence: true });
      continue;
    }
    lines.push({ n: i + 1, text: raw[i], code: Boolean(fence), lang: fence?.lang });
  }
  return { file, lines };
}

/** Markdown tables as `{ header, rows: [{ n, cells }] }`; `cells` are raw trimmed strings. */
export function parseTables(page) {
  const tables = [];
  let current = null;
  const split = (line) => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim());
  for (const line of page.lines) {
    const isRow = !line.code && /^\s*\|.*\|\s*$/.test(line.text);
    if (!isRow) {
      current = null;
      continue;
    }
    const cells = split(line.text);
    if (!current) current = { header: cells, rows: [], separator: false, heading: null };
    else if (!current.separator && cells.every((c) => /^:?-{2,}:?$/.test(c))) current.separator = true;
    else {
      if (!current.rows.length) tables.push(current);
      current.rows.push({ n: line.n, cells });
    }
  }
  return tables;
}

const codeSpans = (text) => [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
const firstIdentifier = (cell) => cell.match(/^`([A-Za-z_]\w*)(?:\(\))?`$/)?.[1] ?? null;

// ---------------------------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------------------------

const UNIT_SECONDS = { ms: 0.001, millisecond: 0.001, milliseconds: 0.001, s: 1, sec: 1, second: 1, seconds: 1, m: 60, min: 60, minute: 60, minutes: 60, h: 3600, hour: 3600, hours: 3600, d: 86400, day: 86400, days: 86400 };
const num = (s) => Number(s.replace(/[_,]/g, ''));

/** Source initializer -> `{ kind, value }` when it is a plain literal we can compare, else null. */
export function parseSourceDefault(raw) {
  if (raw == null) return null;
  const v = raw.trim().replace(/^\((?:int|long|uint|ulong|ushort|byte|double|float)\)/, '');
  if (/^(true|false)$/.test(v)) return { kind: 'bool', value: v === 'true' };
  if (/^-?\d[\d_]*(?:\.\d+)?[uUlLfFdDmM]*$/.test(v)) return { kind: 'number', value: num(v.replace(/[uUlLfFdDmM]+$/, '')) };
  if (/^0[xX][0-9a-fA-F_]+/.test(v)) return { kind: 'number', value: parseInt(v.replace(/_/g, ''), 16) };
  if (/^"(?:[^"\\]|\\.)*"$/.test(v)) return { kind: 'string', value: v.slice(1, -1) };
  let m = v.match(/^(?:System\.)?TimeSpan\.From(Milliseconds|Seconds|Minutes|Hours|Days)\(\s*(-?[\d_.]+)\s*\)$/);
  if (m) return { kind: 'time', value: num(m[2]) * UNIT_SECONDS[m[1].toLowerCase()] };
  if (/^(?:System\.)?TimeSpan\.Zero$/.test(v)) return { kind: 'time', value: 0 };
  m = v.match(/^(?:System\.)?TimeSpan\.FromTicks\(\s*(\d+)\s*\)$/);
  if (m) return { kind: 'time', value: Number(m[1]) / 1e7 };
  return null;
}

/** All values a docs default cell could mean, for the given kind. */
export function docDefaultValues(cell, kind) {
  const text = cell.replace(/`/g, '').replace(/\$\\rightarrow\$/g, ' ');
  const out = [];
  if (kind === 'bool') {
    for (const m of text.matchAll(/\b(true|false)\b/gi)) out.push(m[1].toLowerCase() === 'true');
  } else if (kind === 'number') {
    for (const m of text.matchAll(/(?<![\w.:])-?\d[\d_,]*(?:\.\d+)?(?![\w:])/g)) out.push(num(m[0]));
  } else if (kind === 'time') {
    for (const m of text.matchAll(/(?:(\d+)\.)?(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?/g)) {
      out.push(Number(m[1] ?? 0) * 86400 + Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4]) + (m[5] ? Number(`0.${m[5]}`) : 0));
    }
    for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(ms|milliseconds?|seconds?|sec|minutes?|min|hours?|days?|[smhd])\b/gi)) {
      out.push(Number(m[1]) * UNIT_SECONDS[m[2].toLowerCase()]);
    }
    if (/\b(zero|none|disabled)\b/i.test(text)) out.push(0);
  } else if (kind === 'string') {
    out.push(text.replace(/^"|"$/g, '').trim());
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------------------------

export function auditDocs({ index, docs }) {
  const findings = [];
  const add = (code, severity, page, line, message, key = '') => findings.push({ code, severity, page, line, message, key: `${code}|${page}|${key || message}` });

  const pages = docs.map(parsePage);
  const typeNames = new Set(index.types.map((t) => t.name));
  const namespaces = new Set([...(index.namespaces ?? []), ...index.types.map((t) => t.namespace)]);
  const identifiers = new Set(index.identifiers);
  const files = new Set(index.files);
  const dirs = new Set();
  for (const f of index.files) for (let i = f.indexOf('/'); i > 0; i = f.indexOf('/', i + 1)) dirs.add(f.slice(0, i));
  const typesByName = new Map();
  for (const t of index.types) typesByName.set(t.name, [...(typesByName.get(t.name) ?? []), t]);

  for (const page of pages) {
    const prose = page.lines.filter((l) => !l.code);
    const pageText = prose.map((l) => l.text).join('\n');

    // A001: cited source paths must exist.
    for (const l of prose) {
      for (const span of codeSpans(l.text)) {
        const m = span.match(/^((?:src|samples|analyzers)\/[^\s*]+?)\/?$/);
        if (!m) continue;
        const p = m[1].replace(/[.,;:)]+$/, '');
        if (/^analyzers\/dotnet\//.test(p)) continue; // path inside the NuGet package, not the repo
        if (!files.has(p) && !dirs.has(p)) add('A001', 'error', page.file, l.n, `Source path does not exist: \`${p}\``, p);
      }
    }

    // A002: **Namespace:** / **Assembly:** headers.
    const nsLine = prose.find((l) => /^\*\*Namespace:\*\*/.test(l.text));
    if (nsLine) {
      const ns = nsLine.text.match(/`([^`]+)`/)?.[1];
      const asm = prose.find((l) => /^\*\*Assembly:\*\*/.test(l.text))?.text.match(/`([^`]+)`/)?.[1];
      if (ns && !namespaces.has(ns)) add('A002', 'error', page.file, nsLine.n, `Namespace \`${ns}\` has no public type in the source`, ns);
      // Only a page dedicated to one type (file name == type name) can contradict its namespace/assembly.
      const base = path.basename(page.file, '.md');
      const named = (t) => kebab(t.name) === base && (pageText.match(new RegExp(`\`${escapeRe(t.name)}\``, 'g')) ?? []).length >= 2;
      const decls = [...index.types, ...(index.internalTypes ?? [])].filter(named);
      if (ns && decls.length && !decls.some((d) => d.namespace === ns)) {
        add('A002', 'error', page.file, nsLine.n, `\`${decls[0].name}\` is declared in ${[...new Set(decls.map((d) => d.namespace))].map((n) => `\`${n}\``).join(', ')}, not \`${ns}\``, `${decls[0].name}:${ns}`);
      }
      if (asm && decls.length && !decls.some((d) => d.file.split('/')[1] === asm)) {
        add('A002', 'error', page.file, nsLine.n, `\`${decls[0].name}\` lives in assembly ${[...new Set(decls.map((d) => d.file.split('/')[1]))].map((n) => `\`${n}\``).join(', ')}, not \`${asm}\``, `${decls[0].name}:${asm}`);
      }
    }

    // A003/A004: options tables against the Options classes mentioned on the page.
    const mentioned = [...new Set(codeSpans(pageText).map((s) => s.match(/^([A-Za-z_]\w*)/)?.[1]).filter((n) => n && index.options[n]))];
    if (mentioned.length) {
      const dedicated = mentioned.find((n) => kebab(n) === path.basename(page.file, '.md'));
      const props = new Map();
      mentioned.forEach((n) => index.options[n].properties.forEach((p) => props.set(p.name, { ...p, owner: n })));
      const seen = new Set();
      for (const table of parseTables(page)) {
        const first = table.header[0]?.replace(/`/g, '').toLowerCase();
        if (!['property', 'option', 'name', 'setting', 'key', 'parameter'].includes(first)) continue;

        // The table describes the nearest type named above it; skip it when that is not an options class
        // (e.g. attribute properties that merely share names with option properties).
        const startAt = page.lines.findIndex((l) => l.n === table.rows[0].n);
        let owner = null;
        for (let i = startAt - 1; i >= Math.max(0, startAt - 40) && !owner; i--) {
          const names = page.lines[i].text.match(/\b[A-Z][A-Za-z0-9]{3,}\b/g) ?? [];
          owner = [...names].reverse().find((n) => typesByName.has(n) || index.options[n]) ?? null;
        }
        if (dedicated) owner = null; // a page about one options class: every table is about it
        if (owner && !index.options[owner]) continue;
        const scope = owner && props.size && [...props.values()].some((p) => p.owner === owner) ? new Map([...props].filter(([, p]) => p.owner === owner)) : props;

        const defaultCol = table.header.findIndex((h) => /default/i.test(h));
        for (const row of table.rows) {
          const name = firstIdentifier(row.cells[0] ?? '');
          if (!name) continue;
          if (scope.has(name)) {
            seen.add(name);
            const prop = scope.get(name);
            const src = parseSourceDefault(prop.default);
            if (src && defaultCol >= 0 && row.cells[defaultCol] !== undefined) {
              const values = docDefaultValues(row.cells[defaultCol], src.kind);
              if (values.length && !values.some((v) => v === src.value || (typeof v === 'number' && Math.abs(v - src.value) < 1e-9))) {
                add('A004', 'error', page.file, row.n, `\`${prop.owner}.${name}\` default is \`${prop.default}\` in the source but the docs say ${row.cells[defaultCol]}`, `${name}`);
              }
            }
          } else if (!identifiers.has(name)) {
            add('A003', 'error', page.file, row.n, `\`${name}\` is documented as an option but does not exist in ${[...new Set([...scope.values()].map((p) => p.owner))].map((n) => `\`${n}\``).join(', ')}`, name);
          }
        }
      }
      if (dedicated && seen.size) {
        for (const p of index.options[dedicated].properties) {
          if (!seen.has(p.name)) add('A003', 'error', page.file, 0, `\`${dedicated}.${p.name}\` (${p.type}) exists in the source but is missing from the options table`, p.name);
        }
      }
    }

    // A005: enum sections list exactly the enum's members.
    {
      let section = null;
      const flush = () => section = null;
      const sections = [];
      for (const l of prose) {
        const h = l.text.match(/^#{2,4}\s+(.*)$/);
        if (h) {
          const name = codeSpans(h[1]).concat(h[1].split(/\s+/)).map((s) => s.replace(/[^\w]/g, '')).find((n) => index.enums[n]);
          flush();
          if (name) sections.push((section = { name, line: l.n, members: new Set() }));
          continue;
        }
        if (section) {
          const m = l.text.match(/^\s*(?:\||[-*]\s)\s*`([A-Za-z_]\w*)`/);
          if (m) section.members.add(m[1]);
        }
      }
      for (const s of sections) {
        const known = new Set(index.enums[s.name].members.map((m) => m.split(/\s*=/)[0]));
        for (const m of s.members) if (!known.has(m) && !identifiers.has(m)) add('A005', 'error', page.file, s.line, `\`${s.name}.${m}\` is listed but \`${s.name}\` has no such member`, `${s.name}.${m}`);
        if (s.members.size >= 3) for (const k of known) if (!s.members.has(k)) add('A005', 'warn', page.file, s.line, `\`${s.name}.${k}\` exists in the source but the section does not list it`, `${s.name}.${k}`);
      }
    }

    // A006: Type.Member references to Nalix types (inside code spans of prose, or in code blocks).
    for (const l of page.lines) {
      if (l.lang && /^(?:json|bash|sh|text|ini|xml|yaml|yml|mermaid|diff|powershell|cmd)$/i.test(l.lang)) continue;
      const segments = l.code ? [l.text] : codeSpans(l.text).filter((sp) => !/[\\/]|\.(?:cs|md|csproj|ini|json)\b/.test(sp));
      for (const segment of segments) {
        for (const m of segment.matchAll(/(?<![\w.])([A-Z][A-Za-z0-9]+)\.([A-Z][A-Za-z0-9_]*)\b(?!\.(?:cs|md|csproj)\b)/g)) {
          const [, type, member] = m;
          if (!typesByName.has(type) || OBJECT_MEMBERS.has(member)) continue;
          const enumEntry = index.enums[type];
          if (enumEntry) {
            // Extension methods are written `Enum.Method` in docs, so a name that exists elsewhere in the source is fine.
            if (!enumEntry.members.some((x) => x.split(/\s*=/)[0] === member) && !(member.length >= 4 && identifiers.has(member) && /[a-z]/.test(member))) add('A006', 'error', page.file, l.n, `\`${type}.${member}\` is not a member of enum \`${type}\``, `${type}.${member}`);
          } else if (member.length >= 4 && !identifiers.has(member)) {
            add('A006', 'warn', page.file, l.n, `\`${type}.${member}\` — \`${member}\` does not exist anywhere in the source`, `${type}.${member}`);
          }
        }
      }
    }
  }

  // A010: public types no page mentions.
  const corpus = pages.map((p) => p.lines.map((l) => l.text).join('\n')).join('\n');
  const seenGap = new Set();
  for (const t of index.types) {
    if (seenGap.has(t.name) || !t.file.startsWith('src/') && !t.file.startsWith('analyzers/')) continue;
    if (/(^|\.)Internal(\.|$)/.test(t.namespace)) continue;
    if (t.file.startsWith('analyzers/') && /Model$/.test(t.name)) continue; // generator pipeline models
    seenGap.add(t.name);
    if (!new RegExp(`(?<![\\w])${escapeRe(t.name)}(?![\\w])`).test(corpus)) {
      add('A010', 'gap', '', 0, `Public ${t.kind} \`${t.namespace}.${t.name}\` (${t.file}) is not mentioned in any page`, t.name);
    }
  }

  return findings.sort((a, b) => a.code.localeCompare(b.code) || a.page.localeCompare(b.page) || a.line - b.line);
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

export function readDocsDir(dir = DOCS_DIR) {
  const docs = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.md')) docs.push({ file: path.relative(dir, full).replace(/\\/g, '/'), text: fs.readFileSync(full, 'utf8') });
    }
  };
  walk(dir);
  return docs.sort((a, b) => a.file.localeCompare(b.file));
}

export function renderFindings(findings) {
  const out = [];
  for (const sev of ['error', 'warn', 'gap']) {
    const list = findings.filter((f) => f.severity === sev);
    if (!list.length) continue;
    out.push(`## ${sev} (${list.length})`, '');
    list.forEach((f) => out.push(`- [${f.code}] ${f.page ? `\`${f.page}${f.line ? `:${f.line}` : ''}\` — ` : ''}${f.message}`));
    out.push('');
  }
  return out.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const arg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const index = JSON.parse(fs.readFileSync(arg('--index') ?? path.join(ROOT, 'source-api-index.json'), 'utf8'));
  let findings = auditDocs({ index, docs: readDocsDir() });
  if (arg('--baseline')) {
    const accepted = JSON.parse(fs.readFileSync(arg('--baseline'), 'utf8')).accepted ?? {};
    findings = findings.filter((f) => !(f.key in accepted));
  }
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(findings, null, 2));
  // Markdown for PR bodies: empty when there is nothing to report.
  if (arg('--markdown')) fs.writeFileSync(arg('--markdown'), findings.length ? `## Docs vs source audit\n\n${renderFindings(findings)}` : '');
  console.log(renderFindings(findings));
  const counts = Object.fromEntries(['error', 'warn', 'gap'].map((s) => [s, findings.filter((f) => f.severity === s).length]));
  console.log(`errors: ${counts.error}, warnings: ${counts.warn}, gaps: ${counts.gap}`);
  process.exitCode = counts.error ? 1 : 0;
}
