import type PluginType from '@pull-docs/types/dist/Plugin';
import type Page from '@pull-docs/types/dist/Page';
import getReadingTime from 'reading-time';

const dependencies = Promise.all([
  import('unified'),
  import('unist-util-visit'),
  import('remark-parse')
]);

/**
 * Calculates reading time for pages and adds to frontmatter
 */
const ReadingTimePlugin: PluginType<{}> = {
  async $afterSource(pages: Page[]) {
    const [{ unified }, { visit }, { default: markdown }] = await dependencies;
    
    const processor = unified().use(markdown);
    for (const page of pages) {
      const tree = await processor.parse(page.content);
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
