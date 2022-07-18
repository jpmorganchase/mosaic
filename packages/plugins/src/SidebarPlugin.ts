import path from 'path';
import type PluginType from '@pull-docs/types/dist/Plugin';
import type Page from '@pull-docs/types/dist/Page';

/**
 * Sorts the pages in a folder alphabetically and then exports a JSON file (name: `options.filename`) with the
 * sidebar objects for each of those pages.
 */
const SidebarPlugin: PluginType<
  {
    dirs: string[];
    refs: { [key: string]: { $$path: (number | string)[]; $$value: string }[] };
  },
  { filename: string }
> = {
  async $beforeSend(mutableFilesystem, { config, serialiser }, options) {
    for (const dirName of await mutableFilesystem.promises.glob('/**', { onlyDirectories: true })) {
      config.setRef(path.join(String(dirName), options.filename), ['pages', '$ref'], `${dirName}/*#/title`);
      config.setRef(
        path.join(String(dirName), options.filename),
        ['pages', '$ref'],
        `${dirName}/*#/friendlyRoute`
      );

      await mutableFilesystem.promises.mkdir(String(dirName), { recursive: true });
      await mutableFilesystem.promises.writeFile(
        path.join(String(dirName), options.filename),
        '[]'
      );
    }
  }
};

export default SidebarPlugin;
