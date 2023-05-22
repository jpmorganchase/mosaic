import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import getReadingTime from 'reading-time';
import markdown from 'remark-parse';
import remarkDirective from 'remark-directive';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

type LeafNode = Node & {
  attributes?: any;
};

interface ReadingTimePluginPage extends Page {
  props?: ReturnType<typeof getReadingTime>;
}

/**
 * Calculates reading time for pages and adds to frontmatter
 */
const PropsTablePlugin: PluginType<ReadingTimePluginPage> = {
  async $afterSource(pages) {
    const processor = remark().use(remarkDirective);
    for (const page of pages) {
      const tree: Node = await processor.parse(page.content);

      visit(
        tree,
        node => node.name === 'propsTable',
        (node: LeafNode) => {
          console.log('$afterSource -> node.attributes.source', node.attributes.src);
        }
      );
    }

    return pages;
  }
};

export default PropsTablePlugin;
