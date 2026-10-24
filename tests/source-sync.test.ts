import { describe, expect, it } from 'vitest';
import zlib from 'node:zlib';
import { diffTrees, renderMarkdown, hashContent, normalizeCSharp, normalizeXml, pagesMentioning, readTar, toTree, typeNameOf } from '../scripts/source-sync.mjs';

const hash = (text: string) => hashContent('A.cs', text);

describe('Source sync — C# normalization', () => {
  it('ignores comments, XML docs and formatting', () => {
    const a = 'namespace N;\n/// <summary>Docs</summary>\npublic sealed class A { int x = 1; } // trailing\n';
    const b = 'namespace N;\r\n/* block\n comment */\npublic   sealed class A\n{\n    int x = 1;\n}\n';
    expect(hash(a)).toBe(hash(b));
    expect(hash(a)).not.toBe(hash(a.replace('x = 1', 'x = 2')));
  });

  it('keeps comment-like text inside string and char literals', () => {
    for (const lit of ['"http://x"', '"a /* b */ c"', '@"C:\\a\\""//b"', '"esc \\" // still"', "'\"'", "'\\''"]) {
      const src = `var s = ${lit}; // real comment`;
      expect(normalizeCSharp(src)).toBe(`var s=${lit};`);
      expect(hash(src)).not.toBe(hash('var s = "";'));
    }
  });

  it('handles interpolated strings with nested holes, strings and braces', () => {
    const src = 'var s = $"{a /* c */ + "}//"} {{x}} {(b ? "x" : "y")}"; // c';
    expect(normalizeCSharp(src)).toBe('var s=$"{a+"}//"} {{x}} {(b?"x":"y")}";');
  });

  it('handles raw string literals, including interpolated raw strings', () => {
    const raw = 'var j = """\n  { "a": "// not a comment" }\n  """; // c';
    expect(normalizeCSharp(raw)).toBe('var j="""\n  { "a": "// not a comment" }\n  """;');
    const iraw = 'var j = $$"""{ "v": {{v /* c */}} }"""; // c';
    expect(normalizeCSharp(iraw)).toBe('var j=$$"""{ "v": {{v}} }""";');
  });

  it('keeps preprocessor directives on their own line without trailing comments', () => {
    expect(normalizeCSharp('#if DEBUG // dbg\nint a;\n#endif')).toBe('#if DEBUG\nint a;\n#endif');
  });

  it('keeps identifiers apart but drops spacing around punctuation', () => {
    expect(normalizeCSharp('public  static\nint  F ( int a )  =>  a ;')).toBe('public static int F(int a)=>a;');
  });

  it('ignores XML comments and whitespace in .csproj files', () => {
    expect(normalizeXml('<Project>\n  <!-- c -->\n  <A>1</A>\n</Project>')).toBe('<Project><A>1</A></Project>');
  });
});

describe('Source sync — tree, diff and docs mapping', () => {
  it('reads GitHub tarballs, strips the top folder and keeps only tracked files', () => {
    const entry = (name: string, text: string) => {
      const header = Buffer.alloc(512);
      header.write(name, 0);
      header.write(Buffer.byteLength(text).toString(8).padStart(11, '0'), 124);
      header.write('0', 156);
      const body = Buffer.alloc(Math.ceil(Buffer.byteLength(text) / 512) * 512);
      body.write(text);
      return Buffer.concat([header, body]);
    };
    const tar = zlib.gunzipSync(zlib.gzipSync(Buffer.concat([
      entry('nalix-abc/src/A/A.cs', 'class A {}'),
      entry('nalix-abc/src/A/obj/G.cs', 'x'),
      entry('nalix-abc/README.md', 'x'),
      Buffer.alloc(1024),
    ])));
    expect(Object.keys(toTree(readTar(tar)))).toEqual(['src/A/A.cs']);
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

  it('renders a Markdown report with compare link, source links and a page checklist', () => {
    const md = renderMarkdown({
      repo: 'o/r',
      from: 'a'.repeat(40),
      to: 'b'.repeat(40),
      changes: { modified: ['src/X/Hub.cs'], added: [], removed: ['src/X/Gone.cs'] },
      docs: [{ file: 'api/hub.md', text: 'The Hub type.' }],
    });
    expect(md).toContain(`https://github.com/o/r/compare/${'a'.repeat(40)}...${'b'.repeat(40)}`);
    expect(md).toContain(`[src/X/Hub.cs](https://github.com/o/r/blob/${'b'.repeat(40)}/src/X/Hub.cs) → \`api/hub.md\``);
    expect(md).toContain('`src/X/Gone.cs` → _no page mentions this type_');
    expect(md).toContain('- [ ] `src/content/docs/en-us/api/hub.md`');
  });
});
