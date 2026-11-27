import { isArray, mergeWith } from 'lodash-es';
import type {
  IUnionVolume,
  IVolumeImmutable,
  IVolumeMutable,
  PluginModuleDefinition,
  SendSourceWorkflowMessage,
  SerialiserModuleDefinition,
  SourceModuleDefinition,
  SourceSchedule,
  WorkflowDefaultsInput
} from '@jpmorganchase/mosaic-types';

import Source from './Source.js';
import createConfig from './helpers/createConfig.js';
import { findNewPageOwner } from './findNewPageOwner.js';
import { bindPluginMethods } from './plugin/index.js';
import type { SourceGeneration } from './worker/helpers/publishSourceGenerations.js';

function logUpdateStatus(sourceId, initOrStartTime) {
  if (initOrStartTime) {
    console.debug(
      `[Mosaic][Core] '${sourceId.description}' received first docs snapshot ${
        (new Date().getTime() - initOrStartTime) / 1000
      }s after starting.`
    );
  } else {
    console.debug(`[Mosaic][Core] '${sourceId.description}' received updated docs`);
  }
}

export interface WorkflowScope {
  /** Restrict ownership to the same namespaces as the caller's content filesystem. */
  namespaces?: string[];
}

export interface TriggerWorkflowOptions extends WorkflowScope {
  /** `filePath` doesn't exist yet: the workflow will create it. */
  newPage?: boolean;
}

export default class SourceManager {
  #sources: Map<symbol, Source> = new Map();
  #plugins: PluginModuleDefinition[];
  #serialisers: SerialiserModuleDefinition[];
  #handlers: Set<(filesystem: IVolumeImmutable, source: Source) => Record<string, unknown>> =
    new Set();
  #firstUpdateErrorHandlers = new Set<(error: unknown) => void>();
  #globalFilesystem: IUnionVolume;
  #sharedFilesystem: IVolumeMutable;
  #pageExtensions: string[];
  #ignorePages: string[];
  #globalConfig = createConfig();
  #schedule: SourceSchedule;
  #mountedVolumes?: () => readonly IVolumeImmutable[];
  #removalPlugins?: ReturnType<typeof bindPluginMethods>;
  #sourceRemovals: Promise<void> = Promise.resolve();

  constructor(
    globalFilesystem,
    sharedFilesystem,
    plugins = [],
    serialisers = [],
    pageExtensions = [],
    ignorePages = [],
    schedule,
    mountedVolumes?: () => readonly IVolumeImmutable[]
  ) {
    this.#plugins = plugins;
    this.#pageExtensions = pageExtensions;
    this.#ignorePages = ignorePages;
    this.#serialisers = serialisers;
    this.#globalFilesystem = globalFilesystem;
    this.#sharedFilesystem = sharedFilesystem;
    this.#schedule = schedule;
    this.#mountedVolumes = mountedVolumes;
  }

  onSourceUpdate(callback, onFirstUpdateError?: (error: unknown) => void) {
    const handler = (filesystem: IVolumeImmutable, source: Source) => callback(filesystem, source);
    this.#handlers.add(handler);
    if (onFirstUpdateError) this.#firstUpdateErrorHandlers.add(onFirstUpdateError);
    return () => {
      if (onFirstUpdateError) this.#firstUpdateErrorHandlers.delete(onFirstUpdateError);
      return this.#handlers.delete(handler);
    };
  }

  /**
   * Runs workflow `name` on the source that owns `filePath`: the source
   * whose filesystem contains it or, for a page that doesn't exist yet
   * (`newPage`), the source whose `prefixDir` contains it.
   *
   * Resolves once the workflow has finished: `true` when it ran, `false`,
   * after reporting an ERROR, when no source owns the file or the workflow
   * is missing or failed.
   */
  async triggerWorkflow(
    sendWorkflowProgressMessage: SendSourceWorkflowMessage,
    name: string,
    filePath: string,
    data: unknown,
    { newPage = false, namespaces }: TriggerWorkflowOptions = {}
  ): Promise<boolean> {
    const owner = await this.#findWorkflowOwner(name, filePath, newPage, namespaces);
    if (owner) return owner.triggerWorkflow(sendWorkflowProgressMessage, name, filePath, data);
    sendWorkflowProgressMessage(
      newPage ? `No source can create ${filePath}` : `Workflow ${name} not found`,
      'ERROR'
    );
    return false;
  }

