import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import fsExtra from 'fs-extra';
import glob from 'fast-glob';
import path from 'path';
import { escapeRegExp } from 'lodash-es';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';
import { VFile } from 'vfile';

interface DocumentAssetsPluginOptions {
  /**
   * An array of subdirectory globs that could contain assets
   * @default: ['**\/images']
   */
  assetSubDirs?: string[];
  /**
   * The source path, where your docs reside, when the site runs
   */
  srcDir?: string;
  /**
   * The directory to copy matched assets to, typically the site's public directory
   * @default './public'
   */
  outputDir?: string;
  /**
   * The prefix we add to all images in documents, so that it routes to the public directory
   * @default '/images'
   */
  imagesPrefix?: string;
}

function isUrl(assetPath: string): boolean {
  try {
    new URL(assetPath);
    return true;
  } catch (_err) {}
  return false;
}

const createPageTest = (ignorePages: string[], pageExtensions: string[]) => {
  const extTest = new RegExp(`${pageExtensions.map(ext => escapeRegExp(ext)).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(ignore => escapeRegExp(ignore)).join('|')}$`);

  return (file: string) =>
    !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
};

function remarkRewriteImagePaths(newPrefix: string) {
  return (tree: any) => {
    visit(tree, 'image', (node: any) => {
      if (node.url) {
        if (isUrl(node.url) || /^\//.test(node.url)) {
          // Absolute URL or path, do nothing
          return;
        } else {
          const isRelativePath = !isUrl(node.url) && !path.isAbsolute(node.url);
          const assetPath = isRelativePath ? node.url : `./${node.url}`;
          const resolvedPath = path.resolve(path.dirname(newPrefix), assetPath);
          node.url = resolvedPath;
        }
      }
    });
  };
}

/**
 * Plugin that finds assets within the Mosaic filesystem and copies them to the configured `outputDir`.
 * Documents that create relative references to those images, will be re-written to pull the images from the `outputDir`.
 */
const DocumentAssetsPlugin: PluginType<Page, DocumentAssetsPluginOptions> = {
  async afterUpdate(
    _mutableFileSystem,
    _helpers,
    {
      assetSubDirs = [path.join('**', 'images')],
      srcDir = path.join(process.cwd(), 'docs'),
      outputDir = `${path.sep}public`
    }
  ) {
    const resolvedCwd = path.resolve(process.cwd());
    const resolvedSrcDir = path.resolve(srcDir);
    const resolvedOutputDir = path.resolve(outputDir);
    if (!resolvedOutputDir.startsWith(resolvedCwd)) {
      throw new Error(`outputDir must be within the current working directory: ${outputDir}`);
    }

    for (const assetSubDir of assetSubDirs) {
      const resolvedAssetSubDir = path.resolve(resolvedSrcDir, assetSubDir);
      if (!resolvedAssetSubDir.startsWith(resolvedSrcDir)) {
        console.log('ERROR 3');

        throw new Error(`Asset subdirectory must be within srcDir: ${srcDir}`);
      }

      let globbedImageDirs;
      try {
        globbedImageDirs = await glob(assetSubDir, {
          cwd: resolvedSrcDir,
          onlyDirectories: true
        });
        if (globbedImageDirs.length === 0) {
          console.warn(`Warning: No entries found for ${assetSubDir}. It may not exist.`);
          continue;
        }
      } catch (err) {
        console.error(`Error globbing ${assetSubDir} in ${srcDir}:`, err);
        throw err;
      }

      await fsExtra.ensureDir(outputDir);
      for (const globbedImageDir of globbedImageDirs) {
        let imageFiles;
        let globbedPath;
        let rootSrcDir = srcDir;
        let rootOutputDir = outputDir;
        try {
          if (!path.isAbsolute(rootSrcDir)) {
            rootSrcDir = path.resolve(path.join(process.cwd(), srcDir));
          }
          globbedPath = path.join(rootSrcDir, globbedImageDir);
          imageFiles = await fsExtra.promises.readdir(globbedPath);
        } catch (err) {
          console.error(`Error reading directory ${globbedPath}:`, err);
          continue;
        }
        if (!path.isAbsolute(rootOutputDir)) {
          rootOutputDir = path.resolve(path.join(process.cwd(), outputDir));
        }

        for (const imageFile of imageFiles) {
          try {
            const imageSrcPath = path.join(globbedImageDir, imageFile);
            const fullImageSrcPath = path.join(rootSrcDir, imageSrcPath);
            const fullImageDestPath = path.join(rootOutputDir, imageSrcPath);

            await fsExtra.mkdir(path.dirname(fullImageDestPath), { recursive: true });
            const symlinkAlreadyExists = await fsExtra.pathExists(fullImageDestPath);
            if (!symlinkAlreadyExists) {
              await fsExtra.symlink(fullImageSrcPath, fullImageDestPath);
              console.log(`Symlink created: ${fullImageSrcPath} -> ${fullImageDestPath}`);
            }
          } catch (error) {
            console.error(`Error processing ${imageFile}:`, error);
          }
        }
      }
    }
  },
  async $afterSource(
    pages,
    { ignorePages, pageExtensions },
    { imagesPrefix = `${path.sep}images` }
  ) {
    if (!pageExtensions.includes('.mdx')) {
      return pages;
    }
    for (const page of pages) {
      const isNonHiddenPage = createPageTest(ignorePages, ['.mdx']);
      if (!isNonHiddenPage(page.fullPath)) {
        continue;
      }

      const processor = unified()
        .use(remarkParse)
        .use(remarkMdx)
        .use(remarkRewriteImagePaths, path.join(imagesPrefix, page.route))
        .use(remarkStringify);
      await processor
        .process(page.content)
        .then((file: VFile) => {
          page.content = String(file);
        })
        .catch((err: Error) => {
          console.error('Error processing Markdown:', err);
        });
    }
    return pages;
  }
};

export default DocumentAssetsPlugin;
