import { isArray, mergeWith } from 'lodash-es';
import type {
  IUnionVolume,
  IVolumeImmutable,
  IVolumeMutable,
  PluginModuleDefinition,
  SendSourceWorkflowMessage,
  SerialiserModuleDefinition,
  SourceModuleDefinition,
  SourceSchedule
} from '@jpmorganchase/mosaic-types';

import Source from './Source.js';
import createConfig from './helpers/createConfig.js';

function logUpdateStatus(sourceId, initOrStartTime) {
  if (initOrStartTime) {
    console.debug(
      `[Mosaic][Source] '${sourceId.description}' received first docs snapshot ${
        (new Date().getTime() - initOrStartTime) / 1000
      }s after starting.`
    );
  } else {
    console.debug(`[Mosaic][Source] '${sourceId.description}' received updated docs`);
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
  #schedule: SourceSchedule;

  constructor(
    globalFilesystem,
    sharedFilesystem,
    plugins = [],
    serialisers = [],
    pageExtensions = [],
    ignorePages = [],
    schedule
  ) {
    this.#plugins = plugins;
    this.#pageExtensions = pageExtensions;
    this.#ignorePages = ignorePages;
    this.#serialisers = serialisers;
    this.#globalFilesystem = globalFilesystem;
    this.#sharedFilesystem = sharedFilesystem;
    this.#schedule = schedule;
  }

  onSourceUpdate(callback) {
    const handler = (filesystem: IVolumeImmutable, source: Source) => callback(filesystem, source);
    this.#handlers.add(handler);
    return () => this.#handlers.delete(handler);
  }

  async triggerWorkflow(
    sendWorkflowProgressMessage: SendSourceWorkflowMessage,
    name: string,
    filePath: string,
    data: unknown
  ) {
    for (const source of this.#sources.values()) {
      // eslint-disable-next-line no-await-in-loop
      if (await source.isOwner(filePath)) {
        source.triggerWorkflow(sendWorkflowProgressMessage, name, filePath, data);
        return;
      }
    }
    sendWorkflowProgressMessage(`Workflow ${name} not found`, 'ERROR');
  }

  getSource(name: string) {
    return Array.from(this.#sources.values()).find(s => s.id.description === name);
  }

  destroyAll() {
    this.#sources.forEach(source => source.stop());
  }

  destroySource(name: string) {
    const source = this.getSource(name);
    if (source) {
      source.stop();
    } else {
      throw new Error(`[Mosaic] source ${name} was not found so can't be stopped`);
    }
  }

  addSource(
    sourceDefinition: SourceModuleDefinition,
    options: Record<string, unknown>
  ): Promise<Source> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      let sourceActive = false;

      const source = new Source(
        {
          // if the source definition does not have a schedule then apply the default
          schedule: sourceDefinition.schedule ? sourceDefinition.schedule : this.#schedule,
          ...sourceDefinition
        },
        {
          ...(sourceDefinition.options as Record<string, unknown>),
          ...options
        },
        this.#pageExtensions,
        this.#ignorePages,
        this.#globalFilesystem,
        sourceDefinition.workflows
      );
      const immutableSourceFilesystem = source.filesystem.asReadOnly();

      let initOrStartTime = new Date().getTime();

      this.#sources.set(source.id, source);

      source.use(this.#plugins, this.#serialisers);

      source.onUpdate(async ({ pages, symlinks }) => {
        if (!sourceActive) {
          reject(
            new Error(
              `[Mosaic][Source] '${source.id.description}' received a message before it was initialised.`
            )
          );
        } else {
          logUpdateStatus(source.id, initOrStartTime);
          initOrStartTime = null;

          //
          try {
            this.#globalConfig.setData(
              Array.from(this.#sources.values()).reduce(
                (mergedConfig, { config }) =>
                  mergeWith(
                    mergedConfig,
                    config?.data || {},
                    function customizer(objValue, srcValue) {
                      if (isArray(objValue)) {
                        // Lodash's default behaviour is to merge array indexes, rather than concatenate arrays
                        return objValue.concat(srcValue || []);
                      }
                      return undefined;
                    }
                  ),
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

            // After each async operation, we should check if anything has caused the Source to close
            if (!sourceActive) {
              return;
            }

            await this.#updateNamespaceSources(immutableSourceFilesystem, source);

            // After each async operation, we should check if anything has caused the Source to close
            if (!sourceActive) {
              return;
            }

            this.#invokeUpdateCallbacks(immutableSourceFilesystem, source);
          } catch (e) {
            console.warn(
              `[Mosaic] Exceptions during source update are currently set to terminate the parent source. Terminating '${String(
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
              `[Mosaic][Source] '${source.id.description}' silently exited before initialising.`
            )
          );
        }
        console.debug(`[Mosaic][Source] '${source.id.description}' closed`);

        this.#sources.delete(source.id);
        sourceActive = false;
      });

      source.onStart(() => {
        sourceActive = true;
        console.debug(
          `[Mosaic][Source] '${source.id.description}' started in ${
            new Date().getTime() - initOrStartTime
          }ms - awaiting first docs snapshot`
        );
        initOrStartTime = new Date().getTime();
        resolve(source);
      });

      await source.start();
    });
  }

  #invokeUpdateCallbacks(filesystem: IVolumeImmutable, source: Source) {
    this.#handlers.forEach(callback => callback(filesystem, source));
  }

  #updateSources(immutableSourceFilesystem: IVolumeImmutable, source: Source) {
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

  #updateNamespaceSources(immutableSourceFilesystem: IVolumeImmutable, source: Source) {
    // Notify other frozen sources that share this sources namespace that something has changed.
    const sourcesToUpdate = Array.from(this.#sources.values()).filter(
      existingSource =>
        existingSource !== source &&
        existingSource.filesystem.frozen &&
        existingSource.namespace === source.namespace
    );

    return Promise.all(
      sourcesToUpdate.map(async sourceToUpdate => {
        await sourceToUpdate.requestNamespaceSourceUpdate(
          source.id.description,
          immutableSourceFilesystem,
          this.#sharedFilesystem,
          this.#globalConfig
        );
      })
    );
  }

  listSources() {
    return Array.from(this.#sources.values()).map((source, index) => ({
      name: source.id.description,
      pluginErrors: source.pluginErrors,
      index
    }));
  }

  getSourceDefinition(name: string) {
    const source = this.getSource(name);
    if (source) {
      return source.moduleDefinition;
    }
    return undefined;
  }
}
