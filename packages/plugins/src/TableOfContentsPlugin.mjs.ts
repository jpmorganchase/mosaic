import type PluginType from '@jpmorganchase/mosaic-types/dist/Plugin';
import type Page from '@jpmorganchase/mosaic-types/dist/Page';
import { visit } from 'unist-util-visit';
import markdown from 'remark-parse';
import { unified } from 'unified';
import Slugger from 'github-slugger';
import { toString } from 'hast-util-to-string';

type TOCItem = { level: number; id: string; text: string };

/**
 * Calculates table of contents from page headings
 */
const TableOfContentsPlugin: PluginType<{}, { minRank: 2; maxRank: 4 }> = {
  async $afterSource(pages: Page[], {}, { minRank, maxRank }) {
    const processor = unified().use(markdown);
    const slugger = new Slugger();
    for (const page of pages) {
      const tree = await processor.parse(page.content);
      const items: TOCItem[] = [];
      visit(
        tree,
        node => test(node),
        node => {
          const text = toString(node).trim();
          items.push({
            level: node.depth,
            id: slugger.slug(text),
            text: text
          });
        }
      );
      page.tableOfContents = items;
    }

    return pages;

    function test(node) {
      return node.type === 'heading' && isHeadingInRange(node);
    }

    function isHeadingInRange(node) {
      const depth = node.depth;
      if (depth < minRank || depth > maxRank) {
        return false;
      }
      return true;
    }
  }
};

export default TableOfContentsPlugin;
