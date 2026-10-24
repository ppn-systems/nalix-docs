import { describe, expect, it } from 'vitest';
import { diffLines, unifiedDiff } from '../scripts/line-diff.mjs';

describe('Line diff', () => {
  it('shows removals before additions with context and hunk separators', () => {
    const a = 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj\n';
    const b = 'a\nb\nC\nd\ne\nf\ng\nh\nj\nk\n';
    const d = unifiedDiff(a, b, { context: 1 });
    expect(d.text).toBe(' b\n-c\n+C\n d\n@@\n h\n-i\n j\n+k');
    expect([d.added, d.removed]).toEqual([2, 2]);
    expect(d.changed).toEqual(['c', 'C', 'i', 'k']);
  });

  it('ignores blank lines and trailing whitespace', () => {
    expect(unifiedDiff('a  \n\nb\n', 'a\nb\n').text).toBe('');
  });

  it('truncates long diffs and gives up on huge ones', () => {
    const many = Array.from({ length: 200 }, (_, i) => `line${i}`).join('\n');
    const d = unifiedDiff('', many, { maxLines: 10 });
    expect(d.text.split('\n').length).toBe(11);
    expect(d.text).toContain('more line(s)');
    expect(diffLines(['a', 'b'], ['c', 'd'], 1)).toBeNull();
  });
});
