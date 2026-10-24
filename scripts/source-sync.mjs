// Snapshots the Nalix source tree and reports which files changed since the last snapshot,
// together with the documentation pages that mention the affected types.
//
// Each file is hashed on its *meaningful* content: C# comments (//, /* */, ///) and formatting
// whitespace are dropped while string/char literals are kept byte-for-byte, so comment-only or
// reformat-only commits do not mark docs as stale. `.csproj` files drop XML comments the same way.
//
// Source is read straight from GitHub (one tarball download) unless `--source <local-clone>` is given.
//
//   node scripts/source-sync.mjs check  [--ref <branch|tag|sha>] [--repo owner/name] [--source ../nalix]
//   node scripts/source-sync.mjs update [--ref <branch|tag|sha>] [--repo owner/name] [--source ../nalix]
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'source-manifest.json');
const DOCS_DIR = path.join(ROOT, 'src/content/docs/en-us');

export const DEFAULT_REPO = 'ppn-systems/nalix';
export const TRACKED_DIRS = ['src', 'samples'];
const SKIPPED_SEGMENTS = new Set(['bin', 'obj', '.git', '.vs']);

/** True for `.cs`/`.csproj` files under `src/` or `samples/`, outside `bin`/`obj`. */
export function isTracked(file) {
  const segments = file.split('/');
  return (
    TRACKED_DIRS.includes(segments[0]) &&
    (file.endsWith('.cs') || file.endsWith('.csproj')) &&
    !segments.some((s) => SKIPPED_SEGMENTS.has(s))
  );
}

// ---------------------------------------------------------------------------------------------
// C# normalization
// ---------------------------------------------------------------------------------------------

const isIdent = (c) => c !== undefined && /[\p{L}\p{N}_@]/u.test(c);
const isSpace = (c) => c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '\f' || c === '\v' || c === ' ' || c === '﻿';

/**
 * Strips comments and insignificant whitespace from C# source. Literals are copied verbatim,
 * including regular/verbatim/interpolated/raw strings (with nested interpolation holes) and chars.
 * A single space is kept only where two identifier characters would otherwise merge.
 */
