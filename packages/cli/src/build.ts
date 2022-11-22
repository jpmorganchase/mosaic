import fs from 'node:fs';
import path from 'node:path';
import fsExtra from 'fs-extra';
import MosaicCore from '@jpmorganchase/mosaic-core';

export default async function build(config, targetDir, options) {
  // Strip out any plugins that are meant for runtime use only (i.e. `LazyPagePlugin`)
  config.plugins = config.plugins.filter(({ runTimeOnly }) => !runTimeOnly);
  // Turn off `cache` for each source
  config.sources = config.sources.map(source => ({
    ...source,
    options: { ...source.options, cache: false }
  }));
  const scope = options.scope && options.scope.split(',');
  const mosaic = new MosaicCore();
  const pathDir = path.posix.join(targetDir, options.name ?? new Date().toISOString());
  await fsExtra.emptyDir(pathDir);
  await mosaic.init(config);
  await mosaic.start();
  // If `scope` arg was used, scope the filesystem to those namespaces
  const filesystem = Array.isArray(scope) ? mosaic.filesystem.scope(scope) : mosaic.filesystem;
  let calls = 0;
  mosaic.onSourceUpdate(async () => {
    try {
      if (++calls === config.sources.length) {
        const symlinks = filesystem.symlinksToJSON();
        const allFiles = await filesystem.promises.glob('**', {
          cwd: '/',
          onlyFiles: true
        });
        for (const filePath of allFiles) {
          // if (dotDirRegExp.test(filePath)) {
          //   continue;
          // }
          const rawFiles = await filesystem.promises.readFile(String(filePath), {
            includeConflicts: true
          });
          const rawFile = rawFiles[0];
          if (rawFiles.length > 1) {
            // TODO: We could join colliding JSON files together. e.g. sidebar.json files
            // if (path.basename(String(filePath)).startsWith('.') && path.extname(String(filePath)) === '.json') {
            //   console.warn(`'${filePath}' returned multiple files at the same location. Since the files were JSON dot files, they were merged using a basic Lodash \`merge\`.`);
            //   rawFile = Buffer.from(JSON.stringify(merge(...rawFiles.map(fileData => JSON.parse(String(fileData))))));
            // } else {
            throw new Error(`'${filePath}' returned multiple files at the same location, this will result in overwritten data in the output. Aborting build.

Try using \`--scope\` to just output certain namespaced sources, or adding a \`prefixDir\` to the source options to move the source files into a separate folder.`);
          }
          //}
          await fs.promises.mkdir(path.dirname(path.join(pathDir, String(filePath))), {
            recursive: true
          });
          await fs.promises.writeFile(path.join(pathDir, String(filePath)), rawFile);
        }
        for (const alias in symlinks) {
          if (alias.startsWith('/.tags')) {
            continue;
          }
          for (const { target } of symlinks[alias]) {
            if (target.startsWith('/.tags')) {
              continue;
            }
            await fsExtra.ensureDir(path.join(pathDir, path.dirname(alias)));

            try {
              const exists = !!(await fs.promises.stat(path.join(pathDir, alias)));
              if (exists) {
                console.error(
                  new Error(
                    `Symlink at '${path.join(pathDir, alias)}' already exists. Aborting build.`
                  )
                );
                process.exit(1);
              }
            } catch {
              await fs.promises.symlink(path.join(pathDir, target), path.join(pathDir, alias));
            }
          }
        }

        console.log(
          `Filesystem for ${
            Array.isArray(scope) ? scope.length : config.sources.length
          } source(s) written to disk at '${pathDir}'`
        );
        mosaic.stop();
      }
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });
}
