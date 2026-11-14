export interface HighlightSegment {
  text: string;
  match: boolean;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const termPattern = (terms: string[]) => {
  const alternatives = [...new Set(terms.filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  if (alternatives.length === 0) {
    return undefined;
  }
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
};

/**
 * Splits text into the parts that match `terms` (a search hit's `terms`) and
 * the parts that don't, so a UI can render the matches with `<mark>` without
 * using HTML from the index.
 */
export function highlight(text: string, terms: string[]): HighlightSegment[] {
  const pattern = termPattern(terms);
  if (!pattern || !text) {
    return text ? [{ text, match: false }] : [];
  }
  const segments: HighlightSegment[] = [];
  let last = 0;
  for (const found of text.matchAll(pattern)) {
    const start = found.index ?? 0;
    if (start > last) {
      segments.push({ text: text.slice(last, start), match: false });
    }
    segments.push({ text: found[0], match: true });
    last = start + found[0].length;
  }
  if (last < text.length) {
    segments.push({ text: text.slice(last), match: false });
  }
  return segments;
}

/** The part of `text` around the first match of `terms`, cut at word boundaries. */
export function snippet(text: string, terms: string[], length = 160): string {
  if (text.length <= length) {
    return text;
  }
  const pattern = termPattern(terms);
  const first = pattern ? text.search(pattern) : -1;
  let start = first === -1 ? 0 : Math.max(0, first - Math.floor(length / 3));
  let end = Math.min(text.length, start + length);
  start = Math.max(0, end - length);
  if (start > 0) {
    const space = text.indexOf(' ', start);
    if (space !== -1 && space < first) {
      start = space + 1;
    }
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    if (space > start) {
      end = space;
    }
  }
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}
