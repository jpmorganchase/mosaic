import type PluginType from '@pull-docs/types/dist/Plugin';
import type Page from '@pull-docs/types/dist/Page';
import getReadingTime from 'reading-time';

/**
 * Calculates reading time for pages and adds to frontmatter
 */
const ReadingTimePlugin: PluginType<{}> = {
  async $afterSource(pages: Page[]) {
    const { unified } = await import('unified');
    const { visit } = await import('unist-util-visit');
    const { default: markdown } = await import('remark-parse');

    for (const page of pages) {
      const tree = await unified().use(markdown).parse(page.content);

      let textContent = '';

      visit(
        tree,
        node => node.type === 'text' || node.type === 'code',
        node => {
          textContent += node.value;
        }
      );
      page.readingTime = getReadingTime(textContent);
    }

    return pages;
  }
};

export default ReadingTimePlugin;
