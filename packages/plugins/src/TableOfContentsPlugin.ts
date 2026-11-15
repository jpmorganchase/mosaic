import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import { unified } from 'unified';
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

const processor = unified().use(remarkParse).use(remarkMdx);
const markdownProcessor = unified().use(remarkParse);

async function buildTableOfContents(
  page: TableOfContentsPluginPage,
  { minRank, maxRank }: TableOfContentsPluginOptions
) {
  let root: Root;
  try {
    root = processor.parse(page.content);
  } catch {
    // Invalid MDX is reported by the renderer. Keep collecting headings
    // rather than making one invalid page stop the source's TOC plugin.
    root = markdownProcessor.parse(page.content);
  }
  const headings: MarkdownHeading[] = [];
  visit(root, 'heading', heading => {
    headings.push(heading);
  });
  // Slug every heading, not only the ones listed, as `rehype-slug` does
  // when it gives the rendered headings their ids. Repeated headings are
  // then numbered the same way in both.
  const slug = createHeadingSlugger();
  const items: TOCItem[] = [];
  let resolved = true;
  for (const heading of headings) {
    const parsed = resolveHeading(page as unknown as PageValues, heading);
    const id = slug(parsed.slugText);
    // Even an omitted heading can change the duplicate suffixes of later
    // listed headings once a reference resolves.
    resolved &&= parsed.resolved;
    if (heading.depth < minRank || heading.depth > maxRank) continue;
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
