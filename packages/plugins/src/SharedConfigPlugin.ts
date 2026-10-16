import crypto from 'node:crypto';
import path from 'node:path';
import type { Page, Plugin as PluginType, SourceCapabilities } from '@jpmorganchase/mosaic-types';
import { flatten, isEqual, isPlainObject } from 'lodash-es';
import deepmerge from 'deepmerge';
import { createPageTest } from './utils/createPageTest.js';

/**
 * `deepmerge`'s default `arrayMerge` *concatenates* both sides. The
 * `$afterSource` merge below folds every ancestor's `sharedConfig`
 * into a descendant's, so the default would duplicate (and
 * re-duplicate) any array authored at an upper level once per
 * intermediate ancestor — an array authored at the root of a
 * deeply-nested namespace would end up repeated O(2^N) times in the
 * leaf's `sharedConfig`. On large namespaces with arrays in authored
 * `sharedConfig` blocks that's the difference between "a few KB
 * merged per page" and "exhausts the worker's heap before the next
 * pipeline stage runs".
 *
 * Plugin semantics have always been "child overrides parent" (see the
 * `shared2: 'overwritten 2'` fixture in the unit tests), so picking
 * `source` here is the behaviour the rest of the codebase already
 * expects, and bounds the merged config size to
 * `O(authored config bytes)` rather than
 * `O(authored config bytes × ancestor depth)`.
 */
const sharedConfigMergeOptions: deepmerge.Options = {
  // `deepmerge.Options.arrayMerge` is typed with `any[]` upstream, so
  // we have to thread `any[]` through the parameter list to satisfy
  // the interface — narrower types fail to assign.
  arrayMerge: (_target: any[], source: any[]) => source // eslint-disable-line @typescript-eslint/no-explicit-any
};

function createFileGlob(url, pageExtensions) {
  if (pageExtensions.length === 1) {
    return `${url}${pageExtensions[0]}`;
  }
  return `${url}{${pageExtensions.join(',')}}`;
}

/**
 * https://stackoverflow.com/a/50549047
 * compute inner relative to outer
 * If it's not contained, the first component of the resulting path will be .., so that's what we check for
 */
function isWithin(outer, inner) {
  const outerParentDir = path.posix.resolve(path.posix.dirname(outer), '../');
  const innerParentDir = path.posix.resolve(path.posix.dirname(inner), '../');
  const rel = path.posix.relative(outerParentDir, innerParentDir);
  return !rel.startsWith('../') && rel !== '..';
}

/**
 * Sets `config.sourceCapabilities` in a serialised shared config file to the
 * capabilities the source declared, or removes it when the source declared
 * none. Content can reach the file through `$ref`s that are resolved after
 * `$afterSource`, so this runs on the file itself. Files that don't parse,
 * or have no `config` object, are returned unchanged.
 */
function enforceSourceCapabilities<TData>(
  fileData: TData,
  sourceCapabilities?: SourceCapabilities
): TData | Buffer {
  let sharedConfigFile: unknown;
  try {
    sharedConfigFile = JSON.parse(String(fileData).replace(/^\uFEFF/, ''));
  } catch {
    return fileData;
  }
  if (!isPlainObject(sharedConfigFile)) {
    return fileData;
  }
  const { config } = sharedConfigFile as { config?: unknown };
  if (!isPlainObject(config)) {
    return fileData;
  }
  const { sourceCapabilities: currentCapabilities, ...restConfig } = config as Record<
    string,
    unknown
  >;
  let enforcedConfig: Record<string, unknown>;
  if (sourceCapabilities) {
    if (isEqual(currentCapabilities, sourceCapabilities)) {
      return fileData;
    }
    enforcedConfig = { ...restConfig, sourceCapabilities };
  } else {
    if (!('sourceCapabilities' in (config as object))) {
      return fileData;
    }
    enforcedConfig = restConfig;
  }
  return Buffer.from(JSON.stringify({ ...(sharedConfigFile as object), config: enforcedConfig }));
}

export interface SharedConfigPluginPage extends Page {
  sharedConfig?: Record<string, unknown> & { sourceCapabilities?: SourceCapabilities };
  frameOverrides?: any;
}

export interface SharedConfigPluginOptions {
  filename: string;
}

/**
 * Plugin that crawls the page hierarchy to find the closest `sharedConfig` from any parent index's page metadata.
 * It then exports a JSON file (name: `options.filename`) into each directory with the merged config for that level
 */
