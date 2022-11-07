import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import Slugger from 'github-slugger';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import remarkStringify from 'remark-stringify';
import remarkHeadings from '@vcarl/remark-headings';
import type { Heading as MarkdownHeading } from 'mdast';

type TOCItem = { level: number; id: string; text: string };

interface TableOfContentsPluginPage extends Page {
  tableOfContents?: TOCItem[];
}
type Rank = MarkdownHeading['depth'];
interface TableOfContentsPluginOptions {
  minRank: Rank;
  maxRank: Rank;
}

/**
 * Calculates table of contents from page headings
 */
const TableOfContentsPlugin: PluginType<TableOfContentsPluginPage, TableOfContentsPluginOptions> = {
  async $afterSource(pages, _, { minRank, maxRank }) {
    const processor = unified().use(remarkParse).use(remarkStringify).use(remarkHeadings);
    for (const page of pages) {
      const slugger = new Slugger();
      if (page.content) {
        const vfile = await processor.process(page.content);
        const headings = vfile.data.headings as [{ depth: number; value: string }];
        const items: TOCItem[] = headings
          .filter(heading => heading.depth >= minRank && heading.depth <= maxRank)
          .map(validHeading => {
            const text = validHeading.value.trim();
            return {
              level: validHeading.depth,
              id: slugger.slug(text),
              text
            };
          });
        page.tableOfContents = items;
      }
    }

    return pages;
  }
};

export default TableOfContentsPlugin;
