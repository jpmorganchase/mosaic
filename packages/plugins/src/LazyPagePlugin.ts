import type PluginType from '@pull-docs/types/dist/Plugin';
import fs from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';

// TODO: Not yet complete! Do not use.
const LazyPagePlugin: PluginType<
  { aliases: { [key: string]: Set<string> } },
  { cacheDir: string }
> = {
  async $beforeSend(mutableFilesystem, { config, serialiser, pageExtensions }, options) {
    let originalDiskSize = 0;
    let newDiskSize = 0;
    const allPages = await mutableFilesystem.promises.glob(createFileGlob('/**', pageExtensions), {
      onlyFiles: true
    });
    const baseDir = path.join(process.cwd(), options.cacheDir || '.pull-docs-lazy-page-plugin-cache');
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
      const { route, friendlyRoute, title } = page;
      const redactedPage = await serialiser.serialise(String(filePath), {
        route,
        friendlyRoute,
        title,
        path: path.join(baseDir, String(filePath))
      });
      await mutableFilesystem.promises.writeFile(String(filePath), redactedPage);
      newDiskSize += redactedPage.length;
    }

    const reduction = originalDiskSize - newDiskSize;
    console.info(
      `[PullDocs] LazyPagePlugin moved ${((reduction / originalDiskSize) * 100).toFixed(
        2
      )}% of virtual filesystem content to the hard disk. This reduced the virtual filesystem size from ${(
        originalDiskSize / 1000000
      ).toFixed(2)}mb to ${(newDiskSize / 1000000).toFixed(2)}mb (yay!)`
    );
  }
};

function createFileGlob(url, pageExtensions) {
  if (pageExtensions.length === 1) {
    return `${url}${pageExtensions[0]}`;
  }
  return `${url}{${pageExtensions.join(',')}}`;
}

export default LazyPagePlugin;