const SharedConfigPlugin: PluginType<SharedConfigPluginPage, SharedConfigPluginOptions> = {
  async $afterSource(pages, { ignorePages, pageExtensions, config, namespace }) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

    const indexPages = pages.filter(
      page =>
        path.posix.basename(page.fullPath, path.posix.extname(page.fullPath)) === 'index' &&
        isNonHiddenPage(page.fullPath)
    );

    // Capability flags are identical across every page emitted by a
    // single source instance (core stamps them at source-load time);
    // pick the first non-empty one we see and treat it as the
    // namespace's capability snapshot. An empty object is treated as
    // "no capabilities declared" — sources that opted into nothing
    // skip this seeding entirely so they keep going through the
    // `applyNamespaceSharedConfig` no-config branch below.
    let sourceCapabilities: SourceCapabilities | undefined;
    for (const page of pages) {
      if (page.sourceCapabilities && Object.keys(page.sourceCapabilities).length > 0) {
        sourceCapabilities = page.sourceCapabilities;
        break;
      }
    }

    if (sourceCapabilities) {
      // Read by `afterUpdate`, which enforces the flags on the generated files.
      config.setData({ sharedConfigSourceCapabilities: sourceCapabilities });
    }

    // Every index page carries the source's capability flags in its
    // `sharedConfig`, even when the author didn't define one, so the
    // per-route shared-config endpoint can surface them to the editor.
    // `sourceCapabilities.writable` gates editing, so the value always
    // comes from the source: an authored value is overwritten, or
    // removed when the source declares no capabilities. A `sharedConfig`
    // that isn't an object can't carry capabilities, so it is replaced
    // when the source has some and otherwise left alone.
    for (const page of indexPages) {
      const authoredConfig = isPlainObject(page.sharedConfig) ? page.sharedConfig : undefined;
      if (sourceCapabilities) {
        page.sharedConfig = { ...authoredConfig, sourceCapabilities };
      } else if (authoredConfig && 'sourceCapabilities' in authoredConfig) {
        const { sourceCapabilities: _authoredCapabilities, ...restConfig } = authoredConfig;
        page.sharedConfig = restConfig;
      }
    }

    const indexPagesWithSharedConfig = indexPages.filter(page => page.sharedConfig !== undefined);

    if (indexPagesWithSharedConfig.length === 0 && indexPages.length > 0) {
      const rootPath = indexPages[0].fullPath;
      const applyNamespaceSharedConfig = {
        [`${crypto.randomUUID()}`]: {
          paths: indexPages.map(indexPage => indexPage.fullPath),
          rootPath,
          namespace
        }
      };
      config.setData({ applyNamespaceSharedConfig });
      return pages;
    }

    // Walk each index page's ancestor chain (shallowest → deepest) and
    // fold ancestor sharedConfigs into the page's own. Each page gets a
    // freshly-merged object; the accumulator is *not* shared across
    // pages. Sharing it (or writing it back to `page.sharedConfig`
    // mid-iteration) would make the next page's "own" config alias the
    // accumulator and get re-deepmerged with itself on every ancestor
    // hit, producing the O(2^N) blowup described in the
    // `sharedConfigMergeOptions` comment.
    //
    // Sort ascending by path-segment depth so ancestors always appear
    // before descendants in the list, then merge into a per-page object
    // in a single linear pass per page. Total cost is O(N²) `isWithin`
    // checks (cheap string ops) and O(N × ancestor-depth) deepmerges of
    // bounded-size objects — no exponential growth, no shared mutable
    // state across pages.
    const byDepth = [...indexPagesWithSharedConfig].sort(
      (a, b) => a.fullPath.split('/').length - b.fullPath.split('/').length
    );
    for (const page of byDepth) {
      let merged: Record<string, unknown> | undefined;
      for (const ancestor of byDepth) {
        if (ancestor === page) break; // ancestors only appear before us in depth order
        // `isWithin(outer, inner)` asks "is `inner` inside `outer`?".
        // We want "is `page` inside `ancestor`?", so `ancestor` is the
        // outer arg and `page` is the inner.
        if (isWithin(ancestor.fullPath, page.fullPath) && ancestor.sharedConfig) {
          merged = merged
            ? deepmerge(merged, ancestor.sharedConfig, sharedConfigMergeOptions)
            : { ...ancestor.sharedConfig };
        }
      }
      if (merged && page.sharedConfig) {
        // Child overrides parent. We pass a fresh object as the seed
        // (rather than mutating `merged`) to keep `page.sharedConfig`
        // unaliased from any other page's merged result.
        page.sharedConfig = deepmerge(merged, page.sharedConfig, sharedConfigMergeOptions);
        page.frameOverrides = { $ref: '#/sharedConfig' };
      }
      // If `merged` is undefined the page has no ancestors with a
      // sharedConfig — leave its authored sharedConfig untouched
      // (matches the "shared config is untouched when there is no
      // parent config" assertion in the unit tests).
    }
    return pages;
  },

  async $beforeSend(
    mutableFilesystem,
    { config, serialiser, ignorePages, pageExtensions },
    options
  ) {
    const indexPagePaths = await mutableFilesystem.promises.glob(
      createFileGlob('**/index', pageExtensions),
      {
        ignore: [options.filename, ...flatten(ignorePages.map(ignore => [ignore, `**/${ignore}`]))],
        cwd: '/'
      }
    );

    const sharedConfigFiles: string[] = [];
    const indexPagesWithoutConfig: string[] = [];

    for (const indexPagePath of indexPagePaths) {
      const sharedConfigFile = path.posix.join(
        path.posix.dirname(String(indexPagePath)),
        options.filename
      );

      const page = await serialiser.deserialise(
        String(indexPagePath),
        await mutableFilesystem.promises.readFile(String(indexPagePath))
      );

      if (page.sharedConfig) {
        config.setRef(
          sharedConfigFile,
          ['config', '$ref'],
          `${String(indexPagePath)}#/sharedConfig`
        );
        await mutableFilesystem.promises.writeFile(sharedConfigFile, '{}');
        sharedConfigFiles.push(sharedConfigFile);
      } else {
        indexPagesWithoutConfig.push(page.fullPath);
      }
    }

    // apply closest shared config
    if (sharedConfigFiles.length > 0) {
      let closestSharedConfigIndex = 0;
      for (const pagePath of indexPagesWithoutConfig) {
        for (let i = 0; i < sharedConfigFiles.length; i++) {
          if (isWithin(sharedConfigFiles[i], pagePath)) {
            closestSharedConfigIndex = i;
          }
        }

        const sharedConfigFile = path.posix.join(
          path.posix.dirname(String(pagePath)),
          options.filename
        );

        const closestSharedConfig = path.posix.resolve(
          path.dirname(String(pagePath)),
          sharedConfigFiles[closestSharedConfigIndex]
        );
        config.setAliases(closestSharedConfig, [sharedConfigFile]);
      }
    }
  },
  async afterUpdate(
    mutableFilesystem,
    { sharedFilesystem, globalConfig, namespace, config },
    options
  ) {
    // `$RefPlugin` resolves `$ref`s into the stored files in its
    // `$beforeSend`, after `$afterSource` has run, so a `$ref` can put an
    // authored `sourceCapabilities` back into a shared config file.
    // Enforce the source's own flags whenever one of the files is read.
    const sourceCapabilities = config?.data?.sharedConfigSourceCapabilities as
      | SourceCapabilities
      | undefined;
    mutableFilesystem.__internal_do_not_use_addReadFileHook(async (filePath, fileData) =>
      path.posix.basename(String(filePath)) === options.filename
        ? enforceSourceCapabilities(fileData, sourceCapabilities)
        : fileData
    );

    const { applyNamespaceSharedConfig } = globalConfig.data;

    if (applyNamespaceSharedConfig === undefined) {
      // there is no source that exists that has told us it needs to share a namespace shared-config
      return;
    }

    // find all the entries that match the namespace the plugin is running against
    const namespaceSharedConfigs: {
      paths: string[];
      rootPath: string;
      namespace: string;
    }[] = Object.keys(applyNamespaceSharedConfig)
      .filter(key => applyNamespaceSharedConfig[key].namespace === namespace)
      .map(key => applyNamespaceSharedConfig?.[key] || []);

    for (const namespaceSharedConfig of namespaceSharedConfigs) {
      if (await mutableFilesystem.promises.exists(namespaceSharedConfig.rootPath)) {
        // a source does need a namespace shared config but the source running this plugin is the source that needs it
        // so we don't need to do anything here
        continue;
      }

      for (const applyPath of namespaceSharedConfig.paths) {
        if (!(await sharedFilesystem.promises.exists(applyPath))) {
          sharedFilesystem.promises.mkdir(path.posix.dirname(String(applyPath)), {
            recursive: true
          });
        }
        let parentDir = path.posix.join(path.posix.dirname(String(applyPath)), '../');
        let closestSharedConfigPath = path.posix.join(parentDir, options.filename);

        while (parentDir !== path.posix.sep) {
          // walk up the directories in the path to find the closest shared config file
          closestSharedConfigPath = path.posix.join(parentDir, options.filename);
          if (await mutableFilesystem.promises.exists(closestSharedConfigPath)) {
            break;
          }
          parentDir = path.posix.join(path.posix.dirname(String(closestSharedConfigPath)), '../');
        }

        const aliasSharedConfigPath = path.posix.join(
          path.posix.dirname(String(applyPath)),
          options.filename
        );

        if (
          (await mutableFilesystem.promises.exists(closestSharedConfigPath)) &&
          !(await sharedFilesystem.promises.exists(aliasSharedConfigPath))
        ) {
          console.log(
            `[Mosaic][Plugin-SharedConfig] Source has no shared config. Root index page is: ${namespaceSharedConfig.rootPath}`
          );
          console.log(
            '[Mosaic][Plugin-SharedConfig] Copying shared config ',
            closestSharedConfigPath,
            '-->',
            aliasSharedConfigPath
          );
          // Only sources without capabilities ask for the namespace shared
          // config (sources with capabilities give every index page one),
          // so this source's capabilities must not be copied across.
          await sharedFilesystem.promises.writeFile(
            aliasSharedConfigPath,
            enforceSourceCapabilities(
              await mutableFilesystem.promises.readFile(closestSharedConfigPath)
            )
          );
        }
      }
    }
  }
};

export default SharedConfigPlugin;
