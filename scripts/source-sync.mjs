// Compares the Nalix source with source-manifest.json and tells the docs what to do.
//
// Each file is hashed on its *meaningful* content (comments, XML docs and formatting are dropped,
// string/char literals are kept byte-for-byte), so cosmetic commits never register. Files that did
// change are then classified (see drift-report.mjs):
//   red     public API changed and the docs do not show it yet   -> signature diff + docs lines to edit
//   yellow  behavior changed in code a page cites and describes  -> line diff, review (may need no edit)
//   green   API changed but the docs already match               -> nothing to do
//   white   internal / not something the docs mention            -> ignored
// Only red/yellow make `check` exit 1.
//
// Source is read straight from GitHub (one tarball per commit) unless `--source <local-clone>` is given.
//
//   node scripts/source-sync.mjs check  [--ref <branch|tag|sha>] [--repo owner/name] [--source ../nalix]
//                                       [--report f.md] [--pr-body f.md] [--json f.json] [--update]
//   node scripts/source-sync.mjs update [--ref <branch|tag|sha>] [--repo owner/name] [--source ../nalix]
//
// `update` / `check --update` rewrite source-manifest.json (file hashes) and source-api-index.json
// (public API snapshot used by docs-audit.mjs and the doc tests).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeCSharp, normalizeXml, layoutCSharp } from './csharp.mjs';
import { buildApiIndex } from './api-index.mjs';
import { classifyChanges, renderReport, truncateReport } from './drift-report.mjs';

export { normalizeCSharp, normalizeXml, layoutCSharp };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'source-manifest.json');
const DOCS_DIR = path.join(ROOT, 'src/content/docs/en-us');

export const DEFAULT_REPO = 'ppn-systems/nalix';
export const TRACKED_DIRS = ['analyzers', 'samples', 'src'];
const SKIPPED_SEGMENTS = new Set(['bin', 'obj', '.git', '.vs']);

/** True for `.cs`/`.csproj` files under `analyzers/`, `samples/` or `src/`, outside `bin`/`obj`. */
export function isTracked(file) {
  const segments = file.split('/');
  return (
    TRACKED_DIRS.includes(segments[0]) &&
    (file.endsWith('.cs') || file.endsWith('.csproj')) &&
    !segments.some((s) => SKIPPED_SEGMENTS.has(s))
  );
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GitHub API call with retries for network errors, 5xx and secondary rate limits. */
async function github(url, attempts = 4) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'nalix-docs-source-sync' };
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(`https://api.github.com${url}`, { headers });
    } catch (err) {
      if (attempt >= attempts) throw new Error(`GitHub ${url} -> network error: ${err.cause?.code ?? err.message}`);
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (res.ok) return res;
    const body = await res.text();
    if (res.status === 404) throw new Error(`GitHub ${url} -> 404: repository or ref not found (private repo needs GITHUB_TOKEN).`);
    if ((res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0') {
      const reset = new Date(Number(res.headers.get('x-ratelimit-reset')) * 1000).toISOString();
      throw new Error(`GitHub API rate limit exhausted until ${reset}; set GITHUB_TOKEN.`);
    }
    const retryable = res.status >= 500 || res.status === 429 || res.headers.has('retry-after');
    if (!retryable || attempt >= attempts) throw new Error(`GitHub ${url} -> HTTP ${res.status} ${body.slice(0, 300)}`);
    await sleep(1000 * (Number(res.headers.get('retry-after')) || 2 ** attempt));
  }
}

/** Downloads one commit as a tarball and returns its tracked files. */
export async function fetchTracked(repo, commit) {
  const tarball = Buffer.from(await (await github(`/repos/${repo}/tarball/${commit}`)).arrayBuffer());
  let tar;
  try {
    tar = zlib.gunzipSync(tarball);
  } catch (err) {
    throw new Error(`Tarball for ${repo}@${commit} is corrupt (${err.message}).`);
  }
  const all = readTar(tar);
  const entries = all.filter((e) => isTracked(e.path));
  if (entries.length === 0) throw new Error(`No tracked files found in ${repo}@${commit}; refusing to continue.`);
  return snapshot(commit, entries, all.map((e) => e.path));
}

