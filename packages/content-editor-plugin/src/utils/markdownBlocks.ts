/**
 * Top-level markdown block offset helpers used by the editor's mode
 * switcher to translate caret positions between source and WYSIWYG
 * modes (the two surfaces have different selection models, but both
 * agree on the block index of the cursor).
 *
 * A "top-level block" here is anything separated by a blank line —
 * we don't try to parse markdown structure (headings, lists, code
 * fences). Blank-line splitting is the cheapest invariant Lexical's
 * `$convertFromMarkdownString` and `$convertToMarkdownString` agree
 * on for round-tripping, so it's the safest unit for cross-mode
 * cursor preservation.
 */

/**
 * Find the start byte-offset of the Nth top-level block in a
 * markdown body. Returns `markdown.length` when the requested block
 * is past the end (caller seats the caret at end-of-document).
 */
export function blockStartOffset(markdown: string, blockIndex: number): number {
  if (blockIndex <= 0) return 0;
  let seen = 0;
  let i = 0;
  while (i < markdown.length && seen < blockIndex) {
    if (markdown.charCodeAt(i) === 10) {
      let j = i + 1;
      while (j < markdown.length && markdown.charCodeAt(j) === 10) j += 1;
      if (j - i >= 2) {
        seen += 1;
        i = j;
        continue;
      }
    }
    i += 1;
  }
  return i;
}

/**
 * Inverse of {@link blockStartOffset} — count which top-level block
 * a caret at byte-offset `caret` falls in.
 */
export function blockIndexAtOffset(markdown: string, caret: number): number {
  if (caret <= 0) return 0;
  let blocks = 0;
  let i = 0;
  while (i < markdown.length && i < caret) {
    if (markdown.charCodeAt(i) === 10) {
      let j = i + 1;
      while (j < markdown.length && markdown.charCodeAt(j) === 10) j += 1;
      if (j - i >= 2) {
        blocks += 1;
        i = j;
        continue;
      }
    }
    i += 1;
  }
  return blocks;
}
