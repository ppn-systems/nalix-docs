// Builds a compact, committed index of the public API of the Nalix source (types, option
// properties with defaults, enum members, identifiers). docs-audit.mjs compares the docs with it,
// so the doc tests need neither the Nalix checkout nor the network.
import { layoutCSharp } from './csharp.mjs';

/** Top-level folders whose public types are API surface (samples are indexed as files only). */
const API_DIRS = ['src/', 'analyzers/'];

const MODIFIERS = '(?:(?:static|sealed|abstract|partial|readonly|unsafe|ref|new|file)\\s+)*';
// Group 1: structural punctuation. 2: access. 3: modifiers. 4: kind. 5: name.
const TOKEN = new RegExp(
  `([{};])|(?:\\b(public|internal|protected|private)\\s+(?:(?:protected|internal)\\s+)?)?(${MODIFIERS})\\b(class|struct|interface|enum|record(?:\\s+(?:struct|class))?)\\s+([A-Za-z_]\\w*)`,
  'g',
);

const IDENTIFIER = /\b[A-Z][A-Za-z0-9_]{3,}\b/g;
const NOT_A_TYPE_NAME = new Set(['where', 'new', 'class', 'struct']);

/** `[Attr] public int Name { get; set; } = default;` and friends inside an Options class body. */
const AUTO_PROPERTY =
  /\bpublic\s+((?:(?:new|virtual|override|required|static|unsafe)\s+)*)([\w.]+(?:\s*<[^;{}()=]*>)?(?:\[\])?\??)\s+([A-Za-z_]\w*)\s*\{\s*get\s*;(?:\s*(?:private\s+|protected\s+|internal\s+)?(?:set|init)\s*;)?\s*\}(?:\s*=\s*((?:[^;"]|"(?:[^"\\]|\\.)*")*?)\s*;)?/g;
const ANY_PROPERTY =
  /\bpublic\s+((?:(?:new|virtual|override|required|static|unsafe|sealed)\s+)*)[\w.]+(?:\s*<[^;{}()=]*>)?(?:\[\])?\??\s+([A-Za-z_]\w*)\s*(?:\{|=>)/g;

/** Splits an enum body into member names (ignores attributes and `= value`). */
export function enumMembers(body) {
  body = body.replace(/^[ \t]*#.*$/gm, ''); // #region / #if lines
  const members = [];
  let depth = 0;
  let current = '';
  const flush = () => {
    const m = current.replace(/\[[^\]]*\]/g, '').trim().match(/^([A-Za-z_]\w*)/);
    if (m) members.push(m[1]);
    current = '';
  };
  for (const ch of body) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) flush();
    else current += ch;
  }
  flush();
  return members;
}

function propertiesOf(body) {
  const props = new Map();
  for (const m of body.matchAll(AUTO_PROPERTY)) {
    if (/\bstatic\b/.test(m[1])) continue;
    props.set(m[3], { name: m[3], type: m[2].replace(/\s+/g, ' '), default: m[4]?.trim().replace(/\s+/g, ' ') });
  }
  for (const m of body.matchAll(ANY_PROPERTY)) {
    if (/\bstatic\b/.test(m[1])) continue;
    if (!props.has(m[2])) props.set(m[2], { name: m[2] });
  }
  return [...props.values()];
}

/** Public and non-public type declarations of one file, with the body text of each type. */
export function scanFile(file, source) {
  const { text, masked } = layoutCSharp(source);
  const ns = masked.match(/\bnamespace\s+([\w.]+)\s*[;{]/)?.[1] ?? '';
  const declarations = [];
  const stack = [];
  let pending = null;

  TOKEN.lastIndex = 0;
  for (let m = TOKEN.exec(masked); m; m = TOKEN.exec(masked)) {
    if (m[1] === '{') {
      const parentType = [...stack].reverse().find((f) => f.decl);
      const decl = pending;
      if (decl) decl.header = masked.slice(decl.headerStart, m.index).replace(/\s+/g, ' ').trim();
      if (decl) decl.api = decl.access === 'public' && (!parentType || parentType.decl.api);
      stack.push({ decl, bodyStart: m.index + 1 });
      pending = null;
    } else if (m[1] === '}') {
      const frame = stack.pop();
      if (frame?.decl) {
        frame.decl.body = text.slice(frame.bodyStart, m.index);
        frame.decl.maskedBody = masked.slice(frame.bodyStart, m.index);
        declarations.push(frame.decl);
      }
    } else if (m[1] === ';') {
      if (pending) {
        // Body-less declaration: `record R(int A);` or `class X : Attribute;`.
        const parentType = [...stack].reverse().find((f) => f.decl);
        pending.api = pending.access === 'public' && (!parentType || parentType.decl.api);
        pending.header = masked.slice(pending.headerStart, m.index).replace(/\s+/g, ' ').trim();
        pending.body = '';
        pending.maskedBody = '';
        declarations.push(pending);
      }
      pending = null;
    } else {
      const before = masked.slice(0, m.index).trimEnd().slice(-1);
      if (before === ':' || before === ',' || NOT_A_TYPE_NAME.has(m[5])) continue; // generic constraint
      pending = {
        name: m[5],
        kind: m[4].replace(/\s+/g, ' '),
        access: m[2] ?? 'internal',
        modifiers: m[3].trim().split(/\s+/).filter(Boolean),
        namespace: ns,
        file,
        headerStart: m.index + m[0].length,
      };
    }
  }
  const identifiers = new Set(masked.match(IDENTIFIER));
  return { declarations, identifiers };
}

/**
 * @param {{ path: string, text: string }[]} entries tracked `.cs`/`.csproj` files
 * @param {string[]} allPaths every file of the repository, so docs can cite READMEs, props files, etc.
 */
export function buildApiIndex(entries, allPaths = []) {
  const files = [...new Set([...allPaths, ...entries.map((e) => e.path)])].sort();
  const identifiers = new Set();
  const types = [];
  const internalTypes = [];
  const namespaces = new Set();
  const options = {};
  const enums = {};

  for (const { path, text } of entries) {
    if (!path.endsWith('.cs') || !API_DIRS.some((d) => path.startsWith(d))) continue;
    const { declarations, identifiers: ids } = scanFile(path, text);
    ids.forEach((id) => identifiers.add(id));
    for (const d of declarations) {
      if (d.namespace) namespaces.add(d.namespace);
      if (!d.api) {
        internalTypes.push({ name: d.name, kind: d.kind, namespace: d.namespace, file: d.file });
        continue;
      }
      types.push({ name: d.name, kind: d.kind, namespace: d.namespace, file: d.file, modifiers: d.modifiers });
      if (d.kind === 'enum') {
        const entry = (enums[d.name] ??= { namespace: d.namespace, members: [] });
        entry.members.push(...enumMembers(d.body));
      } else if (d.kind === 'class' && /Options$/.test(d.name)) {
        const entry = (options[d.name] ??= { namespace: d.namespace, properties: [] });
        for (const p of propertiesOf(d.body)) if (!entry.properties.some((x) => x.name === p.name)) entry.properties.push(p);
      }
    }
  }

  const byName = (a, b) => a.name.localeCompare(b.name) || a.file.localeCompare(b.file);
  return {
    files,
    types: types.sort(byName),
    internalTypes: internalTypes.sort(byName),
    namespaces: [...namespaces].sort(),
    options: Object.fromEntries(Object.entries(options).sort(([a], [b]) => a.localeCompare(b))),
    enums: Object.fromEntries(Object.entries(enums).sort(([a], [b]) => a.localeCompare(b))),
    identifiers: [...identifiers].sort(),
  };
}


// ---------------------------------------------------------------------------------------------
// API surface: public/protected member signatures, used for semantic diffs between two commits
// ---------------------------------------------------------------------------------------------

const TYPE_KEYWORD = /\b(class|struct|interface|enum|record)\b/;
const ACCESSOR_ONLY = /^\{(?:get|set|init|private|protected|internal|;)*\}$/;

const collapse = (text) => text.replace(/\s+/g, ' ').trim();
const stripAttributes = (head) => {
  let out = head.trim();
  for (let prev = ''; prev !== out; ) {
    prev = out;
    out = out.replace(/^\[[^\[\]]*(?:\[[^\]]*\][^\[\]]*)*\]\s*/, '');
  }
  return out;
};

/**
 * Splits a type body into member signatures. A member's head ends at `;`, `{`, `=>` or `=`; method
 * and accessor bodies are skipped, property accessors and initializers are kept (defaults matter).
 */
export function memberSignatures(maskedBody, textBody, kind) {
  const members = [];
  const n = maskedBody.length;
  const skipBalanced = (from, open, close) => {
    let depth = 0;
    for (let i = from; i < n; i++) {
      if (maskedBody[i] === open) depth++;
      else if (maskedBody[i] === close && --depth === 0) return i;
    }
    return n - 1;
  };
  const statementEnd = (from) => {
    let depth = 0;
    for (let i = from; i < n; i++) {
      const c = maskedBody[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
      else if (c === ';' && depth === 0) return i;
    }
    return n;
  };

  let start = 0;
  let i = 0;
  while (i < n) {
    const c = maskedBody[i];
    if (c === '(' || c === '[') {
      i = skipBalanced(i, c, c === '(' ? ')' : ']') + 1;
    } else if (c === ';') {
      add(start, i, '');
      start = ++i;
    } else if (c === '=' && maskedBody[i + 1] === '>') {
      add(start, i, '');
      start = i = statementEnd(i) + 1;
    } else if (c === '=' && maskedBody[i + 1] !== '=' && !'<>!=+-*/%&|^'.includes(maskedBody[i - 1] ?? ' ')) {
      const end = statementEnd(i);
      add(start, i, ` = ${collapse(textBody.slice(i + 1, end))}`);
      start = i = end + 1;
    } else if (c === '{') {
      const close = skipBalanced(i, '{', '}');
      const head = stripAttributes(collapse(maskedBody.slice(start, i)));
      let suffix = '';
      if (!head.includes('(')) {
        // Property / indexer: keep the accessor list, drop accessor bodies.
        const block = maskedBody.slice(i, close + 1).replace(/\{[^{}]*\}/g, (m, off) => (off === 0 ? m : '{}'));
        const flat = block.replace(/\{(?=[^]*\{)/g, '{').replace(/\s+/g, '');
        suffix = ACCESSOR_ONLY.test(flat) ? ` ${flat}` : ' {…}';
        let after = close + 1;
        while (maskedBody[after] === ' ' || maskedBody[after] === '\n') after++;
        if (maskedBody[after] === '=' && maskedBody[after + 1] !== '>') {
          const end = statementEnd(after);
          suffix += ` = ${collapse(textBody.slice(after + 1, end))}`;
          add(start, i, suffix);
          start = i = end + 1;
          continue;
        }
      }
      add(start, i, suffix);
      start = i = close + 1;
    } else {
      i++;
    }
  }

  function add(from, to, suffix) {
    const head = stripAttributes(collapse(textBody.slice(from, to).replace(/^\s*#.*$/gm, '')));
    if (!head || TYPE_KEYWORD.test(head) && !head.includes('(')) return;
    if (kind !== 'interface' && !/\b(public|protected)\b/.test(head)) return;
    members.push(collapse((head + suffix).replace(/\)\s*:\s*(?:this|base)\s*\(.*$/, ')')));
  }
  return members;
}

/** Identifier a signature declares: `public int Foo(int a)` -> `Foo`. */
export function memberName(signature) {
  const head = signature.split(/\s=\s|\s=>\s/)[0].replace(/\([^]*$/, '').replace(/\{[^]*$/, '').replace(/<[^<>]*>\s*$/, '').trim();
  return head.match(/([A-Za-z_]\w*)\s*$/)?.[1] ?? signature;
}

/**
 * Public API surface of one file as `{ type, signature }[]`: one `<declaration>` entry per public
 * type (kind + generic parameters + base list) and one entry per public/protected member.
 */
export function fileSurface(file, source) {
  const out = [];
  for (const d of scanFile(file, source).declarations) {
    if (!d.api) continue;
    const type = `${d.namespace ? `${d.namespace}.` : ''}${d.name}`;
    out.push({ type, signature: `<${[...d.modifiers, d.kind].join(' ')}${d.header ? ` ${d.header.replace(/\s*where\b.*$/, '')}` : ''}>` });
    if (d.kind === 'enum') {
      const members = [];
      let depth = 0;
      let current = '';
      const flush = () => { if (current.trim()) members.push(collapse(stripAttributes(collapse(current)))); current = ''; };
      for (const ch of d.body.replace(/^[ \t]*#.*$/gm, '')) {
        if ('([{'.includes(ch)) depth++;
        if (')]}'.includes(ch)) depth--;
        if (ch === ',' && depth === 0) flush(); else current += ch;
      }
      flush();
      members.forEach((m) => out.push({ type, signature: m }));
    } else {
      for (const sig of memberSignatures(d.maskedBody, d.body, d.kind)) out.push({ type, signature: sig });
    }
  }
  return out;
}

/** Compares two surfaces; both sides are `{ type, signature }[]`. */
export function diffSurfaces(before, after) {
  const key = (e) => `${e.type} :: ${e.signature}`;
  const a = new Map(before.map((e) => [key(e), e]));
  const b = new Map(after.map((e) => [key(e), e]));
  return {
    removed: [...a].filter(([k]) => !b.has(k)).map(([, e]) => e),
    added: [...b].filter(([k]) => !a.has(k)).map(([, e]) => e),
  };
}