async function readGitHub(repo, ref) {
  const { sha: commit } = await (await github(`/repos/${repo}/commits/${encodeURIComponent(ref)}`)).json();
  return fetchTracked(repo, commit);
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
  let allPaths = [];
  try {
    allPaths = execFileSync('git', ['-C', sourceRoot, 'ls-files'], { encoding: 'utf8', maxBuffer: 64 << 20 }).split('\n').filter(Boolean);
  } catch {}
  return snapshot(commit, entries, allPaths);
}

/** `{ commit, entries: Map<path, text>, files: { path: hash } }` — the API index is built lazily. */
function snapshot(commit, entries, allPaths = []) {
  return { commit, entries: new Map(entries.map((e) => [e.path, e.text])), files: toTree(entries), list: entries, allPaths };
}

// ---------------------------------------------------------------------------------------------
// Diff & CLI
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
  return docs.sort((a, b) => a.file.localeCompare(b.file));
}

const INDEX_PATH = path.join(ROOT, 'source-api-index.json');

function writeSnapshot(current) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ nalixCommit: current.commit, files: current.files }, null, 2) + '\n');
  const index = { nalixCommit: current.commit, ...buildApiIndex(current.list, current.allPaths) };
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index) + '\n');
  console.log(`source-manifest.json + source-api-index.json updated: ${Object.keys(current.files).length} files @ ${current.commit}`);
}

async function main(argv) {
  const command = argv[0];
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  if (command !== 'check' && command !== 'update') {
    console.error('Usage: node scripts/source-sync.mjs <check|update> [--ref <ref>] [--repo <owner/name>] [--source <local-clone>]');
    console.error('       check options: --report <file.md> (full Markdown report), --pr-body <file.md> (size-capped), --json <file>, --update (record the new snapshot when docs are affected)');
    return 2;
  }

  const repo = arg('--repo') ?? DEFAULT_REPO;
  const source = arg('--source') ?? process.env.NALIX_SOURCE;
  const current = source ? readLocal(path.resolve(ROOT, source)) : await readGitHub(repo, arg('--ref') ?? 'HEAD');

  if (command === 'update') {
    writeSnapshot(current);
    return 0;
  }

  let manifest = { nalixCommit: null, files: {} };
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (err) {
      throw new Error(`source-manifest.json is not valid JSON (${err.message}); fix or regenerate it with sync:update.`);
    }
  }
  const changes = diffTrees(manifest.files ?? {}, current.files);
  const total = changes.added.length + changes.removed.length + changes.modified.length;

  console.log(`Manifest: ${manifest.nalixCommit ?? 'none'}  ->  Source: ${current.commit}`);
  if (total === 0) {
    console.log('Docs are in sync with source (no meaningful file changes).');
    return 0;
  }

  // The previous version lets us tell API changes from internal ones; without it everything is treated as API.
  let oldEntries = null;
  if (manifest.nalixCommit) {
    try {
      oldEntries = (await fetchTracked(repo, manifest.nalixCommit)).entries;
    } catch (err) {
      console.warn(`warning: previous version ${manifest.nalixCommit.slice(0, 7)} unavailable (${err.message}); classification is conservative.`);
    }
  }

  const docs = readDocs();
  const report = classifyChanges({ changes, oldEntries, newEntries: current.entries, docs });
  const markdown = renderReport({ repo, from: manifest.nalixCommit, to: current.commit, report });
  console.log(`\n${markdown}`);

  if (arg('--report')) fs.writeFileSync(arg('--report'), markdown);
  if (arg('--pr-body')) fs.writeFileSync(arg('--pr-body'), truncateReport(markdown));
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify({ from: manifest.nalixCommit, to: current.commit, report }, null, 2));

  if (report.api.length + report.behavior.length === 0) {
    console.log(`\nNothing for the docs to do: ${report.reflected.length} API change(s) already documented, ${report.internal.length} internal change(s) ignored.`);
    return 0;
  }
  if (argv.includes('--update')) writeSnapshot(current);
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
