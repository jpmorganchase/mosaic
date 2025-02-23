import fs from 'node:fs';
import path from 'node:path';
import deepmerge from 'deepmerge';
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
  const mosaic = new MosaicCore(config);
  const pathDir = path.posix.join(targetDir, options.name ?? new Date().toISOString());

  // Clear out the target directory
  try {
    const items = await fs.promises.readdir(pathDir);
    await Promise.all(items.map(item => fs.promises.rm(path.join(pathDir, item))));
  } catch {
    await fs.promises.mkdir(pathDir, { recursive: true });
  }

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
          let rawFile = rawFiles[0];
          if (rawFiles.length > 1) {
            // Join colliding JSON files together. e.g. sidebar.json files
            if (path.posix.extname(String(filePath)) === '.json') {
              console.warn(
                `'${filePath}' returned multiple files at the same location. Since the files were JSON dot files, they were merged using \`deepmerge\`.`
              );
              const allRawFiles: string[] = rawFiles.map(fileData => JSON.parse(String(fileData)));
              rawFile = Buffer.from(JSON.stringify(deepmerge(allRawFiles[0], allRawFiles[1])));
            } else {
              throw new Error(`'${filePath}' returned multiple files at the same location, this will result in overwritten data in the output. Aborting build.

Try using \`--scope\` to just output certain namespaced sources, or adding a \`prefixDir\` to the source options to move the source files into a separate folder.`);
            }
          }
          await fs.promises.mkdir(path.dirname(path.join(pathDir, String(filePath))), {
            recursive: true
          });
          await fs.promises.writeFile(path.join(pathDir, String(filePath)), rawFile);
        }
        const pwd = process.cwd();
        for (const alias in symlinks) {
          if (alias.startsWith('/.tags')) {
            continue;
          }
          for (const { target } of symlinks[alias]) {
            if (target.startsWith('/.tags')) {
              continue;
            }
            await fs.promises.mkdir(path.join(pathDir, path.dirname(alias)), { recursive: true });

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
              const targetPath = path.join(pathDir, target);
              const aliasPath = path.join(pathDir, alias);
              const aliasBasename = path.basename(aliasPath);
              const targetSymlink = path.relative(path.dirname(aliasPath), targetPath);
              process.chdir(path.dirname(aliasPath));
              if (fs.existsSync(aliasBasename)) {
                fs.unlinkSync(aliasBasename);
              }
              await fs.promises.symlink(targetSymlink, aliasBasename);
            }
          }
        }
        process.chdir(pwd);
        console.log(
          `[Mosaic] filesystem for ${
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
