import path from 'node:path';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkDirective from 'remark-directive';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';
import type { RootContent, Root } from 'mdast';
import { TextDirective, LeafDirective, ContainerDirective } from 'mdast-util-directive';
import PluginError from './utils/PluginError.js';
import { createPageTest } from './utils/createPageTest.js';

function isDirective(node: Node): node is TextDirective | LeafDirective | ContainerDirective {
  return (
    node.type === 'containerDirective' ||
    node.type === 'leafDirective' ||
    node.type === 'textDirective'
  );
}

function processFragments(
  tree: Root,
  pages: Page[],
  isNonHiddenPage: (path: string) => boolean,
  fullPath: string
) {
  visit(tree, (node, index, parent) => {
    if (isDirective(node)) {
      if (node.name !== 'fragment') return;
      const attributes = node.attributes ?? {};
      const { src } = attributes;

      if (!src) {
        console.error(
          "[Mosaic][Plugin-Fragment] Fragment directive requires a 'src' attribute. Skipping."
        );
        return;
      }

      const fragmentFullPath = path.posix.join(path.dirname(fullPath), src);
      const isHidden = !isNonHiddenPage(fragmentFullPath);
      const fragmentPage = pages.find(page => page.fullPath === fragmentFullPath);
      if (isHidden || !fragmentPage) {
        console.warn(
          `[Mosaic][Plugin-Fragment] Invalid file reference: '${node.attributes.src}'. Skipping.`
        );
      } else {
        // Create a new node with the content from fragmentPage.content
        const newNode: RootContent = {
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
