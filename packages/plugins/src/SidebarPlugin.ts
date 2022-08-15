import path from 'path';
import type PluginType from '@pull-docs/types/dist/Plugin';

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
  async $beforeSend(mutableFilesystem, { config, ignorePages, pageExtensions }, options) {
    const dirs = await mutableFilesystem.promises.glob('**', {
      onlyDirectories: true,
      cwd: '/'
    });
    for (const dirName of dirs) {
      const sidebarFilePath = path.join(String(dirName), options.filename);
      const pages = await mutableFilesystem.promises.glob(
        createFileGlob(['*', '*/index'], pageExtensions),
        {
          onlyFiles: true,
          cwd: String(dirName),
          ignore: ignorePages.map(ignore => `**/${ignore}`)
        }
      );

      if (pages.length) {
        for (let i = 0; i < pages.length; i++) {
          config.setRef(
            sidebarFilePath,
            ['pages', `${i}`, 'title', '$ref'],
            `${pages[i]}#/title`
          );
          config.setRef(
            sidebarFilePath,
            ['pages', `${i}`, 'route', '$ref'],
            `${pages[i]}#/route`
          );
        }

        await mutableFilesystem.promises.writeFile(
          sidebarFilePath,
          '[]'
        );
      }
    }
  }
};

export default SidebarPlugin;

function createFileGlob(patterns, pageExtensions) {
  if (Array.isArray(patterns)) {
    return patterns.map(pattern => createFileGlob(pattern, pageExtensions));
  }
  if (pageExtensions.length === 1) {
    return `${patterns}${pageExtensions[0]}`;
  }
  return `${patterns}{${pageExtensions.join(',')}}`;
}
