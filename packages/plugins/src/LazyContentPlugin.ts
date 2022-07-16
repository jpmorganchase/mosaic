import type PluginType from '@pull-docs/types/dist/Plugin';
import fs from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';

// TODO: Not yet complete! Do not use.
const LazyContentPlugin: PluginType<{ aliases: { [key: string]: Set<string> } }, { cacheDir: string }> =
  {
    async $beforeSend(mutableFilesystem, { config, serialiser, pageExtensions }, options) {
      const allFiles = await mutableFilesystem.promises.glob(
        createFileGlob('/**', pageExtensions),
        {
          followSymbolicLinks: false
        }
      );
      const baseDir = path.join(process.cwd(), options.cacheDir || '.pull-docs-cache');
      await fsExtra.ensureDir(baseDir);
      for (const filePath of allFiles) {
        const page = await serialiser.deserialise(
          String(filePath),
          await mutableFilesystem.promises.readFile(String(filePath))
        );
        await fs.promises.mkdir(path.dirname(path.join(baseDir, String(filePath))), {
          recursive: true
        });
        await fs.promises.writeFile(
          path.join(baseDir, String(filePath)),
          await serialiser.serialise(String(filePath), page)
        );
        const { route, friendlyRoute, title } = page;
        await mutableFilesystem.promises.writeFile(
          String(filePath),
          await serialiser.serialise(String(filePath), {
            route,
            friendlyRoute,
            title,
            path: path.join(baseDir, String(filePath))
          })
        );
      }
    }
  };

function createFileGlob(url, pageExtensions) {
  if (pageExtensions.length === 1) {
    return `${url}${pageExtensions[0]}`;
  }
  return `${url}{${pageExtensions.join(',')}}`;
}

export default LazyContentPlugin;
