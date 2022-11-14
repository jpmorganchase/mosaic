import path from 'path';
import fs from 'fs';
import type { Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { LocalFolderSourceOptions } from '@jpmorganchase/mosaic-source-local-folder';
import { default as mdxSerialisers } from '@jpmorganchase/mosaic-serialisers/dist/mdx';

export interface LocalFolderSavePluginData {
  markdown: string;
}

const LocalFolderSavePlugin: PluginType = {
  async saveContent(
    filePath,
    data: LocalFolderSavePluginData,
    sourceOptions: LocalFolderSourceOptions,
    { namespace }
  ) {
    const { markdown } = data;
    const { rootDir, prefixDir } = sourceOptions;

    if (namespace !== 'local') {
      // indicate to the Plugin Runner that no save happened
      return false;
    }

    const pathOnDisk = path.posix.join(rootDir, filePath.replace(new RegExp(`${prefixDir}/`), ''));
    const rawPage = await fs.promises.readFile(pathOnDisk);
    const { content, ...metadata } = await mdxSerialisers.deserialise(pathOnDisk, rawPage);
    const updatedPage = { ...metadata, content: markdown };

    await fs.promises.writeFile(
      pathOnDisk,
      await mdxSerialisers.serialise(pathOnDisk, updatedPage)
    );
    return true;
  }
};

export default LocalFolderSavePlugin;
