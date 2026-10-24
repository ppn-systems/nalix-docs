import { describe, expect, it } from 'vitest';
import { classifyChanges, collectCitations, citedBy, relevantTokens, renderReport, truncateReport } from '../scripts/drift-report.mjs';

const cls = (body: string, extra = '') => `namespace Nalix.Net;\npublic sealed class Hub\n{\n${extra}\n    public int Count { get; set; } = 5;\n    public void Run() { ${body} }\n}\n`;
const docs = [
  { file: 'api/hub.md', text: 'The `Hub` type.\n\n- `src/Nalix.Net/Hub.cs`\n\n`MaxRetries` is 5.\n```csharp\nhub.Run();\n```\n' },
  { file: 'api/other.md', text: 'See `Hub.Count` and `src/Nalix.Net`.\n' },
];
const entries = (text: string) => new Map([['src/Nalix.Net/Hub.cs', text]]);
const modified = { added: [], removed: [], modified: ['src/Nalix.Net/Hub.cs'] };

describe('Drift report — citations', () => {
  it('maps cited paths to pages, ignoring package-wide citations', () => {
    const c = collectCitations(docs);
    expect([...c.keys()]).toEqual(['src/Nalix.Net/Hub.cs']);
    expect(citedBy('src/Nalix.Net/Hub.cs', c)).toEqual(['api/hub.md']);
    expect(citedBy('src/Nalix.Net/Other.cs', c)).toEqual([]);
  });

  it('matches folder citations to files inside them', () => {
    const c = collectCitations([{ file: 'g.md', text: '`samples/Chat/Server`' }]);
    expect(citedBy('samples/Chat/Server/Program.cs', c)).toEqual(['g.md']);
    expect(citedBy('samples/Chat/ServerX/Program.cs', c)).toEqual([]);
  });
});

describe('Drift report — classification', () => {
  it('flags a public signature change the docs do not show', () => {
    const r = classifyChanges({ changes: modified, oldEntries: entries(cls('')), newEntries: entries(cls('', 'public void Stop() { }')), docs });
    expect(r.api).toHaveLength(1);
    expect(r.api[0].entries).toEqual([{ sign: '+', type: 'Nalix.Net.Hub', signature: 'public void Stop()', ok: false }]);
    expect(r.api[0].pages).toContain('api/hub.md');
  });

  it('recognizes an API change the docs already contain', () => {
    const withDoc = [{ file: 'api/hub.md', text: 'Signature: `public void Stop()`\n`src/Nalix.Net/Hub.cs`' }];
    const r = classifyChanges({ changes: modified, oldEntries: entries(cls('')), newEntries: entries(cls('', 'public void Stop() { }')), docs: withDoc });
    expect(r.api).toHaveLength(0);
    expect(r.reflected).toHaveLength(1);
  });

  it('points at the docs lines that mention a changed or removed member', () => {
    const r = classifyChanges({ changes: modified, oldEntries: entries(cls('', 'public void Old() { }')), newEntries: entries(cls('')), docs: [{ file: 'api/hub.md', text: '`Hub` has `Old` for compat.\n`src/Nalix.Net/Hub.cs`' }] });
    expect(r.api[0].pointers.map((p: { page: string; line: number }) => `${p.page}:${p.line}`)).toEqual(['api/hub.md:1']);
  });

  it('reports a body-only change as behavior only when the page mentions what changed', () => {
    const relevant = classifyChanges({ changes: modified, oldEntries: entries(cls('Go(3);')), newEntries: entries(cls('Go(MaxRetries);')), docs });
    expect(relevant.behavior).toHaveLength(1);
    expect(relevant.behavior[0].tokens).toContain('MaxRetries');
    expect(relevant.behavior[0].pages).toEqual(['api/hub.md']);

    const unrelated = classifyChanges({ changes: modified, oldEntries: entries(cls('Go(3);')), newEntries: entries(cls('Go(3); Cleanup();')), docs });
    expect(unrelated.behavior).toHaveLength(0);
    expect(unrelated.internal).toHaveLength(1);
  });

  it('ignores body changes in files no page cites', () => {
    const r = classifyChanges({ changes: modified, oldEntries: entries(cls('A();')), newEntries: entries(cls('B();')), docs: [{ file: 'x.md', text: 'nothing' }] });
    expect(r.internal).toHaveLength(1);
    expect(r.api.length + r.behavior.length + r.reflected.length).toBe(0);
  });

  it('assumes an API change when the previous version is unavailable', () => {
    const r = classifyChanges({ changes: modified, oldEntries: null, newEntries: entries(cls('')), docs });
    expect(r.api).toHaveLength(1);
    expect(r.api[0].exact).toBe(false);
  });

  it('treats added and removed files by their public surface', () => {
    const added = classifyChanges({ changes: { added: ['src/Nalix.Net/Hub.cs'], removed: [], modified: [] }, oldEntries: new Map(), newEntries: entries(cls('')), docs: [] });
    expect(added.api[0].newTypes).toEqual(['Hub']);
    const removed = classifyChanges({ changes: { added: [], removed: ['src/Nalix.Net/Hub.cs'], modified: [] }, oldEntries: entries(cls('')), newEntries: new Map(), docs: [{ file: 'a.md', text: 'The `Hub` type' }] });
    expect(removed.api[0].removedTypes).toEqual(['Hub']);
  });

  it('ignores generic words and words found in many files when judging relevance', () => {
    const df = new Map([['Connection', 50], ['MaxRetries', 1]]);
    expect(relevantTokens(['Connection MaxRetries return null'], ['Connection MaxRetries'], df)).toEqual(['MaxRetries']);
    expect(relevantTokens(['limit = 4_096;'], ['limit 4096 bytes'], df)).toEqual(['4096', 'limit']);
  });
});

describe('Drift report — rendering', () => {
  it('renders tiers, diff blocks, doc pointers and a page checklist', () => {
    const report = classifyChanges({ changes: modified, oldEntries: entries(cls('', 'public void Old() { }')), newEntries: entries(cls('', 'public void Stop() { }')), docs });
    const md = renderReport({ repo: 'o/r', from: 'a'.repeat(40), to: 'b'.repeat(40), report });
    expect(md).toContain('| 🔴 | Public API changed and the docs do not show it yet | 1 |');
    expect(md).toContain('```diff');
    expect(md).toContain('- public void Old()');
    expect(md).toContain('+ public void Stop()');
    expect(md).toContain('- [ ] `src/content/docs/en-us/api/hub.md`');
    expect(md).toContain(`compare/${'a'.repeat(40)}...${'b'.repeat(40)}`);
  });

  it('truncates without leaving a code fence open', () => {
    const body = `intro\n\`\`\`diff\n${'x\n'.repeat(500)}\`\`\`\nend`;
    const cut = truncateReport(body, 300);
    expect((cut.match(/```/g) ?? []).length % 2).toBe(0);
    expect(cut).toContain('Report truncated');
    expect(truncateReport('short', 300)).toBe('short');
  });
});
