import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { auditDocs, docDefaultValues, parseSourceDefault, readDocsDir } from '../scripts/docs-audit.mjs';

const index = {
  files: ['src/Nalix.Net/Hub.cs', 'src/Nalix.Net/Options/HubOptions.cs', 'samples/Chat/README.md'],
  types: [
    { name: 'Hub', kind: 'class', namespace: 'Nalix.Net', file: 'src/Nalix.Net/Hub.cs', modifiers: [] },
    { name: 'HubOptions', kind: 'class', namespace: 'Nalix.Net.Options', file: 'src/Nalix.Net/Options/HubOptions.cs', modifiers: [] },
    { name: 'Mode', kind: 'enum', namespace: 'Nalix.Net', file: 'src/Nalix.Net/Hub.cs', modifiers: [] },
    { name: 'Orphan', kind: 'class', namespace: 'Nalix.Net', file: 'src/Nalix.Net/Orphan.cs', modifiers: [] },
    { name: 'RateAttribute', kind: 'class', namespace: 'Nalix.Net', file: 'src/Nalix.Net/Rate.cs', modifiers: [] },
  ],
  internalTypes: [{ name: 'Wheel', kind: 'class', namespace: 'Nalix.Net.Internal', file: 'src/Nalix.Net/Internal/Wheel.cs' }],
  namespaces: ['Nalix.Net', 'Nalix.Net.Options', 'Nalix.Net.Internal'],
  options: {
    HubOptions: {
      namespace: 'Nalix.Net.Options',
      properties: [
        { name: 'Max', type: 'int', default: '2_000' },
        { name: 'Wait', type: 'TimeSpan', default: 'TimeSpan.FromMinutes(5)' },
        { name: 'Fast', type: 'bool', default: 'true' },
      ],
    },
  },
  enums: { Mode: { namespace: 'Nalix.Net', members: ['Fast', 'Slow'] } },
  identifiers: ['HubOptions', 'Fast', 'Slow', 'Connect', 'Orphan', 'Wheel'],
};
const page = (file: string, body: string) => ({ file, text: `---\ntitle: T\n---\n${body}` });
const run = (docs: { file: string; text: string }[]) => auditDocs({ index, docs });
const codes = (docs: { file: string; text: string }[]) => run(docs).map((f: { code: string }) => f.code);
const mention = page('api/all.md', '`Hub` `HubOptions` `Mode` `Orphan` `RateAttribute`');

describe('Docs audit — defaults', () => {
  it('parses plain literals and TimeSpan factories from the source', () => {
    expect(parseSourceDefault('2_000')).toEqual({ kind: 'number', value: 2000 });
    expect(parseSourceDefault('TimeSpan.FromMinutes(5)')).toEqual({ kind: 'time', value: 300 });
    expect(parseSourceDefault('true')).toEqual({ kind: 'bool', value: true });
    expect(parseSourceDefault('SomeConstant')).toBeNull();
  });

  it('reads the many ways docs write a default', () => {
    expect(docDefaultValues('`2_000` (`2000`)', 'number')).toContain(2000);
    expect(docDefaultValues('`00:05:00` (`5m`)', 'time')).toEqual([300, 300]);
    expect(docDefaultValues('1.00:00:00', 'time')).toEqual([86400]);
    expect(docDefaultValues('`true`', 'bool')).toEqual([true]);
  });
});

