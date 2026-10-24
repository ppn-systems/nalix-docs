// C# / XML text normalization shared by source-sync (hashing) and api-index (declaration scans).

const isIdent = (c) => c !== undefined && /[\p{L}\p{N}_@]/u.test(c);
const isSpace = (c) => c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '\f' || c === '\v' || c === '\u00a0' || c === '\ufeff';

/**
 * Strips comments and insignificant whitespace from C# source. Literals are copied verbatim,
 * including regular/verbatim/interpolated/raw strings (with nested interpolation holes) and chars.
 * A single space is kept only where two identifier characters would otherwise merge.
 * With `{ layout: true }` whitespace and line breaks are kept as written and comments become a
 * single space, so line-oriented regexes can read declarations (used by the API index).
 */
function scanCSharp(src, layout) {
  const literalRanges = [];
  let i = 0;
  let out = '';
  let pendingSpace = false;
  let lineStart = true; // only whitespace seen since the last newline

  const emit = (text) => {
    if (!layout && pendingSpace && isIdent(out[out.length - 1]) && isIdent(text[0])) out += ' ';
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
        if (layout) out += c;
        pendingSpace = true;
        i++;
        continue;
      }
      if (c === '/' && n === '/') {
        while (i < src.length && src[i] !== '\n') i++;
        if (layout) out += ' ';
        pendingSpace = true;
        continue;
      }
      if (c === '/' && n === '*') {
        const end = src.indexOf('*/', i + 2);
        i = end < 0 ? src.length : end + 2;
        if (layout) out += ' ';
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
    const outStart = out.length;
    const start = i++;
    while (i < src.length && src[i] !== "'" && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
    i++;
    emit(src.slice(start, i));
    literalRanges.push([outStart, out.length]);
  };

  const readString = () => {
    const outStart = out.length;
    readStringInner();
    literalRanges.push([outStart, out.length]);
  };

  const readStringInner = () => {
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
  return { out: layout ? out : out.trim(), literalRanges };
}

export function normalizeCSharp(src, { layout = false } = {}) {
  return scanCSharp(src, layout).out;
}

/**
 * Comment-free text with the original line layout, plus `masked`: the same text (identical length)
 * with every string/char literal blanked, so braces and keywords inside literals cannot confuse
 * structural scans. Slice `text` with indexes found in `masked` to read literal values.
 */
export function layoutCSharp(src) {
  const { out, literalRanges } = scanCSharp(src, true);
  // Interpolation holes can contain literals, so ranges may nest: sort and merge before masking.
  const ranges = literalRanges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let masked = '';
  let last = 0;
  for (const [from, to] of ranges) {
    if (to <= last) continue; // nested inside a range that was already blanked
    const start = Math.max(from, last);
    masked += out.slice(last, start) + out.slice(start, to).replace(/[^\n]/g, ' ');
    last = to;
  }
  masked += out.slice(last);
  return { text: out, masked };
}

/** Strips `<!-- -->` comments and collapses whitespace between tags. */
export function normalizeXml(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

