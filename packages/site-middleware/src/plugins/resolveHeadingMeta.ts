import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

export interface ResolveHeadingMetaOptions {
  /** The `meta` value in the MDX scope. Defaults to the parsed frontmatter. */
  meta?: Record<string, unknown>;
}

const HEADING = /^h[1-6]$/;
const META_PATH = /^meta((?:\.[A-Za-z_$][\w$]*)+)$/;

/**
 * Replaces `{meta.<path>}` expressions inside headings with their values.
 *
 * `rehype-slug` builds heading ids from text and ignores expressions, so
 * `## Examples for {meta.title}` got the id `examples-for-` while the
 * `TableOfContentsPlugin` linked to `examples-for-card`. Run this before
 * `rehype-slug` so both slug the same text.
 *
 * The rendered heading is unchanged: at runtime the expression reads the
 * same value from the same `meta`. Only strings and numbers are replaced,
 * because React renders nothing for booleans, `null` or `undefined`.
 */
export const resolveHeadingMeta: Plugin<[ResolveHeadingMetaOptions?], Root> =
  (options = {}) =>
  (tree, file) => {
    const meta = options.meta ?? (file.data as { matter?: Record<string, unknown> }).matter;
    if (!meta || typeof meta !== 'object') return;

    visit(tree, 'element', (heading: Element) => {
      if (!HEADING.test(heading.tagName)) return;
      visit(heading, (node, index, parent) => {
        if ((node.type as string) !== 'mdxTextExpression' || !parent || index === undefined) {
          return;
        }
        const match = META_PATH.exec(String((node as { value?: unknown }).value).trim());
        if (!match) return;
        const value = match[1]
          .slice(1)
          .split('.')
          .reduce<unknown>(
            (current, key) =>
              current == null ? undefined : (current as Record<string, unknown>)[key],
            meta
          );
        if (typeof value === 'string' || typeof value === 'number') {
          parent.children[index] = { type: 'text', value: String(value) };
        }
      });
    });
  };