  async #findSourceOwner(filePath: string, namespaces?: string[]) {
    if (this.#mountedVolumes) {
      const sourcesByVolume = new Map<IVolumeImmutable, Source>(
        Array.from(this.#sources.values(), source => [source.filesystem, source])
      );
      // unionfs reads the last mounted volume first. Startup completion can
      // differ from source declaration order, so use the live mounted order.
      for (const volume of [...this.#mountedVolumes()].reverse()) {
        if (namespaces && !namespaces.includes(volume.namespace)) continue;
        if (await volume.promises.exists(filePath)) {
          // A source can stop while an asynchronous filesystem check settles.
          if (!this.#mountedVolumes().includes(volume)) continue;
          const owner = sourcesByVolume.get(volume);
          return owner && this.#sources.get(owner.id) === owner ? owner : undefined;
        }
      }
      return undefined;
    }

    for (const source of this.#sources.values()) {
      if (namespaces && !namespaces.includes(source.namespace)) continue;
      if (await source.isOwner(filePath)) return source;
    }
    return undefined;
  }

  async #findWorkflowOwner(
    name: string,
    filePath: string,
    newPage: boolean,
    namespaces?: string[]
  ) {
    if (!newPage) return this.#findSourceOwner(filePath, namespaces);
    const sources = Array.from(this.#sources.values()).filter(
      source => !namespaces || namespaces.includes(source.namespace)
    );
    return findNewPageOwner(sources, filePath, name);
  }

  async getSourceDefinitionForPath(filePath: string, namespaces?: string[]) {
    return (await this.#findSourceOwner(filePath, namespaces))?.moduleDefinition;
  }

  async prepareWorkflow(
    name: string,
    filePath: string,
    input: Omit<WorkflowDefaultsInput, 'route'>,
    { namespaces }: WorkflowScope = {}
  ) {
    const owner = await this.#findWorkflowOwner(
      name,
      filePath,
      input.isNewPage === true,
      namespaces
    );
    if (!owner)
      throw new Error(
        input.isNewPage ? `No source can create ${filePath}` : `Workflow ${name} not found`
      );
    return owner.prepareWorkflow(name, filePath, input);
  }

  getSource(name: string) {
    return Array.from(this.#sources.values()).find(s => s.id.description === name);
  }

  async destroyAll() {
    await Promise.all(Array.from(this.#sources.values(), source => source.stop()));
  }

  destroySource(name: string) {
    const source = this.getSource(name);
    if (source) {
      return source.stop();
    }
    throw new Error(`[Mosaic] source ${name} was not found so can't be stopped`);
  }

  async refreshSource(name: string): Promise<boolean> {
    const source = this.getSource(name);
    if (!source) {
      throw new Error(`[Mosaic] source ${name} was not found so can't be refreshed`);
    }
    return source.refresh();
  }

  addSource(
    sourceDefinition: SourceModuleDefinition,
    options: Record<string, unknown>,
    mountSource?: (source: Source) => void
  ): Promise<Source> {
    return new Promise((resolve, reject) => {
      let sourceActive = false;
      let sourceStarted = false;
      let firstUpdatePending = true;
      const failFirstUpdate = (error: unknown) => {
        if (!firstUpdatePending) return;
        firstUpdatePending = false;
        this.#firstUpdateErrorHandlers.forEach(handler => handler(error));
      };
      // Set by `onError` so the subsequent `onExit` (which always fires
      // on worker termination) doesn't clobber the real diagnostic with
      // a generic "silently exited" placeholder.
      let sourceErrored = false;
      // Watchdog: if the worker hasn't posted its `init` message within
      // `bootTimeoutMs` we reject with an actionable error rather than
      // leaving `mosaic.start()` (and the CLI / Fastify boot) hanging
      // forever. Typical causes are a source plugin doing top-level
      // async work that never settles, an unawaited promise rejection
      // swallowed during module load, or a worker OOM whose `error`
      // event is delayed by the platform. Worst-case before this guard
      // was Node exiting with code 13 ("unsettled top-level await") and
      // no message — surfacing *anything* is strictly better.
      const bootTimeoutMs = Number.parseInt(
        process.env.MOSAIC_SOURCE_BOOT_TIMEOUT_MS ?? '60000',
        10
      );
      const watchdog: NodeJS.Timeout | null =
        Number.isFinite(bootTimeoutMs) && bootTimeoutMs > 0
          ? setTimeout(() => {
              if (!sourceStarted && !sourceErrored) {
                sourceErrored = true;
                reject(
                  new Error(
                    `[Mosaic][Source] '${String(
                      sourceDefinition.modulePath
                    )}' did not post its initial message within ${bootTimeoutMs}ms. ` +
                      `The source worker is likely hung during module load — check for ` +
                      `top-level async work in a plugin/serialiser, missing dependencies, ` +
                      `or raise the limit via MOSAIC_SOURCE_BOOT_TIMEOUT_MS.`
                  )
                );
              }
            }, bootTimeoutMs)
          : null;
      const clearWatchdog = () => {
        if (watchdog) clearTimeout(watchdog);
      };

      const source = new Source(
        {
          // if the source definition does not have a schedule then apply the default
          schedule: sourceDefinition.schedule ? sourceDefinition.schedule : this.#schedule,
          ...sourceDefinition
        },
        {
          ...(sourceDefinition.cache !== undefined && { cache: sourceDefinition.cache }),
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

      const populateSource = (generation: SourceGeneration, fromCache = false) =>
        source.applyGeneration(generation, async () => {
          try {
            this.#rebuildGlobalConfig();
            source.filesystem.reset();
            source.filesystem.fromJSON(generation.pages);
            // We need to re-apply symlinks in the main thread.
            await source.filesystem.symlinksFromJSON(generation.symlinks);
            if (!sourceActive) return false;
            await source.invokeAfterUpdate(this.#sharedFilesystem, this.#globalConfig);
            if (!sourceActive) return false;
            source.filesystem.freeze();
            source.filesystem.clearCache();
            return true;
          } catch (error) {
            if (!fromCache) throw error;
            if (sourceActive) {
              source.filesystem.reset();
              source.config = createConfig();
              this.#rebuildGlobalConfig();
              console.warn(
                `[Mosaic][Core] Could not restore the source cache for '${source.id.description}'`,
                error
              );
            }
            return false;
          }
        });

      source.onUpdate(async generation => {
        if (!sourceActive) {
          reject(
            new Error(
              `[Mosaic][Source] '${source.id.description}' received a message before it was initialised.`
            )
          );
        } else {
          logUpdateStatus(source.id, initOrStartTime);
          initOrStartTime = null;
          try {
            if (!(await populateSource(generation))) return;
            // Release the local volume before waiting on another source's volume.
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
            firstUpdatePending = false;
          } catch (e) {
            console.warn(
              `[Mosaic][Core] Exceptions during source update are currently set to terminate the parent source. Terminating '${String(
                source.id.description
              )}'. See error:`
            );
            console.error('[Mosaic][Core]', e);
            failFirstUpdate(e);
            if (sourceActive) await source.stop();
          }
        }
      });
      source.onError(error => {
        console.error('[Mosaic][Core]', error);
        failFirstUpdate(error);
        if (!sourceStarted) {
          sourceErrored = true;
          clearWatchdog();
          reject(error);
        }
      });
      source.onExit(() => {
        if (!sourceStarted) {
          // Only emit the "silently exited" fallback if no prior
          // `onError` already rejected with the real cause. Node fires
          // both `error` and `exit` on worker failure; without this
          // guard the generic message overwrites the diagnostic.
          if (!sourceErrored) {
            clearWatchdog();
            reject(
              new Error(
                `[Mosaic][Source] '${source.id.description}' silently exited before initialising.`
              )
            );
          }
        }
        failFirstUpdate(
          new Error(`[Mosaic][Source] '${source.id.description}' exited before publishing content.`)
        );
        console.debug(`[Mosaic][Core] '${source.id.description}' closed`);

        this.#sources.delete(source.id);
        const wasActive = sourceActive;
        sourceActive = false;
        if (wasActive) {
          this.#rebuildGlobalConfig();
          // Only opt-in plugins reconcile shared files. Do not replay page
          // mutation hooks against a source whose worker has already exited.
          this.#sourceRemovals = this.#sourceRemovals
            .then(async () => {
              const plugins = await (this.#removalPlugins ??= bindPluginMethods(this.#plugins));
              await plugins.afterSourceRemove?.(this.#sharedFilesystem, {
                globalConfig: this.#globalConfig.asReadOnly()
              });
            })
            .catch(error => console.error('[Mosaic][Core] Shared artifact cleanup failed', error));
        }
      });

      source.onStart(async (cached?: SourceGeneration) => {
        sourceActive = true;
        mountSource?.(source);
        // Cached pages are available at startup. Only a live publication
        // can notify consumers or satisfy a snapshot's first-update wait.
        if (cached) await populateSource(cached, true);
        if (!sourceActive) return;
        sourceStarted = true;
        clearWatchdog();
        console.debug(
          `[Mosaic][Core] '${source.id.description}' started in ${
            new Date().getTime() - initOrStartTime
          }ms - awaiting first docs snapshot`
        );
        initOrStartTime = new Date().getTime();
        resolve(source);
      }, clearWatchdog);

      Promise.resolve(source.start()).catch(error => {
        clearWatchdog();
        this.#sources.delete(source.id);
        failFirstUpdate(error);
        reject(error);
      });
    });
  }

  #rebuildGlobalConfig() {
    this.#globalConfig.setData(
      Array.from(this.#sources.values()).reduce(
        (mergedConfig, { config }) =>
          mergeWith(mergedConfig, config?.data || {}, (objValue, srcValue) =>
            isArray(objValue) ? objValue.concat(srcValue || []) : undefined
          ),
        {}
      ),
      true
    );
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
    const config = source.config;
    const isCurrent = () => this.#sources.get(source.id) === source && source.config === config;
    const siblings = Array.from(this.#sources.values()).filter(
      candidate => candidate !== source && candidate.namespace === source.namespace
    );
    return Promise.all(
      siblings.map(sibling =>
        sibling.requestNamespaceSourceUpdate(
          source.id.description,
          immutableSourceFilesystem,
          this.#sharedFilesystem,
          this.#globalConfig,
          isCurrent
        )
      )
    );
  }

  listSources() {
    return Array.from(this.#sources.values()).map((source, index) => ({
      name: source.id.description,
      pluginErrors: source.pluginErrors,
      index
    }));
  }

  /** Public creation hints, in the same candidate order used by findNewPageOwner. */
  getNewPageSources(namespaces?: string[]) {
    return Array.from(this.#sources.values()).flatMap(source => {
      if (
        (namespaces && !namespaces.includes(source.namespace)) ||
        source.prefixDir === undefined ||
        !source.hasWorkflow('save')
      )
        return [];
      const capabilities = source.config?.data.sourceCapabilities as
        | { writable?: boolean }
        | undefined;
      return [{ prefixDir: source.prefixDir, writable: capabilities?.writable === true }];
    });
  }

  getSourceDefinition(name: string) {
    const source = this.getSource(name);
    if (source) {
      return source.moduleDefinition;
    }
    return undefined;
  }
}
