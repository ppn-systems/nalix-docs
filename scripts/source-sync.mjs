// Snapshots the Nalix source tree (per-file SHA-256) and reports which files changed since
// the last snapshot, together with the documentation pages that mention the affected types.
//
//   node scripts/source-sync.mjs check  [--source ../nalix]   # report drift, exit 1 if any
//   node scripts/source-sync.mjs update [--source ../nalix]   # rewrite source-manifest.json
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'source-manifest.json');
const DOCS_DIR = path.join(ROOT, 'src/content/docs/en-us');

export const TRACKED_DIRS = ['src', 'samples'];
const TRACKED_EXT = new Set(['.cs', '.csproj']);
const SKIPPED_DIRS = new Set(['bin', 'obj', '.git', '.vs']);

/** SHA-256 of a file with line endings normalized, so CRLF/LF checkouts hash identically. */
export function hashFile(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(text).digest('hex');
}

/** Returns { 'src/Nalix.Codec/Foo.cs': '<sha256>', ... } sorted by path. */
export function buildTree(sourceRoot) {
  const files = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (entry.isFile() && TRACKED_EXT.has(path.extname(entry.name))) {
        const full = path.join(dir, entry.name);
        files[path.relative(sourceRoot, full).replace(/\\/g, '/')] = hashFile(full);
      }
    }
  };
  for (const dir of TRACKED_DIRS) {
    const full = path.join(sourceRoot, dir);
    if (fs.existsSync(full)) walk(full);
  }
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
}

export function diffTrees(oldFiles, newFiles) {
  const added = [], removed = [], modified = [];
  for (const [file, hash] of Object.entries(newFiles)) {
    if (!(file in oldFiles)) added.push(file);
    else if (oldFiles[file] !== hash) modified.push(file);
  }
  for (const file of Object.keys(oldFiles)) if (!(file in newFiles)) removed.push(file);
  return { added, removed, modified };
}

/** `Foo.Types.cs` / `Foo.Cleanup.cs` / `Foo.cs` -> `Foo`; `Foo{T}.cs` style generics -> `Foo`. */
export function typeNameOf(file) {
  return path.basename(file).split('.')[0].replace(/[`{].*$/, '');
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

function gitCommit(sourceRoot) {
  try {
    return execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function main(argv) {
  const command = argv[0];
  const srcIdx = argv.indexOf('--source');
  const sourceRoot = path.resolve(ROOT, srcIdx >= 0 ? argv[srcIdx + 1] : process.env.NALIX_SOURCE ?? '../nalix');

  if (command !== 'check' && command !== 'update') {
    console.error('Usage: node scripts/source-sync.mjs <check|update> [--source <path-to-nalix>]');
    return 2;
  }
  if (!fs.existsSync(path.join(sourceRoot, 'src'))) {
    console.error(`Nalix source not found at ${sourceRoot} (clone ppn-systems/nalix there or pass --source).`);
    return 2;
  }

  const files = buildTree(sourceRoot);
  const commit = gitCommit(sourceRoot);

  if (command === 'update') {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ nalixCommit: commit, files }, null, 2) + '\n');
    console.log(`source-manifest.json updated: ${Object.keys(files).length} files @ ${commit ?? 'unknown commit'}`);
    return 0;
  }

  const manifest = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
    : { nalixCommit: null, files: {} };
  const { added, removed, modified } = diffTrees(manifest.files, files);
  const total = added.length + removed.length + modified.length;

  console.log(`Manifest: ${manifest.nalixCommit ?? 'none'}  ->  Source: ${commit ?? 'unknown'}`);
  if (total === 0) {
    console.log('Docs are in sync with source (no file changes).');
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
  process.exitCode = main(process.argv.slice(2));
}
