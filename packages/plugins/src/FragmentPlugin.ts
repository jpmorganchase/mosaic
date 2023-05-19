import path from 'path';
import type { Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { escapeRegExp } from 'lodash-es';
import { remark } from 'remark';
import remarkDirective from 'remark-directive';
import { visitParents } from 'unist-util-visit-parents';

interface FragmentPluginPage {
  fullPath: string;
  content: string;
}

const createPageTest = (ignorePages, pageExtensions) => {
  const extTest = new RegExp(`${pageExtensions.map(ext => escapeRegExp(ext)).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(ignore => escapeRegExp(ignore)).join('|')}$`);
  return file =>
    !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
};

function getFullPath(fullPath: string, relativePath: string): string {
  const pathSegments = fullPath.split('/');
  const relativeSegments = relativePath.split('/');

  pathSegments.pop();

  for (const segment of relativeSegments) {
    if (segment === '..') {
      pathSegments.pop();
    } else if (segment !== '.') {
      pathSegments.push(segment);
    }
  }
  return pathSegments.join('/');
}

async function processTree(tree, serialiser, mutableFilesystem, fullPath, isNonHiddenPage) {
  const nodesToProcess = [];

  visitParents(tree, (node, ancestors) => {
    if (node.type === 'code') {
      return;
    }

    const match = node.name === 'fragment' && node.attributes.src;
    if (match) {
      const parent = ancestors[ancestors.length - 1];
      const index = parent.children.indexOf(node);
      nodesToProcess.push({ node, parent, index });
    }
  });

  for (const { node, parent, index } of nodesToProcess) {
    const fragmentFullPath = getFullPath(fullPath, node.attributes.src);
    if (!isNonHiddenPage(fragmentFullPath)) {
      console.warn(`Invalid file reference: '${node.attributes.src}'. Skipping.`);
    } else {
      const fragmentPage = await serialiser.deserialise(
        fragmentFullPath,
        await mutableFilesystem.promises.readFile(fragmentFullPath)
      );

      // Create a new node with the content from fragmentPage.content
      const newNode = {
        type: 'html',
        value: fragmentPage.content
      };

      // Replace the original node with the newNode in the tree
      parent.children.splice(index, 1, newNode);
    }
  }
  return tree;
}

const FragmentPlugin: PluginType<FragmentPluginPage, unknown, unknown> = {
  async $beforeSend(mutableFilesystem, { serialiser, ignorePages, pageExtensions }) {
    const pages = await Promise.all(
      (
        (await mutableFilesystem.promises.glob('**', {
          onlyFiles: true,
          ignore: ignorePages.map(ignore => `**/${ignore}`),
          cwd: '/'
        })) as string[]
      ).map(async pagePath => {
        const deserialisedPage = await serialiser.deserialise(
          pagePath,
          await mutableFilesystem.promises.readFile(pagePath)
        );
        return deserialisedPage;
      })
    );

    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

    for (const page of pages) {
      const fullPath = page.fullPath;
      if (!isNonHiddenPage(fullPath)) {
        continue;
      }

      const tree = remark().use(remarkDirective).parse(page.content);
      const processedTree = await processTree(
        tree,
        serialiser,
        mutableFilesystem,
        fullPath,
        isNonHiddenPage
      );

      page.content = remark()
        .data('settings', { fences: true })
        .use(remarkDirective)
        .stringify(processedTree);

      const updatedFileData = await serialiser.serialise(fullPath, page);
      await mutableFilesystem.promises.writeFile(fullPath, updatedFileData);
    }
  }
};

export default FragmentPlugin;
