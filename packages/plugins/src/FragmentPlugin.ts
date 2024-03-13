import path from 'node:path';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import type { Content, Root } from 'mdast';
import PluginError from './utils/PluginError.js';
import { createPageTest } from './utils/createPageTest.js';

function processFragments(
  tree: Root,
  pages: Page[],
  isNonHiddenPage: (path: string) => boolean,
  fullPath: string
) {
  visit(tree, (node, index, parent) => {
    if (
      node.type === 'containerDirective' ||
      node.type === 'leafDirective' ||
      node.type === 'textDirective'
    ) {
      if (node.name !== 'fragment') return;
      const attributes = node.attributes ?? {};
      const { src } = attributes;

      if (!src) {
        console.error("Fragment directive requires a 'src' attribute. Skipping.");
        return;
      }

      const fragmentFullPath = path.posix.join(path.dirname(fullPath), src);
      const isHidden = !isNonHiddenPage(fragmentFullPath);
      const fragmentPage = pages.find(page => page.fullPath === fragmentFullPath);
      if (isHidden || !fragmentPage) {
        console.warn(`Invalid file reference: '${node.attributes.src}'. Skipping.`);
      } else {
        // Create a new node with the content from fragmentPage.content
        const newNode: Content = {
          type: 'html',
          value: fragmentPage.content
        };
        // Replace the original node with the newNode in the tree
        parent.children.splice(index, 1, newNode);
      }
    }
  });
}

const processor = remark().use(remarkMdx).use(remarkDirective);

const FragmentPlugin: PluginType = {
  async $afterSource(pages, { ignorePages, pageExtensions }) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);
    for (const page of pages) {
      try {
        const { fullPath } = page;
        if (!isNonHiddenPage(fullPath)) {
          continue;
        }

        const tree = processor.parse(page.content);
        processFragments(tree, pages, isNonHiddenPage, page.fullPath);
        page.content = processor.stringify(tree);
      } catch (e) {
        throw new PluginError(e.message, page.fullPath);
      }
    }

    return pages;
  }
};

export default FragmentPlugin;
