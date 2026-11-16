import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import deepmerge from 'deepmerge';
import MosaicCore from '@jpmorganchase/mosaic-core';

const SNAPSHOT_IDENTITY_FILE = 'mosaic-snapshot.json';

export default async function build(config, targetDir, options) {
  const scope = options.scope
    ?.split(',')
    .map(namespace => namespace.trim())
    .filter(Boolean);
  if (scope) {
    const missing = scope.filter(
      namespace =>
        !config.sources.some(source => source.namespace === namespace && !source.disabled)
    );
    if (scope.length === 0 || missing.length > 0) {
      throw new Error(
        `Snapshot scope must name enabled source namespaces. No enabled sources for: ${
          missing.join(', ') || '(empty scope)'
        }`
      );
    }
  }
  config = {
    ...config,
    // Strip plugins meant for runtime use only (i.e. `LazyPagePlugin`).
    plugins: config.plugins.filter(({ runTimeOnly }) => !runTimeOnly),
    // Scope before generation so shared artifacts contain only the selected sources.
    sources: config.sources
      .filter(source => !scope || scope.includes(source.namespace))
      .map(source => ({ ...source, options: { ...source.options, cache: false } }))
  };
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
  let markSourcesReady: () => void;
  const sourcesReady = new Promise<void>(resolve => {
    markSourcesReady = resolve;
    if (sourceCount === 0) resolve();
  });
  // Capture fast sources during startup, and count each source only once.
  const unsubscribe = mosaic.onSourceUpdate((_filesystem, source) => {
    updatedSources.add(source.id);
    if (updatedSources.size === sourceCount) markSourcesReady();
  });
  try {
    // Startup also mounts the source volumes. A first update alone is not enough.
    await mosaic.start();
    await sourcesReady;
    const failures = (await mosaic.listSources()).flatMap(source =>
      Object.entries(source.pluginErrors).flatMap(([lifecycle, errors]) =>
        (errors as import('@jpmorganchase/mosaic-types').PluginErrors).map(
          error =>
            `Source '${source.name}', plugin '${
              error.pluginName || error.pluginModulePath
            }' (${lifecycle})${error.fullPath ? ` at '${error.fullPath}'` : ''}: ${
              error.message ?? error.name
            }`
        )
      )
    );
    if (failures.length > 0) {
      throw new Error(
        `[Mosaic] Snapshot failed because plugins recorded errors:\n${failures.join('\n')}`
      );
    }
    // Include the shared filesystem containing sitemap/search/Markdown output.
    const filesystem = mosaic.filesystem;
    const symlinks = filesystem.symlinksToJSON();
    const allFiles = await filesystem.promises.glob('**', {
      cwd: '/',
      onlyFiles: true
    });
    for (const entry of [...allFiles, ...Object.keys(symlinks)]) {
      const normalized = path.posix.normalize(`/${String(entry)}`).toLowerCase();
      if (
        normalized === `/${SNAPSHOT_IDENTITY_FILE}` ||
        normalized.startsWith(`/${SNAPSHOT_IDENTITY_FILE}/`)
      ) {
        throw new Error(
          `Snapshot output '${entry}' conflicts with reserved ${SNAPSHOT_IDENTITY_FILE}`
        );
      }
    }
    for (const filePath of allFiles) {
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
          const allRawFiles = rawFiles.map(fileData => JSON.parse(String(fileData)));
          rawFile = Buffer.from(JSON.stringify(deepmerge.all(allRawFiles)));
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
    for (const alias in symlinks) {
      if (alias.startsWith('/.tags')) continue;
      for (const { target } of symlinks[alias]) {
        if (target.startsWith('/.tags')) continue;
        const aliasPath = path.join(pathDir, alias);
        const targetPath = path.join(pathDir, target);
        await fs.promises.mkdir(path.dirname(aliasPath), { recursive: true });
        await fs.promises.symlink(path.relative(path.dirname(aliasPath), targetPath), aliasPath);
      }
    }
    // Publish identity only after all content and aliases were written.
    // A new generation also invalidates persistent caches at a reused path.
    await fs.promises.writeFile(
      path.join(pathDir, SNAPSHOT_IDENTITY_FILE),
      JSON.stringify({ version: 1, id: randomUUID() }),
      { encoding: 'utf8', flag: 'wx' }
    );
    console.log(`[Mosaic] filesystem for ${sourceCount} source(s) written to disk at '${pathDir}'`);
  } finally {
    unsubscribe();
    await mosaic.stop();
  }
}
