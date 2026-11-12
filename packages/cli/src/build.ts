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
  const pathDir = path.posix.join(targetDir, options.name ?? new Date().toISOString());
  const pathDirFromTarget = path.relative(path.resolve(targetDir), path.resolve(pathDir));
  if (
    pathDirFromTarget === '' ||
    pathDirFromTarget === '..' ||
    pathDirFromTarget.startsWith(`..${path.sep}`) ||
    path.isAbsolute(pathDirFromTarget)
  ) {
    throw new Error(
      `Snapshot name '${options.name}' must be a folder inside the output directory '${targetDir}', because that folder is emptied before the build.`
    );
  }

  const mosaic = new MosaicCore(config);

  // Clear out the target directory
  await fs.promises.mkdir(pathDir, { recursive: true });
  const items = await fs.promises.readdir(pathDir);
  await Promise.all(
    items.map(item => fs.promises.rm(path.join(pathDir, item), { recursive: true, force: true }))
  );

  const sourceCount = config.sources.filter(source => !source.disabled).length;
  const updatedSources = new Set<symbol>();
  let startupComplete = false;
  let writingSnapshot = false;
  const writeSnapshot = async () => {
    try {
      if (startupComplete && !writingSnapshot && updatedSources.size === sourceCount) {
        writingSnapshot = true;
        // Scoping copies the mounted source filesystems, so wait until startup
        // has mounted every source before constructing the scoped view.
        const filesystem = Array.isArray(scope)
          ? mosaic.filesystem.scope(scope)
          : mosaic.filesystem;
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
            Array.isArray(scope) ? scope.length : sourceCount
          } source(s) written to disk at '${pathDir}'`
        );
        unsubscribe();
        await mosaic.stop();
      }
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  };

  // A fast source can publish its first snapshot while another source is still
  // starting. Subscribe first, and count sources rather than repeated updates.
  const unsubscribe = mosaic.onSourceUpdate((_filesystem, source) => {
    updatedSources.add(source.id);
    return writeSnapshot();
  });
  try {
    await mosaic.start();
    startupComplete = true;
    await writeSnapshot();
  } catch (error) {
    unsubscribe();
    throw error;
  }
}
