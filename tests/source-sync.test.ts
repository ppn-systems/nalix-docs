import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildTree, diffTrees, pagesMentioning, typeNameOf } from '../scripts/source-sync.mjs';

describe('Source sync manifest tool', () => {
  it('hashes tracked files with normalized line endings and skips bin/obj', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nalix-sync-'));
    fs.mkdirSync(path.join(root, 'src/A/obj'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src/A/Lf.cs'), 'class A {}\n');
    fs.writeFileSync(path.join(root, 'src/A/Crlf.cs'), 'class A {}\r\n');
    fs.writeFileSync(path.join(root, 'src/A/obj/Gen.cs'), 'x');
    fs.writeFileSync(path.join(root, 'src/A/notes.txt'), 'x');

    const tree = buildTree(root);
    expect(Object.keys(tree)).toEqual(['src/A/Crlf.cs', 'src/A/Lf.cs']);
    expect(tree['src/A/Crlf.cs']).toBe(tree['src/A/Lf.cs']);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('reports added, removed and modified files', () => {
    expect(diffTrees({ a: '1', b: '2', c: '3' }, { a: '1', b: 'X', d: '4' })).toEqual({
      added: ['d'],
      removed: ['c'],
      modified: ['b'],
    });
  });

  it('maps partial-class files to their type and finds pages by whole-word match', () => {
    expect(typeNameOf('src/Nalix.Network/ConnectionHub.Cleanup.cs')).toBe('ConnectionHub');
    const docs = [
      { file: 'a.md', text: 'Uses `ConnectionHub` here.' },
      { file: 'b.md', text: 'ConnectionHubOptions only.' },
    ];
    expect(pagesMentioning('ConnectionHub', docs)).toEqual(['a.md']);
  });
});
