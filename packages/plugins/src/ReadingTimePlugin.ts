import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import getReadingTime from 'reading-time';
import markdown from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

type LeafNode = Node & {
  value?: string;
};

interface ReadingTimePluginPage extends Page {
  readingTime?: ReturnType<typeof getReadingTime>;
}

/**
 * Calculates reading time for pages and adds to frontmatter
 */
const ReadingTimePlugin: PluginType<ReadingTimePluginPage> = {
  async $afterSource(pages) {
    const processor = unified().use(markdown);
    for (const page of pages) {
      const tree: Node = await processor.parse(page.content);
      let textContent = '';

      visit(
        tree,
        node => node.type === 'text' || node.type === 'code',
        (node: LeafNode) => {
          textContent += node.value;
        }
      );
      page.readingTime = getReadingTime(textContent);
    }

    return pages;
  }
};

export default ReadingTimePlugin;