export function normalizeCSharp(src) {
  let i = 0;
  let out = '';
  let pendingSpace = false;
  let lineStart = true; // only whitespace seen since the last newline

  const emit = (text) => {
    if (pendingSpace && isIdent(out[out.length - 1]) && isIdent(text[0])) out += ' ';
    out += text;
    pendingSpace = false;
  };

  // Scans code until EOF, or (when `inHole`) until the `}` closing an interpolation hole (left unconsumed).
  const scanCode = (inHole) => {
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      const n = src[i + 1];

      if (isSpace(c)) {
        if (c === '\n') lineStart = true;
        pendingSpace = true;
        i++;
        continue;
      }
      if (c === '/' && n === '/') {
        while (i < src.length && src[i] !== '\n') i++;
        pendingSpace = true;
        continue;
      }
      if (c === '/' && n === '*') {
        const end = src.indexOf('*/', i + 2);
        i = end < 0 ? src.length : end + 2;
        pendingSpace = true;
        continue;
      }
      if (c === '#' && lineStart && !inHole) {
        // Preprocessor directive: keep the line, minus any trailing comment.
        let end = src.indexOf('\n', i);
        if (end < 0) end = src.length;
        const line = src.slice(i, end).replace(/\s*\/\/.*$/, '').replace(/\s+/g, ' ').trim();
        if (out.length) out += '\n';
        out += line + '\n';
        pendingSpace = false;
        i = end;
        continue;
      }
      lineStart = false;

      // String literal prefixes: any mix of `$` and `@` directly followed by `"`.
      if (c === '"' || ((c === '$' || c === '@') && /^[$@]*"/.test(src.slice(i, i + 16)))) {
        readString();
        continue;
      }
      if (c === "'") {
        readChar();
        continue;
      }
      if (c === '{') depth++;
      if (c === '}') {
        if (inHole && depth === 0) return;
        depth--;
      }
      emit(c);
      i++;
    }
  };

  const readChar = () => {
    const start = i++;
    while (i < src.length && src[i] !== "'" && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
    i++;
    emit(src.slice(start, i));
  };

  const readString = () => {
    const start = i;
    let dollars = 0;
    let verbatim = false;
    while (src[i] === '$' || src[i] === '@') {
      if (src[i] === '$') dollars++;
      else verbatim = true;
      i++;
    }
    let quotes = 0;
    while (src[i + quotes] === '"') quotes++;

    emit(src.slice(start, i)); // prefix
    pendingSpace = false;

    if (quotes >= 3 && !verbatim) return readRaw(quotes, dollars);
    if (quotes === 2 && !verbatim) {
      out += '""'; // empty string
      i += 2;
      return;
    }

    out += '"';
    i++;
    while (i < src.length) {
      const c = src[i];
      if (verbatim && c === '"' && src[i + 1] === '"') {
        out += '""';
        i += 2;
      } else if (c === '"') {
        out += '"';
        i++;
        return;
      } else if (!verbatim && c === '\\') {
        out += src.slice(i, i + 2);
        i += 2;
      } else if (dollars && (c === '{' || c === '}') && src[i + 1] === c) {
        out += c + c;
        i += 2;
      } else if (dollars && c === '{') {
        out += '{';
        i++;
        hole();
        out += '}';
        i++;
      } else if (!verbatim && c === '\n') {
        return; // unterminated literal; resume as code
      } else {
        out += c;
        i++;
      }
    }
  };

  const readRaw = (quotes, dollars) => {
    const fence = '"'.repeat(quotes);
    out += fence;
    i += quotes;
    while (i < src.length) {
      if (src.startsWith(fence, i)) {
        let run = quotes;
        while (src[i + run] === '"') run++;
        out += src.slice(i, i + run);
        i += run;
        return;
      }
      if (dollars && src[i] === '{') {
        let run = 0;
        while (src[i + run] === '{') run++;
        if (run >= dollars) {
          out += src.slice(i, i + run);
          i += run;
          hole();
          let close = 0;
          while (src[i + close] === '}' && close < dollars) close++;
          out += '}'.repeat(close);
          i += close;
          continue;
        }
        out += src.slice(i, i + run);
        i += run;
        continue;
      }
      out += src[i++];
    }
  };

  const hole = () => {
    pendingSpace = false;
    scanCode(true);
    pendingSpace = false;
  };

  scanCode(false);
  return out.trim();
}

/** Strips `<!-- -->` comments and collapses whitespace between tags. */
export function normalizeXml(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

/** SHA-256 of the normalized content of a tracked file. */
export function hashContent(file, text) {
  const normalized = file.endsWith('.cs') ? normalizeCSharp(text) : normalizeXml(text);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// ---------------------------------------------------------------------------------------------
// Source readers
// ---------------------------------------------------------------------------------------------

/** Turns `[{ path, text }]` into a sorted `{ path: hash }` map of tracked files. */
export function toTree(entries) {
  return Object.fromEntries(
    entries
      .filter((e) => isTracked(e.path))
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((e) => [e.path, hashContent(e.path, e.text)]),
  );
}

/** Minimal ustar/pax reader for GitHub tarballs. Strips the top-level `<repo>-<sha>/` folder. */
export function readTar(buffer) {
  const entries = [];
  let offset = 0;
  let paxPath = null;
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    const str = (from, len) => header.toString('utf8', from, from + len).replace(/\0.*$/s, '');
    const size = parseInt(str(124, 12).trim() || '0', 8);
    const type = String.fromCharCode(header[156] || 48);
    const prefix = str(345, 155);
    const name = paxPath ?? (prefix ? `${prefix}/${str(0, 100)}` : str(0, 100));
    const body = buffer.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;

    if (type === 'x') {
      const match = body.toString('utf8').match(/^\d+ path=(.*)$/m);
      paxPath = match ? match[1] : null;
      continue;
    }
    paxPath = null;
    if (type === 'g' || (type !== '0' && type !== '\0')) continue;
    entries.push({ path: name.split('/').slice(1).join('/'), text: body.toString('utf8') });
  }
  return entries;
}

async function github(url) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'nalix-docs-source-sync' };
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com${url}`, { headers });
  if (!res.ok) throw new Error(`GitHub ${url} -> HTTP ${res.status} ${await res.text()}`);
  return res;
}

async function readGitHub(repo, ref) {
  const { sha: commit } = await (await github(`/repos/${repo}/commits/${encodeURIComponent(ref)}`)).json();
  const tarball = Buffer.from(await (await github(`/repos/${repo}/tarball/${commit}`)).arrayBuffer());
  return { commit, files: toTree(readTar(zlib.gunzipSync(tarball))) };
}

/** Reads the working tree of a local clone. */
function readLocal(sourceRoot) {
  const entries = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_SEGMENTS.has(entry.name)) walk(full);
      } else if (entry.isFile()) {
        const rel = path.relative(sourceRoot, full).replace(/\\/g, '/');
        if (isTracked(rel)) entries.push({ path: rel, text: fs.readFileSync(full, 'utf8') });
      }
    }
  };
  for (const dir of TRACKED_DIRS) if (fs.existsSync(path.join(sourceRoot, dir))) walk(path.join(sourceRoot, dir));
  let commit = 'working-tree';
  try {
    commit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {}
  return { commit, files: toTree(entries) };
}

// ---------------------------------------------------------------------------------------------
// Diff & docs mapping
// ---------------------------------------------------------------------------------------------

export function diffTrees(oldFiles, newFiles) {
  const added = [], removed = [], modified = [];
  for (const [file, hash] of Object.entries(newFiles)) {
    if (!(file in oldFiles)) added.push(file);
    else if (oldFiles[file] !== hash) modified.push(file);
  }
  for (const file of Object.keys(oldFiles)) if (!(file in newFiles)) removed.push(file);
  return { added, removed, modified };
}

/** `Foo.Types.cs` / `Foo.Cleanup.cs` / `Foo.cs` -> `Foo`. */
export function typeNameOf(file) {
  return path.basename(file).split('.')[0];
}

function readDocs() {
  const docs = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) {
        docs.push({ file: path.relative(DOCS_DIR, full).replace(/\\/g, '/'), text: fs.readFileSync(full, 'utf8') });
      }
    }
  };
  walk(DOCS_DIR);
  return docs;
}

/** Pages that mention the type name as a whole word. */
export function pagesMentioning(name, docs) {
  const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  return docs.filter((d) => re.test(d.text)).map((d) => d.file);
}

async function main(argv) {
  const command = argv[0];
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  if (command !== 'check' && command !== 'update') {
    console.error('Usage: node scripts/source-sync.mjs <check|update> [--ref <ref>] [--repo <owner/name>] [--source <local-clone>]');
    return 2;
  }

  const source = arg('--source') ?? process.env.NALIX_SOURCE;
  const { commit, files } = source
    ? readLocal(path.resolve(ROOT, source))
    : await readGitHub(arg('--repo') ?? DEFAULT_REPO, arg('--ref') ?? 'HEAD');

  if (command === 'update') {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ nalixCommit: commit, files }, null, 2) + '\n');
    console.log(`source-manifest.json updated: ${Object.keys(files).length} files @ ${commit}`);
    return 0;
  }

  const manifest = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
    : { nalixCommit: null, files: {} };
  const { added, removed, modified } = diffTrees(manifest.files, files);
  const total = added.length + removed.length + modified.length;

  console.log(`Manifest: ${manifest.nalixCommit ?? 'none'}  ->  Source: ${commit}`);
  if (total === 0) {
    console.log('Docs are in sync with source (no meaningful file changes).');
    return 0;
  }

  const docs = readDocs();
  const report = (label, list) => {
    if (list.length === 0) return;
    console.log(`\n${label} (${list.length}):`);
    for (const file of list) {
      const pages = pagesMentioning(typeNameOf(file), docs);
      console.log(`  ${file}${pages.length ? `\n      -> ${pages.join('\n      -> ')}` : ''}`);
    }
  };
  report('Modified', modified);
  report('Added', added);
  report('Removed', removed);
  console.log(`\n${total} source file(s) changed. Update the listed pages, then run: npm run sync:update`);
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => (process.exitCode = code),
    (err) => {
      console.error(err.message);
      process.exitCode = 2;
    },
  );
}