describe('Docs audit — checks', () => {
  it('A001: flags cited source paths that do not exist, accepts files and folders', () => {
    const ok = page('a.md', '- `src/Nalix.Net/Hub.cs`\n- `src/Nalix.Net`\n- `samples/Chat/README.md`\n- `analyzers/dotnet/cs`');
    expect(codes([mention, ok])).toEqual([]);
    const bad = page('b.md', '- `src/Nalix.Net/Gone.cs`');
    expect(run([mention, bad]).map((f: { code: string; message: string }) => f.code)).toEqual(['A001']);
  });

  it('A002: namespace must exist, and a dedicated page must match the type namespace', () => {
    const unknown = page('x.md', '**Namespace:** `Nalix.Nope`\n**Assembly:** `Nalix.Net`');
    expect(codes([mention, unknown])).toEqual(['A002']);
    const wrong = page('hub.md', '**Namespace:** `Nalix.Net.Options`\n**Assembly:** `Nalix.Net`\n\n`Hub` is the hub. `Hub` again.');
    expect(codes([mention, wrong])).toEqual(['A002']);
    const right = page('hub.md', '**Namespace:** `Nalix.Net`\n**Assembly:** `Nalix.Net`\n\n`Hub` is the hub. `Hub` again.');
    expect(codes([mention, right])).toEqual([]);
    const internalOk = page('wheel.md', '**Namespace:** `Nalix.Net.Internal`\n**Assembly:** `Nalix.Net`\n`Wheel` `Wheel`');
    expect(codes([mention, internalOk])).toEqual([]);
  });

  it('A003/A004: option tables are compared with the Options class', () => {
    const good = page('hub-options.md', '`HubOptions`\n\n| Property | Type | Default |\n| :-- | :-- | :-- |\n| `Max` | `int` | `2_000` (`2000`) |\n| `Wait` | `TimeSpan` | `00:05:00` |\n| `Fast` | `bool` | `true` |');
    expect(codes([mention, good])).toEqual([]);

    const bad = page('hub-options.md', '`HubOptions`\n\n| Property | Type | Default |\n| :-- | :-- | :-- |\n| `Max` | `int` | `1000` |\n| `Wait` | `TimeSpan` | `00:10:00` |\n| `Ghost` | `int` | `1` |');
    const found = run([mention, bad]).map((f: { code: string; message: string }) => `${f.code}:${f.message.match(/`([\w.]+)`/)?.[1]}`);
    expect([...found].sort()).toEqual(['A003:Ghost', 'A003:HubOptions.Fast', 'A004:HubOptions.Max', 'A004:HubOptions.Wait']);
  });

  it('A003/A004: leaves tables about other types alone on non-dedicated pages', () => {
    const other = page('policy.md', '`HubOptions` is the fallback.\n\n```csharp\npublic sealed class RateAttribute { public int Max { get; init; } = -1; }\n```\n\n| Property | Type | Default |\n| :-- | :-- | :-- |\n| `Max` | `int` | `-1` |');
    expect(codes([mention, other])).toEqual([]);
  });

  it('A005/A006: enum members must exist; Type.Member must exist in the source', () => {
    const enums = page('enums.md', '## `Mode`\n\n| Value | Meaning |\n| :-- | :-- |\n| `Fast` | f |\n| `Turbo` | t |');
    expect(run([mention, enums]).map((f: { code: string; message: string }) => `${f.code}:${f.message.match(/`([\w.]+)`/)?.[1]}`)).toEqual(['A005:Mode.Turbo']);
  });

  it('A006: flags stale Type.Member references but not paths, short names or extension-style calls', () => {
    const refs = page('r.md', 'Use `Hub.Connect` and `Mode.Slow`.\n\n- `Hub.Foo.cs`\n- `Hub.Get`\n');
    expect(codes([mention, refs])).toEqual([]);
    const stale = page('r.md', 'Use `Hub.Removed` and `Mode.Turbo`.\n\n```csharp\nvar x = Hub.AlsoGone;\n```');
    expect(run([mention, stale]).map((f: { message: string }) => f.message.match(/`([\w.]+)`/)?.[1])).toEqual(['Hub.Removed', 'Mode.Turbo', 'Hub.AlsoGone']);
  });

  it('A010: reports public types no page mentions', () => {
    const gaps = run([page('x.md', '`Hub` `HubOptions` `Mode` `RateAttribute`')]).filter((f: { code: string }) => f.code === 'A010');
    expect(gaps.map((f: { key: string }) => f.key)).toEqual(['A010||Orphan']);
  });
});

describe('Docs audit — the real docs against the committed API index', () => {
  const root = path.resolve(__dirname, '..');
  const realIndex = JSON.parse(fs.readFileSync(path.join(root, 'source-api-index.json'), 'utf8'));
  const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/docs-audit-baseline.json'), 'utf8'));
  const findings = auditDocs({ index: realIndex, docs: readDocsDir(path.join(root, 'src/content/docs/en-us')) });

  it('has no finding beyond the accepted baseline (docs contradict or miss the Nalix source otherwise)', () => {
    const unexpected = findings.filter((f: { key: string }) => !(f.key in baseline.accepted));
    expect(unexpected.map((f: { code: string; page: string; line: number; message: string }) => `[${f.code}] ${f.page}:${f.line} ${f.message}`)).toEqual([]);
  });

  it('keeps the baseline honest: every accepted entry still applies and has a reason', () => {
    const live = new Set(findings.map((f: { key: string }) => f.key));
    const stale = Object.keys(baseline.accepted).filter((k) => !live.has(k));
    expect(stale).toEqual([]);
    expect(Object.values(baseline.accepted).every((r) => typeof r === 'string' && r.length > 5)).toBe(true);
  });

  it('records which Nalix commit the index and manifest describe', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'source-manifest.json'), 'utf8'));
    expect(realIndex.nalixCommit).toBe(manifest.nalixCommit);
    expect(realIndex.nalixCommit).toMatch(/^[0-9a-f]{40}$/);
  });
});
