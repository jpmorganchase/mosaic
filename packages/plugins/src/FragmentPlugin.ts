import path from 'path';
import type { Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { escapeRegExp } from 'lodash-es';

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

      page.content = await (async () => {
        const contentParts = page.content.split(/(\[\[\s*\.\/[a-zA-Z0-9-_]+\.mdx\s*\]\])/);
        for (let i = 0; i < contentParts.length; i++) {
          const part = contentParts[i];
          const match = part.match(/\[\[\s*\.\/([a-zA-Z0-9-_]+)\.mdx\s*\]\]/);
          if (match) {
            const fragmentFileName = match[1];
            console.log({ match });
            console.log({ fragmentFileName });
            console.log({ fullPath });
            const fragmentFullPath = getFullPath(fullPath, fragmentFileName + '.mdx');
            console.log({ fragmentFullPath });
            if (!isNonHiddenPage(fragmentFullPath)) {
              console.warn(`Invalid file reference: '${fragmentFileName}'. Skipping.`);
            } else {
              const fragmentPage = await serialiser.deserialise(
                fragmentFullPath,
                await mutableFilesystem.promises.readFile(fragmentFullPath)
              );
              contentParts[i] = fragmentPage.content;
            }
          }
        }
        return contentParts.join('');
      })();

      const updatedFileData = await serialiser.serialise(fullPath, page);

      await mutableFilesystem.promises.writeFile(fullPath, updatedFileData);
    }
  }
};

export default FragmentPlugin;
