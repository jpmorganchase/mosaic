import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import path from 'node:path';
import fs from 'node:fs/promises';

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
      await fs.mkdir(outputDir, { recursive: true });

      await Promise.all(
        assets.map(async asset => {
          const allFiles = await sharedFilesystem.promises.glob(`**/${asset}`, {
            cwd: '/',
            onlyFiles: true
          });

          if (allFiles?.length > 0) {
            await Promise.all(
              allFiles.map(async file => {
                const data = await sharedFilesystem.promises.readFile(file);
                await fs.writeFile(path.posix.join(path.posix.resolve(outputDir), file), data);
              })
            );
          }
        })
      );
    }
  }
};

export default PublicAssetsPlugin;
