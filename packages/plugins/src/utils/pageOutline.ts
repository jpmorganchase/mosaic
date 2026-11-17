import Slugger from 'github-slugger';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import type { Node } from 'unist';

/**
 * Heading helpers shared by `TableOfContentsPlugin` and the search records
 * built by `SearchIndexPlugin`, so table-of-contents links and search
 * results point at the same heading ids. `serializeMdxForClient` gives the
 * rendered headings those ids: it resolves `{meta.*}` the same way, then
 * `rehype-slug` slugs every heading in order with `github-slugger`.
 */

const META_EXPRESSION = /^\s*meta((?:\.[A-Za-z_$][\w$]*)+)\s*$/;
const headingParser = unified().use(remarkParse).use(remarkMdx);

type HeadingNode = Node & { value?: string; children?: HeadingNode[] };

export type PageValues = Record<string, unknown>;

/** Reads a dotted path such as `data.description` from page frontmatter. */
export const lookup = (page: PageValues, path: string) =>
  path
    .replace(/^\./, '')
    .split('.')
    .reduce<unknown>(
      (value, key) => (value == null ? undefined : (value as PageValues)[key]),
      page
    );

// Only strings and numbers render as text; React renders nothing for booleans and null.
export const asText = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

/**
 * Resolves the MDX expressions in a heading against the page. A string is
 * interpreted as inline MDX; callers that have parsed the page can pass
 * the heading node directly. Code and escaped text stay literal.
 *
 * `text` keeps tokens that don't resolve, so authors can spot them in the
 * table of contents. `slugText` drops them instead: they render as nothing,
 * and the heading's `id` is built from its rendered text.
 */
export const resolveHeading = (page: PageValues, heading: string | HeadingNode) => {
  let node: HeadingNode;
  if (typeof heading === 'string') {
    try {
      node = headingParser.parse(`## ${heading}`).children[0] as HeadingNode;
    } catch {
      // Keep the existing best-effort behavior for strings that aren't MDX.
      return { text: heading.trim(), slugText: heading, resolved: true };
    }
  } else {
    node = heading;
  }

  let resolved = true;
  let text = '';
  let slugText = '';
  const read = (child: HeadingNode) => {
    if (child.type === 'text' || child.type === 'inlineCode') {
      text += child.value ?? '';
      slugText += child.value ?? '';
    } else if (child.type === 'mdxTextExpression') {
      const expression = child.value ?? '';
      const path = META_EXPRESSION.exec(expression)?.[1];
      const value = path ? asText(lookup(page, path)) : undefined;
      if (path && value === undefined) resolved = false;
      text += value ?? `{${expression}}`;
      // rehype-slug ignores expressions. Only the meta expressions resolved
      // by resolveHeadingMeta become text in the rendered heading's id.
      slugText += value ?? '';
    } else if (child.type !== 'image') {
      child.children?.forEach(read);
    }
  };
  read(node);
  return { text: text.trim(), slugText, resolved };
};

/**
 * Returns a function that turns heading text into a heading id. Call it for
 * every heading on a page in document order, as `rehype-slug` does, so
 * repeated headings get the same `-1`, `-2` suffixes.
 */
export const createHeadingSlugger = () => {
  const slugger = new Slugger();
  return (slugText: string) => slugger.slug(slugText);
};
