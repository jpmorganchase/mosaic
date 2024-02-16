import path from 'node:path';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { escapeRegExp } from 'lodash-es';
import getReadingTime from 'reading-time';
import markdown from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

const createPageTest = (ignorePages, pageExtensions) => {
  const extTest = new RegExp(`${pageExtensions.map(ext => escapeRegExp(ext)).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(ignore => escapeRegExp(ignore)).join('|')}$`);
  return file =>
    !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
};

type LeafNode = Node & {
  value?: string;
};

export interface ReadingTimePluginPage extends Page {
  readingTime?: ReturnType<typeof getReadingTime>;
}

/**
 * Calculates reading time of MDX pages and adds to frontmatter
 */
const ReadingTimePlugin: PluginType<ReadingTimePluginPage> = {
  async $afterSource(pages, { ignorePages, pageExtensions }) {
    const processor = unified().use(markdown);

    if (pageExtensions.includes('.mdx')) {
      for (const page of pages) {
        const isNonHiddenPage = createPageTest(ignorePages, ['.mdx']);
        if (!isNonHiddenPage(page.fullPath)) {
          continue;
        }
        const tree: Node = await processor.parse(page.content);
        let textContent = '';

        visit(
          tree,
          node => node.type === 'text' || node.type === 'code',
          function (node: LeafNode) {
            textContent += node.value;
          }
        );
        page.readingTime = getReadingTime(textContent);
      }
    }
    return pages;
  }
};

export default ReadingTimePlugin;
