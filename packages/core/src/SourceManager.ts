import path from 'path';
import fs from 'fs';

import type SourceModuleDefinition from '@pull-docs/types/dist/SourceModuleDefinition';
import type SerialiserModuleDefinition from '@pull-docs/types/dist/SerialiserModuleDefinition';
import type PluginModuleDefinition from '@pull-docs/types/dist/PluginModuleDefinition';
import type { IUnionVolume, IVolumeImmutable, IVolumeMutable } from '@pull-docs/types/dist/Volume';
import merge from 'lodash/merge';
import { escapeRegExp } from 'lodash';

import Source from './Source';

export default class SourceManager {
  #sources: Map<Symbol, Source> = new Map();
  #plugins: PluginModuleDefinition[];
  #serialisers: SerialiserModuleDefinition[];
  #handlers: Set<(filesystem: IVolumeImmutable, source: Source) => {}> = new Set();
  #globalFileSystem: IUnionVolume;
  #globalVolume: IVolumeMutable;
  #pageExtensions: string[];
  #isNonHiddenPage: (file: string) => boolean;
  #ignorePages: string[];

  constructor(
    plugins = [],
    serialisers = [],
    pageExtensions,
    ignorePages,
    globalFileSystem,
    globalVolume
  ) {
    this.#plugins = plugins;
    this.#pageExtensions = pageExtensions;
    this.#ignorePages = ignorePages;
    this.#serialisers = serialisers;
    this.#globalFileSystem = globalFileSystem;
    this.#globalVolume = globalVolume;
    this.#isNonHiddenPage = createPageTest(ignorePages, pageExtensions);
  }

  onSourceUpdate(callback) {
    const handler = (filesystem: IVolumeImmutable, source: Source) => callback(filesystem, source);

    this.#handlers.add(handler);

    return () => this.#handlers.delete(handler);
  }

  getSource(id: Symbol) {
    return this.#sources.get(id);
  }

  destroyAll() {
    this.#sources.forEach(source => source.stop());
  }

  addSource(
    sourceDefinition: SourceModuleDefinition,
    options: Record<string, unknown>
  ): Promise<Source> {
    return new Promise(async (resolve, reject) => {
      let sourceActive = false;

      const source = new Source(
        sourceDefinition,
        {
          ...sourceDefinition.options,
          ...options
        },
        this.#pageExtensions,
        this.#ignorePages,
        this.#globalFileSystem
      );
      const immutableSourceFilesystem = source.filesystem.asReadOnly();

      let initOrStartTime = new Date().getTime();

      this.#sources.set(source.id, source);

      source.use(this.#plugins, this.#serialisers);

      await source.start();

      source.onUpdate(async ({ pages, symlinks }) => {
        if (!sourceActive) {
          reject(
            new Error(
              `Source '${source.id.description}' received a message before it was initialised.`
            )
          );
        } else {
          logUpdateStatus(source.id, initOrStartTime);
          initOrStartTime = null;

          //
          try {
            source.filesystem.reset();
            source.filesystem.fromJSON(pages);
            // We need to re-apply symlinks in the main thread
            await source.filesystem.symlinksFromJSON(symlinks);

            // After each async operation, we should check if anything has caused the Source to close
            if (!sourceActive) {
              return;
            }

            await source.invokeAfterUpdate(this.#globalVolume);

            // After each async operation, we should check if anything has caused the Source to close
            if (!sourceActive) {
              return;
            }

            // Only add this hook right before we freeze - so content only lazy loads after this point
            source.filesystem.addReadFileHook(async (pagePath, fileData) => {
              // Skip files starting with a .
              // if (path.basename(pagePath).startsWith('.')) {
              //   return fileData;
              // }
              // If this is a 'page' - read the original file from disk and try to inject anything that's missing.
              // This feature ties directly in with the `LazyPagePlugin` - but we couldn't externalise it as the `addReadFileHook`
              // method isn't available to plugins (and we don't want it to be, to avoid last-minute page changes happening)
              if (this.#isNonHiddenPage(pagePath)) {
                const currentPage = await source.serialiser.deserialise(pagePath, fileData);
                if (currentPage.hddPath) {
                  const page = await source.serialiser.deserialise(
                    pagePath,
                    await fs.promises.readFile(currentPage.hddPath)
                  );
                  return await source.serialiser.serialise(
                    pagePath,
                    merge(page, currentPage, { content: page.content })
                  );
                }
              }
              return fileData;
            });
            source.filesystem.freeze();
            source.filesystem.clearCache();

            await this.#updateSources(immutableSourceFilesystem, source);
            this.#invokeUpdateCallbacks(immutableSourceFilesystem, source);
          } catch (e) {
            console.warn(
              `[PullDocs] Exceptions during source update are currently set to terminate the parent source. Terminating '${String(
                source.id.description
              )}'. See error:`
            );
            console.error(e);
            source.stop();
          }
          //
        }
      });
      source.onError(error => {
        console.error(error);
        if (!sourceActive) {
          reject(error);
        }
      });
      source.onExit(() => {
        if (!sourceActive) {
          reject(
            new Error(
              `Source '${source.id.description}' silently exited before initialising.`
            )
          );
        }
        console.debug(`[PullDocs] Source '${source.id.description}' closed`);

        this.#sources.delete(source.id);
        sourceActive = false;
      });
      source.onStart(() => {
        sourceActive = true;
        console.debug(
          `[PullDocs] Source '${source.id.description}' started in ${
            new Date().getTime() - initOrStartTime
          }ms - awaiting first docs snapshot`
        );
        initOrStartTime = new Date().getTime();
        resolve(source);
      });
    });
  }

  #invokeUpdateCallbacks(filesystem: IVolumeImmutable, source: Source) {
    this.#handlers.forEach(callback => callback(filesystem, source));
  }

  #updateSources(immutableSourceFilesystem, source) {
    // Notify other frozen sources that something has changed. If a source's filesystem hasn't been frozen yet - there's no point
    // in notifying it of another source changing, as it hasn't initialised or called `afterUpdate` for the first time yet anyway.
    // No need to do them sequentially - we can fire them all off at once and wait for them all to finish in their own time
    return Promise.all(
      Array.from(this.#sources.values()).map(existingSource => {
        if (existingSource !== source && existingSource.filesystem.frozen) {
          return existingSource.requestUpdate(immutableSourceFilesystem, this.#globalVolume);
        }
      })
    );
  }
}

function logUpdateStatus(sourceId, initOrStartTime) {
  if (initOrStartTime) {
    console.debug(
      `[PullDocs] Source '${sourceId.description}' received first docs snapshot ${
        (new Date().getTime() - initOrStartTime) / 1000
      }s after starting.`
    );
    console.info(`[PullDocs] Source ${String(sourceId)}`);
  } else {
    console.debug(`[PullDocs] Source '${sourceId.description}' received updated docs`);
  }
}

function createPageTest(ignorePages, pageExtensions) {
  const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
  return file => {
    return !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
  };
}
