import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import fs from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';
import { TDataOut } from 'memfs';
import { mergePageContent } from './utils/mergePageContent.js';
import { createPageTest } from './utils/createPageTest.js';

function createFileGlob(url, pageExtensions) {
  if (pageExtensions.length === 1) {
    return `${url}${pageExtensions[0]}`;
  }
  return `${url}{${pageExtensions.join(',')}}`;
}

interface LazyPagePluginPage extends Page {
  aliases: { [key: string]: Set<string> };
  hddPaths: { [key: string]: string };
}
interface LazyPagePluginOptions {
  cacheDir?: string;
}

const LazyPagePlugin: PluginType<LazyPagePluginPage, LazyPagePluginOptions> = {
  async afterUpdate(mutableFilesystem, { ignorePages, config, pageExtensions, serialiser }) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

    // This adds a hook that triggers every time a non-cached page is read from the filesystem.
    mutableFilesystem.__internal_do_not_use_addReadFileHook(
      async (pagePath: string, fileData: TDataOut) => {
        // If this is a 'page' - read the original file from disk and try to inject anything that's missing.
        if (isNonHiddenPage(pagePath)) {
          const currentPage = await serialiser.deserialise(pagePath, fileData);
          if (config.data.hddPaths?.[pagePath]) {
            const page = await serialiser.deserialise(
              pagePath,
              await fs.promises.readFile(config.data.hddPaths[pagePath])
            );

            const mergedPage = mergePageContent<LazyPagePluginPage, LazyPagePluginPage>(
              page,
              currentPage
            );

            const completePage = await serialiser.serialise(
              pagePath,
              mergePageContent(mergedPage, { content: page.content })
            );

            return completePage;
          }
        }
        return fileData;
      }
    );
  },
  async $beforeSend(
    mutableFilesystem,
    { config, serialiser, ignorePages, pageExtensions },
    options
  ) {
    const hddPaths = {};
    let originalDiskSize = 0;
    let newDiskSize = 0;
    const allPages = await mutableFilesystem.promises.glob(createFileGlob('**', pageExtensions), {
      ignore: ignorePages.map(ignore => `**/${ignore}`),
      cwd: '/',
      onlyFiles: true
    });

    const baseDir = path.join(process.cwd(), options.cacheDir || '.mosaic-lazy-page-plugin-cache');
    await fsExtra.ensureDir(baseDir);
    for (const filePath of allPages) {
      const rawPage = await mutableFilesystem.promises.readFile(String(filePath));
      const page = await serialiser.deserialise(String(filePath), rawPage);
      originalDiskSize += rawPage.length;
      await fs.promises.mkdir(path.dirname(path.join(baseDir, String(filePath))), {
        recursive: true
      });
      await fs.promises.writeFile(
        path.join(baseDir, String(filePath)),
        await serialiser.serialise(String(filePath), page)
      );
      const { content, ...pageRest } = page;
      hddPaths[String(filePath)] = path.join(baseDir, String(filePath));
      const redactedPage = await serialiser.serialise(String(filePath), pageRest);
      newDiskSize += redactedPage.length;
    }

    config.setData({ hddPaths });

    const reduction = originalDiskSize - newDiskSize;
    console.info(
      `[Mosaic] LazyPagePlugin moved ${((reduction / originalDiskSize) * 100).toFixed(
        2
      )}% of virtual filesystem content to the hard disk. This reduced the virtual filesystem size from ${(
        originalDiskSize / 1000000
      ).toFixed(2)}mb to ${(newDiskSize / 1000000).toFixed(2)}mb (yay!)`
    );
  }
};

export default LazyPagePlugin;
