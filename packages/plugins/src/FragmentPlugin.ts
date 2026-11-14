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
          `[Mosaic][Plugin-Fragment] Fragment directive in '${fullPath}' requires a 'src' attribute. Skipping.`
        );
        return;
      }

      const fragmentFullPath = path.posix.join(path.dirname(fullPath), src);
      const isHidden = !isNonHiddenPage(fragmentFullPath);
      const fragmentPage = pages.find(page => page.fullPath === fragmentFullPath);
      if (isHidden || !fragmentPage) {
        console.warn(
          `[Mosaic][Plugin-Fragment] Invalid file reference in '${fullPath}': '${node.attributes.src}'. Skipping.`
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
    const failures: { fullPath: string; message: string }[] = [];
    for (const page of pages) {
      const { fullPath } = page;
      if (!isNonHiddenPage(fullPath)) {
        continue;
      }
      try {
        const tree = processor.parse(page.content);
        processFragments(tree, pages, isNonHiddenPage, fullPath);
        page.content = processor.stringify(tree);
      } catch (e) {
        // Carry on, so one page that can't be parsed doesn't stop
        // fragments expanding in every page after it.
        failures.push({ fullPath, message: e.message });
      }
    }

    if (failures.length > 0) {
      // Pages are updated in place, so the pages expanded above keep their
      // content even though the plugin reports an error.
      throw new PluginError(
        `Unable to expand fragments in ${failures.length} page(s):\n${failures
          .map(({ fullPath, message }) => `  - ${fullPath}: ${message}`)
          .join('\n')}`,
        failures[0].fullPath
      );
    }

    return pages;
  }
};

export default FragmentPlugin;
