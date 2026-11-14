import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import remarkParse from 'remark-parse';
import { unified, Plugin } from 'unified';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Heading as MarkdownHeading, Root } from 'mdast';
import { createHeadingSlugger, resolveHeading, type PageValues } from './utils/pageOutline.js';

export { resolveHeading };

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
  const slug = createHeadingSlugger();
  const items: TOCItem[] = [];
  let resolved = true;
  for (const heading of headings) {
    const parsed = resolveHeading(page as unknown as PageValues, heading.value);
    const id = slug(parsed.slugText);
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
