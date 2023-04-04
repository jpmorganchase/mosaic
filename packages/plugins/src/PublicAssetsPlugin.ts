import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import path from 'node:path';
import fs from 'node:fs';
import fsExtra from 'fs-extra';

interface PublicAssetsPluginOptions {
  /**
   * The directory to copy the assets to
   * @default './public'
   */
  outputDir?: string;
  /**
   * A collection of filenames to copy to the outputDir
   */
  assets?: string[];
}

/**
 * Plugin that finds `assets` in the Mosaic filesytem and copies them to the specified outputDir.
 * Typical use case is for assets like a sitemap
 */
const PublicAssetsPlugin: PluginType<Page, PublicAssetsPluginOptions> = {
  async afterUpdate(_, { sharedFilesystem }, { assets = [], outputDir = './public' }) {
    if (assets.length > 0) {
      await fsExtra.ensureDir(outputDir);

      assets.forEach(async asset => {
        const allFiles = await sharedFilesystem.promises.glob(`**/${asset}`, {
          cwd: '/',
          onlyFiles: true
        });

        if (allFiles?.length > 0) {
          allFiles.forEach(async file => {
            const data = await sharedFilesystem.promises.readFile(file);
            await fs.promises.writeFile(path.posix.join(path.posix.resolve(outputDir), file), data);
          });
        }
      });
    }
  }
};

export default PublicAssetsPlugin;
