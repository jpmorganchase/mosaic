import { merge } from 'lodash';
import type {
  IUnionVolume,
  IVolumeImmutable,
  IVolumeMutable,
  PluginModuleDefinition,
  SerialiserModuleDefinition,
  SourceModuleDefinition
} from '@jpmorganchase/mosaic-types';

import Source from './Source';
import createConfig from './helpers/createConfig';

function logUpdateStatus(sourceId, initOrStartTime) {
  if (initOrStartTime) {
    console.debug(
      `[PullDocs] Source '${sourceId.description}' received first docs snapshot ${
        (new Date().getTime() - initOrStartTime) / 1000
      }s after starting.`
    );
  } else {
    console.debug(`[PullDocs] Source '${sourceId.description}' received updated docs`);
  }
}

export default class SourceManager {
  #sources: Map<symbol, Source> = new Map();
  #plugins: PluginModuleDefinition[];
  #serialisers: SerialiserModuleDefinition[];
  #handlers: Set<(filesystem: IVolumeImmutable, source: Source) => Record<string, unknown>> =
    new Set();
  #globalFilesystem: IUnionVolume;
  #sharedFilesystem: IVolumeMutable;
  #pageExtensions: string[];
  #ignorePages: string[];
  #globalConfig = createConfig();

  constructor(
    globalFilesystem,
    sharedFilesystem,
    plugins = [],
    serialisers = [],
    pageExtensions = [],
    ignorePages = []
  ) {
    this.#plugins = plugins;
    this.#pageExtensions = pageExtensions;
    this.#ignorePages = ignorePages;
    this.#serialisers = serialisers;
    this.#globalFilesystem = globalFilesystem;
    this.#sharedFilesystem = sharedFilesystem;
  }

  onSourceUpdate(callback) {
    const handler = (filesystem: IVolumeImmutable, source: Source) => callback(filesystem, source);

    this.#handlers.add(handler);

    return () => this.#handlers.delete(handler);
  }

  async saveContent(filePath: string, data: unknown): Promise<boolean> {
    let result;

    for (const source of this.#sources.values()) {
      // eslint-disable-next-line no-await-in-loop
      const isSaved = await source.saveContent(filePath, data);
      if (isSaved) {
        result = isSaved;
        break;
      }
    }
    return result;
  }

  getSource(id: symbol) {
    return this.#sources.get(id);
  }

  destroyAll() {
    this.#sources.forEach(source => source.stop());
  }

  addSource(
    sourceDefinition: SourceModuleDefinition,
    options: Record<string, unknown>
  ): Promise<Source> {
    // eslint-disable-next-line no-async-promise-executor
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
        this.#globalFilesystem
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
            this.#globalConfig.setData(
              Array.from(this.#sources.values()).reduce(
                (mergedConfig, { config }) => merge(mergedConfig, config?.data || {}),
                {}
              ),
              true
            );
            source.filesystem.reset();
            source.filesystem.fromJSON(pages);
            // We need to re-apply symlinks in the main thread
            await source.filesystem.symlinksFromJSON(symlinks);

            // After each async operation, we should check if anything has caused the Source to close
            if (!sourceActive) {
              return;
            }

            await source.invokeAfterUpdate(this.#sharedFilesystem, this.#globalConfig);

            // After each async operation, we should check if anything has caused the Source to close
            if (!sourceActive) {
              return;
            }

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
            new Error(`Source '${source.id.description}' silently exited before initialising.`)
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
          return existingSource.requestCacheClear(immutableSourceFilesystem);
        }
        return existingSource;
      })
    );
  }
}
