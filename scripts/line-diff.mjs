// Dependency-free line diff (LCS) that renders unified-style hunks. Used to show *what* changed in
// a Nalix source file after comments and formatting have been normalized away.

/**
 * @param {string[]} a old lines
 * @param {string[]} b new lines
 * @returns {{ op: ' ' | '-' | '+', line: string }[] | null} null when the changed region is too large
 */
export function diffLines(a, b, maxCells = 25_000_000) {
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;

  const x = a.slice(head, a.length - tail);
  const y = b.slice(head, b.length - tail);
  if (x.length * y.length > maxCells) return null;

  // LCS table over the changed middle only.
  const w = y.length + 1;
  const table = new Uint32Array((x.length + 1) * w);
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) {
      table[i * w + j] = x[i] === y[j] ? table[(i + 1) * w + j + 1] + 1 : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
    }
  }

  const ops = a.slice(0, head).map((line) => ({ op: ' ', line }));
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) ops.push({ op: ' ', line: x[i++] }), j++;
    else if (i < x.length && (j === y.length || table[(i + 1) * w + j] >= table[i * w + j + 1])) ops.push({ op: '-', line: x[i++] });
    else ops.push({ op: '+', line: y[j++] });
  }
  for (const line of a.slice(a.length - tail)) ops.push({ op: ' ', line });
  return ops;
}

/** Normalized lines: trailing whitespace trimmed, blank lines dropped. */
export const toLines = (text) => text.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() !== '');

/**
 * Unified-style diff of two texts with `context` lines around each change.
 * @returns {{ added: number, removed: number, text: string, changed: string[] }}
 */
export function unifiedDiff(oldText, newText, { context = 2, maxLines = 80 } = {}) {
  const a = toLines(oldText);
  const b = toLines(newText);
  const ops = diffLines(a, b);
  if (!ops) return { added: 0, removed: 0, text: '(change too large to diff inline)', changed: [...a, ...b] };

  const keep = new Array(ops.length).fill(false);
  ops.forEach((o, idx) => {
    if (o.op === ' ') return;
    for (let k = Math.max(0, idx - context); k <= Math.min(ops.length - 1, idx + context); k++) keep[k] = true;
  });

  const lines = [];
  let added = 0;
  let removed = 0;
  let gap = false;
  ops.forEach((o, idx) => {
    if (o.op === '+') added++;
    if (o.op === '-') removed++;
    if (!keep[idx]) return void (gap = lines.length > 0);
    if (gap) lines.push('@@');
    gap = false;
    lines.push(`${o.op}${o.line}`);
  });
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) shown.push(`… ${lines.length - maxLines} more line(s)`);
  return { added, removed, text: shown.join('\n'), changed: ops.filter((o) => o.op !== ' ').map((o) => o.line) };
}
