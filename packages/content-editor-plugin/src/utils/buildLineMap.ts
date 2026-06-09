'use client';

/**
 * Maps each line of the serialized markdown back to the top-level
 * Lexical block (`NodeKey`) that produced it.
 *
 * Used by `ErrorHighlightPlugin` to translate a compile error's
 * `line: number` (which refers to a line in the markdown sent to the
 * compiler) into the editor element to highlight.
 *
 * Strategy
 * --------
 * The markdown that hits the MDX compiler is produced by
 * `$convertToMarkdownString(transformers)`. To get the per-block
 * markdown that contributes to the canonical output we reuse that
 * same function once per block via a small trick: it accepts an
 * optional `node` parameter and iterates `node.getChildren()` as the
 * top-level child list. By wrapping each block in a Proxy whose
 * `getChildren()` returns `[block]` we cause exactly one iteration
 * through `exportTopLevelElements(block, ...)` — the very same path
 * the canonical exporter takes for that block — without
 * reimplementing Lexical's internal `exportChildren` /
 * `exportTextFormat` helpers (which are not part of the public API).
 *
 * Lexical's canonical exporter joins consecutive non-empty top-level
 * blocks with a blank line (one `\n` from `output.join('\n')` plus a
 * leading `\n` prepended to every block after the first). We model
 * that boundary explicitly when accumulating line numbers.
 *
 * Robustness
 * ----------
 * If the per-block serializations do not concatenate to the full
 * markdown we already produced (custom transformers, table edge cases,
 * etc.) we abort the mapping and return `null`. Callers should treat
 * `null` as "we can show line/col in the banner but cannot highlight a
 * block" — strictly worse than highlighting, never wrong.
 */
import { $getRoot, type LexicalEditor, type LexicalNode, type NodeKey } from 'lexical';
import { $convertToMarkdownString, type Transformer } from '@lexical/markdown';

export interface LineMap {
  /** 1-based line number → top-level block `NodeKey` containing that line. */
  lineToKey: Map<number, NodeKey>;
  /** The full markdown string this map describes. */
  markdown: string;
}

/**
 * Must run inside an `editor.update()` or `editor.getEditorState().read()`
 * because it walks the live editor tree. `editor` is accepted for
 * signature stability but is currently unused.
 */
export function $buildLineMap(
  transformers: Array<Transformer>,

  _editor: LexicalEditor
): LineMap | null {
  const root = $getRoot();
  const blocks = root.getChildren();
  if (blocks.length === 0) {
    return { lineToKey: new Map(), markdown: '' };
  }

  const perBlock: Array<{ key: NodeKey; markdown: string }> = [];
  for (const block of blocks) {
    // Wrap the block so `(node || $getRoot()).getChildren()` inside
    // `createMarkdownExport` yields `[block]` for this call only. The
    // Proxy forwards every other property/method to the underlying
    // node so any transformer that uses additional node APIs (e.g.
    // `getType`, `isAttached`, parent walking) keeps working against
    // the live tree.
    const wrapper = new Proxy(block, {
      get(target, prop, receiver) {
        if (prop === 'getChildren') {
          return () => [block];
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = Reflect.get(target as any, prop, receiver);
        if (typeof value === 'function') {
          // Re-bind to the underlying target so method internals
          // continue to see the real node state.
          return value.bind(target);
        }
        return value;
      }
    }) as unknown as LexicalNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const md = $convertToMarkdownString(transformers, wrapper as any);
    perBlock.push({ key: block.getKey(), markdown: md });
  }

  // Canonical exporter joins consecutive non-empty top-level blocks
  // with one blank line (`'\n\n'`) — see `createMarkdownExport` in
  // `@lexical/markdown`. Matching that join exactly lets us verify
  // the per-block reassembly produced the same output.
  const joined = perBlock.map(b => b.markdown).join('\n\n');
  const expected = $convertToMarkdownString(transformers);
  if (joined !== expected) {
    // Per-block reassembly diverged from the canonical export — most
    // likely a custom transformer whose output differs depending on
    // surrounding context. Bail out: better no highlight than the
    // wrong one. The error banner still shows the correct line/col,
    // and the "Jump to error" button degrades gracefully via the
    // null-tolerant focus registry.
    return null;
  }

  const lineToKey = new Map<number, NodeKey>();
  let currentLine = 1; // 1-based to match MDX error line numbers
  for (let i = 0; i < perBlock.length; i++) {
    const { key, markdown } = perBlock[i];
    const lineCount = countLines(markdown);
    for (let l = 0; l < lineCount; l++) {
      lineToKey.set(currentLine + l, key);
    }
    currentLine += lineCount;
    if (i < perBlock.length - 1) {
      // The blank-line separator between blocks. Map it to the
      // following block so an error on a join boundary points
      // somewhere actionable rather than disappearing.
      lineToKey.set(currentLine, perBlock[i + 1].key);
      currentLine += 1;
    }
  }

  return { lineToKey, markdown: expected };
}

/** Lines in a string, where the empty string is 1 line. */
function countLines(s: string): number {
  if (s.length === 0) return 1;
  let n = 1;
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) === 10 /* \n */) n++;
  }
  return n;
}
