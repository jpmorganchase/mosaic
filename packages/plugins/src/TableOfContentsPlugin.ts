import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import Slugger from 'github-slugger';
import remarkParse from 'remark-parse';
import { unified, Plugin } from 'unified';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Heading as MarkdownHeading, Root } from 'mdast';

type TOCItem = { level: number; id: string; text: string };

interface TableOfContentsPluginPage extends Page {
  tableOfContents?: TOCItem[];
}
type Rank = MarkdownHeading['depth'];
interface TableOfContentsPluginOptions {
  minRank: Rank;
  maxRank: Rank;
}
interface TableOfContentsPluginConfigData {
  /** Pages with `{meta.*}` tokens that `$afterSource` couldn't resolve, keyed by full path. */
  tableOfContentsUnresolved?: Record<string, true>;
}

const META_TOKEN = /\{\s*meta((?:\.[A-Za-z_$][\w$]*)+)\s*\}/g;

type PageValues = Record<string, unknown>;

const lookup = (page: PageValues, path: string) =>
  path
    .slice(1)
    .split('.')
    .reduce<unknown>(
      (value, key) => (value == null ? undefined : (value as PageValues)[key]),
      page
    );

// Only strings and numbers render as text; React renders nothing for booleans and null.
const asText = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

/**
 * Resolves every `{meta.<path>}` token in a heading against the page.
 *
 * `text` keeps tokens that don't resolve, so authors can spot them in the
 * table of contents. `slugText` drops them instead: they render as nothing,
 * and the heading's `id` is built from its rendered text.
 */
export const resolveHeading = (page: PageValues, heading: string) => {
  let resolved = true;
  const text = heading.replace(META_TOKEN, (token, path) => {
    const value = asText(lookup(page, path));
    if (value === undefined) resolved = false;
    return value ?? token;
  });
  const slugText = heading.replace(META_TOKEN, (_token, path) => asText(lookup(page, path)) ?? '');
  return { text: text.trim(), slugText, resolved };
};

interface Heading {
  depth: number;
  value: string;
  data?: any;
}

export const getHeadings = (root: Root) => {
  const headingList: Heading[] = [];

  visit(root, 'heading', node => {
    const heading: Heading = {
      depth: node.depth,
      value: toString(node, { includeImageAlt: false })
    };

    // Other remark plugins can store arbitrary data
    // inside a node's `data` property, such as a
    // custom heading id.
    const data = node?.data;
    if (data) {
      heading.data = data;
    }

    headingList.push(heading);
  });

  return headingList;
};

const remarkHeadings: Plugin<[], Root> = () => (tree, vfile) => {
  vfile.data.headings = getHeadings(tree);
};

const processor = unified().use(remarkParse).use(remarkStringify).use(remarkHeadings);

async function buildTableOfContents(
  page: TableOfContentsPluginPage,
  { minRank, maxRank }: TableOfContentsPluginOptions
) {
  const vfile = await processor.process(page.content);
  const headings = vfile.data.headings as Heading[];
  // Slug every heading, not only the ones listed, as `rehype-slug` does
  // when it gives the rendered headings their ids. Repeated headings are
  // then numbered the same way in both.
  const slugger = new Slugger();
  const items: TOCItem[] = [];
  let resolved = true;
  for (const heading of headings) {
    const parsed = resolveHeading(page as unknown as PageValues, heading.value);
    const id = slugger.slug(parsed.slugText);
    if (heading.depth < minRank || heading.depth > maxRank) continue;
    resolved &&= parsed.resolved;
    items.push({
      depth: heading.depth,
      level: heading.depth - minRank,
      id,
      text: parsed.text
    } as TOCItem);
  }
  return { items, resolved };
}

/**
 * Calculates table of contents from page headings
 */
const TableOfContentsPlugin: PluginType<
  TableOfContentsPluginPage,
  TableOfContentsPluginOptions,
  TableOfContentsPluginConfigData
> = {
  async $afterSource(pages, { config }, options) {
    const unresolved: Record<string, true> = {};
    for (const page of pages) {
      if (page.content) {
        const { items, resolved } = await buildTableOfContents(page, options);
        page.tableOfContents = items;
        if (!resolved) unresolved[page.fullPath] = true;
      }
    }
    config.setData({ tableOfContentsUnresolved: unresolved });

    return pages;
  },
  /**
   * `$RefPlugin` resolves `$ref`s in its own `$beforeSend`, so a heading such
   * as `{meta.data.card.title}`, where `card` is a `$ref`, can only resolve
   * now. This must run after `$RefPlugin` (priority -1) and before
   * `LazyPagePlugin` (priority -2) moves page content out of the filesystem.
   */
  async $beforeSend(mutableFilesystem, { config, serialiser }, options) {
    for (const fullPath of Object.keys(config.data.tableOfContentsUnresolved ?? {})) {
      const page: TableOfContentsPluginPage = await serialiser.deserialise(
        fullPath,
        await mutableFilesystem.promises.readFile(fullPath)
      );
      if (!page.content) continue;
      const { items } = await buildTableOfContents(page, options);
      page.tableOfContents = items;
      await mutableFilesystem.promises.writeFile(
        fullPath,
        await serialiser.serialise(fullPath, page)
      );
    }
  }
};

export default TableOfContentsPlugin;
