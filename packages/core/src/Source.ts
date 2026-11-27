import EventEmitter from 'events';
import md5 from 'md5';
import { Volume } from 'memfs';
import path from 'path';
import util from 'util';

import type {
  IUnionVolume,
  IVolumeImmutable,
  MutableData,
  Plugin,
  PluginErrors,
  PluginModuleDefinition,
  SendSourceWorkflowMessage,
  Serialiser,
  SerialiserModuleDefinition,
  SourceModuleDefinition,
  SourceSchedule,
  SourceWorkflow,
  WorkflowDefaults,
  WorkflowDefaultsInput
} from '@jpmorganchase/mosaic-types';

import FileAccess from './filesystems/FileAccess.js';
import MutableVolume from './filesystems/MutableVolume.js';
import createConfig from './helpers/createConfig.js';
import createPublicationQueue from './helpers/createPublicationQueue.js';
import { bindPluginMethods, bindSerialiser } from './plugin/index.js';
import WorkerSubscription, { EVENT } from './WorkerSubscription.js';
import type { SourceGeneration } from './worker/helpers/publishSourceGenerations.js';

const WORKER_INIT = Symbol('worker init');

export default class Source {
  #emitter: EventEmitter = new EventEmitter();
  #modulePath: string;
  #plugins: PluginModuleDefinition[] = [];
  #serialisers: SerialiserModuleDefinition[] = [];
  #worker: WorkerSubscription;
  #globalFilesystem: IUnionVolume;
  #pluginApi: Plugin;
  #mergedOptions: Record<string, unknown>;
  #pageExtensions: string[];
  #ignorePages: string[];
  #workflows: SourceWorkflow[] = [];
  #schedule: SourceSchedule;
  #schedulePublication = createPublicationQueue();
  #scheduleVolumeMutation = createPublicationQueue();
  #pendingVolumeMutations = 0;
  #applyingLiveGeneration = false;
  #namespaceWaiters = new Set<() => void>();
  #stopped = true;
  pluginErrors: any = {};

  config: MutableData<Record<string, unknown>>;
  serialiser: Serialiser;
  namespace: string;
  id: symbol;
  filesystem: MutableVolume;
  moduleDefinition: SourceModuleDefinition;

  constructor(
    moduleDefinition: SourceModuleDefinition,
    mergedOptions: Record<string, unknown>,
    pageExtensions: string[],
    ignorePages: string[],
    globalFilesystem: IUnionVolume,
    workflows: SourceWorkflow[] = []
  ) {
    const { modulePath, namespace, schedule } = moduleDefinition;
    this.moduleDefinition = moduleDefinition;
    this.#modulePath = modulePath;
    this.#mergedOptions = mergedOptions;
    this.#globalFilesystem = globalFilesystem;
    this.#ignorePages = ignorePages;
    this.#workflows = workflows;
    this.#schedule = schedule;
    this.namespace = namespace;
    this.id = Symbol(
      `${path.basename(path.dirname(path.resolve(modulePath, '../')))}#${md5(
        util.inspect(this.#mergedOptions, { sorted: true })
      ).substring(0, 8)}`
    );
    this.filesystem = new MutableVolume(new FileAccess(new Volume()), this.namespace);
    this.#pageExtensions = pageExtensions;
  }

  onUpdate(callback) {
    this.#emitter.on(EVENT.UPDATE, callback);

    return () => this.#emitter.off(EVENT.UPDATE, callback);
  }

  onError(callback) {
    this.#emitter.once(EVENT.ERROR, callback);

    return () => this.#emitter.off(EVENT.ERROR, callback);
  }

  onStart(callback, onWorkerInit?: () => void) {
    this.#emitter.once(EVENT.START, callback);
    if (onWorkerInit) this.#emitter.once(WORKER_INIT, onWorkerInit);

    return () => {
      this.#emitter.off(EVENT.START, callback);
      if (onWorkerInit) this.#emitter.off(WORKER_INIT, onWorkerInit);
    };
  }

  onExit(callback) {
    this.#emitter.once(EVENT.EXIT, callback);

    return () => this.#emitter.off(EVENT.EXIT, callback);
  }

  stop() {
    if (this.#worker && this.#worker.closed) {
      throw new Error('Cannot stop source that has not started');
    }
    if (this.#worker) {
      this.#stopped = true;
      return this.#worker.stop();
    } else if (!this.#stopped) {
      // Startup can still be binding its plugin modules when another source
      // fails and a snapshot build stops all sources.
      this.#exit();
    }
    return undefined;
  }

  /**
   * Asks the source to check for changes now instead of waiting for its
   * schedule. Resolves to `false` when the source module has no `refresh`
   * hook. Changed pages arrive through `onUpdate` as usual.
   */
  refresh(): Promise<boolean> {
    if (!this.#worker || this.#worker.closed) {
      return Promise.reject(new Error(`[Mosaic][Source] '${this.id.description}' is not running`));
    }
    return this.#worker.refresh();
  }

  /**
   * Called when another source (not this one) has changed.
   * This source can then ask its plugins if they also want to clear their cache in response to the other source's change.
   */
  async requestCacheClear(updatedSourceFilesystem: IVolumeImmutable) {
    const filesystem = this.filesystem;
    const initTime = new Date().getTime();
    const shouldInvokeAfterUpdate = await this.#pluginApi.shouldClearCache(
      updatedSourceFilesystem,
      {
        globalFilesystem: this.#globalFilesystem,
        pageExtensions: this.#pageExtensions,
        ignorePages: this.#ignorePages,
        serialiser: this.serialiser,
        config: this.config.asReadOnly(),
        namespace: this.namespace
      }
    );
    const timeTaken = new Date().getTime() - initTime;
    if (timeTaken > 400) {
      console.warn(
        `[Mosaic][Core] Lifecycle phase 'shouldClearCache' for source '${this.id.description}' took ${timeTaken}ms to complete. The method is async, so this may not be an accurate measurement of execution time, but consider optimising this method if it is performing intensive operations.`
      );
    }
    if (shouldInvokeAfterUpdate === true && !this.#stopped) {
      filesystem.clearCache();
    }
  }

  async requestNamespaceSourceUpdate(
    namespaceSourceDesc: string,
    updatedSourceFilesystem: IVolumeImmutable,
    sharedFilesystem: IVolumeImmutable,
    globalConfig: MutableData<unknown>,
    { isCurrent, onDeferredMutation }: { isCurrent: () => boolean; onDeferredMutation: () => void }
  ) {
    if (this.#stopped) return;
    const waitForHook = this.filesystem?.frozen && this.#pendingVolumeMutations === 0;
    const coveredByLiveUpdate = this.#applyingLiveGeneration;
    const mutation = this.#mutateVolume(async () => {
      if (this.#stopped || !this.filesystem?.frozen || !isCurrent()) return false;
      return this.#applyNamespaceSourceUpdate(
        namespaceSourceDesc,
        updatedSourceFilesystem,
        sharedFilesystem,
        globalConfig,
        isCurrent
      );
    });
    if (!waitForHook) {
      // A busy receiver can depend on this publication finishing. Defer its
      // hook behind the pending mutations without holding the origin open.
      void mutation
        .then(applied => {
          if (applied && !coveredByLiveUpdate && !this.#stopped) onDeferredMutation();
        })
        .catch(error => console.error('[Mosaic][Core] Namespace update failed', error));
      return;
    }

    let onStop: () => void;
    const stopped = new Promise<void>(resolve => {
      onStop = resolve;
      this.#namespaceWaiters.add(resolve);
    });
    try {
      await Promise.race([mutation, stopped]);
    } finally {
      this.#namespaceWaiters.delete(onStop);
    }
  }

  async #applyNamespaceSourceUpdate(
    namespaceSourceDesc: string,
    updatedSourceFilesystem: IVolumeImmutable,
    sharedFilesystem: IVolumeImmutable,
    globalConfig: MutableData<unknown>,
    isCurrent: () => boolean
  ) {
    const filesystem = this.filesystem;
    const initTime = new Date().getTime();
    const shouldInvokeAfterUpdate = await this.#pluginApi.shouldUpdateNamespaceSources(
      updatedSourceFilesystem,
      {
        globalFilesystem: this.#globalFilesystem,
        pageExtensions: this.#pageExtensions,
        ignorePages: this.#ignorePages,
        serialiser: this.serialiser,
        config: this.config.asReadOnly(),
        namespace: this.namespace
      }
    );
    const timeTaken = new Date().getTime() - initTime;
    if (timeTaken > 400) {
      console.warn(
        `[Mosaic][Core] Lifecycle phase 'shouldUpdateNamespaceSources' for source '${this.id.description}' took ${timeTaken}ms to complete. The method is async, so this may not be an accurate measurement of execution time, but consider optimising this method if it is performing intensive operations.`
      );
    }
    if (shouldInvokeAfterUpdate === true && !this.#stopped && isCurrent()) {
      console.log(
        `[Mosaic][Core] namespace source ${namespaceSourceDesc} updated. Triggering 'afterNamespaceSourceUpdate for ${this.id.description}`
      );
      filesystem.unfreeze();
      try {
        await this.invokeAfterUpdate(sharedFilesystem, globalConfig, 'afterNamespaceSourceUpdate');
      } finally {
        filesystem.freeze();
        filesystem.clearCache();
      }
      return true;
    }
    return false;
  }

  async applyGeneration(
    generation: SourceGeneration,
    populate: () => Promise<boolean>,
    isLive: boolean
  ) {
    this.#applyingLiveGeneration = isLive;
    const applied = await this.#mutateVolume(() => {
      if (this.#stopped) return false;
      this.config = createConfig(generation.data);
      return populate();
    }).finally(() => {
      this.#applyingLiveGeneration = false;
    });
    // Include peer hooks that queued behind this generation before publishing it.
    return applied && this.#scheduleVolumeMutation(() => !this.#stopped);
  }

  #mutateVolume<T>(mutate: () => T | Promise<T>): Promise<T> {
    this.#pendingVolumeMutations++;
    return this.#scheduleVolumeMutation(async () => {
      try {
        return await mutate();
      } finally {
        this.#pendingVolumeMutations--;
      }
    });
  }

  async use(
    plugins: PluginModuleDefinition[] = [],
    serialisers: SerialiserModuleDefinition[] = []
  ) {
    if (this.namespace.startsWith('preview-')) {
      console.log('[Mosaic][Core] Preview source detected, filtering plugins to use.');
      this.#plugins.push(...plugins.filter(plugin => !plugin.previewDisabled));
    } else {
      this.#plugins.push(...plugins);
    }
    this.#serialisers.push(...serialisers);
  }

  async invokeAfterUpdate(sharedFilesystem, globalConfig, lifecycleMethod = 'afterUpdate') {
    const initTime = new Date().getTime();
    await this.#pluginApi[lifecycleMethod](this.filesystem.asRestricted(), {
      globalFilesystem: this.#globalFilesystem,
      sharedFilesystem,
      globalConfig,
      pageExtensions: this.#pageExtensions,
      ignorePages: this.#ignorePages,
      serialiser: this.serialiser,
      config: this.config.asReadOnly(),
      namespace: this.namespace
    });
    const timeTaken = new Date().getTime() - initTime;
    if (timeTaken > 800) {
      console.warn(
        `[Mosaic][Core] Lifecycle phase '${lifecycleMethod}' for source '${
          this.id.description
        }' took ${
          timeTaken / 1000
        }s to complete. The method is async, so this may not be an accurate measurement of execution time, but consider optimising this method if it is performing intensive operations.`
      );
    }
  }

  #exit() {
    this.#stopped = true;
    this.#namespaceWaiters.forEach(resolve => resolve());
    this.#namespaceWaiters.clear();
    this.#emitter.emit(EVENT.EXIT);
    this.#emitter.removeAllListeners();
    this.filesystem = null;
  }

  #queueGeneration(
    worker: WorkerSubscription,
    event: EVENT.START | EVENT.UPDATE,
    generation?: SourceGeneration
  ) {
    // Keep the worker's init and updates in order while peers publish independently.
    void this.#schedulePublication(async () => {
      try {
        if (this.#stopped || this.#worker !== worker) return;
        // Raw listeners preserve one-shot startup subscriptions.
        for (const listener of this.#emitter.rawListeners(event)) {
          if (this.#stopped) return;
          await listener.call(this.#emitter, generation);
        }
      } catch (error) {
        if (!this.#stopped) {
          this.#emitter.emit(EVENT.ERROR, error);
          await this.stop();
        }
      }
    }).catch(error => console.error('[Mosaic][Core] Could not stop source', error));
  }

  #createWorker() {
    const worker = new WorkerSubscription({
      modulePath: this.#modulePath,
      name: this.id.description,
      options: this.#mergedOptions,
      namespace: this.namespace,
      pageExtensions: this.#pageExtensions,
      ignorePages: this.#ignorePages,
      plugins: this.#plugins,
      serialisers: this.#serialisers,
      schedule: this.#schedule
    });
    worker.once(EVENT.ERROR, error => this.#emitter.emit(EVENT.ERROR, error));
    worker.once(EVENT.EXIT, () => this.#exit());
    worker.once(EVENT.START, (message?: { data: SourceGeneration }) => {
      this.#emitter.emit(WORKER_INIT);
      this.#queueGeneration(worker, EVENT.START, message?.data);
    });
    return worker;
  }

  async start() {
    this.#stopped = false;
    this.serialiser = await bindSerialiser(this.#serialisers);
    if (this.#stopped) return;
    this.#pluginApi = await bindPluginMethods(this.#plugins, this.trackPluginErrors.bind(this));
    if (this.#stopped) return;
    this.#worker = this.#createWorker();
    const worker = this.#worker;
    worker.on(EVENT.UPDATE, ({ data: { pages, symlinks, data } }: { data: SourceGeneration }) =>
      this.#queueGeneration(worker, EVENT.UPDATE, { pages, symlinks, data })
    );
    this.#worker.on(EVENT.TRACK, async ({ data: { errors, lifecycleMethod } }) => {
      this.pluginErrors[`${lifecycleMethod}`] = errors;
    });
  }

  async isOwner(filePath: string) {
    const isFileInSource = await this.filesystem.promises.exists(filePath);
    return isFileInSource;
  }

  /**
   * The folder this source's pages are mounted at, without leading or
   * trailing slashes, or `undefined` when the source has no `prefixDir`.
   */
  get prefixDir(): string | undefined {
    const { prefixDir } = this.#mergedOptions;
    return typeof prefixDir === 'string' ? prefixDir.replace(/^\/+|\/+$/g, '') : undefined;
  }

  hasWorkflow(name: string) {
    return this.#workflows.some(workflow => workflow.name === name);
  }

  #findWorkflow(name: string): { workflow: SourceWorkflow } | { error: string } {
    const found = this.#workflows.filter(workflow => workflow.name === name);
    if (found.length === 0) {
      return {
        error: `[Mosaic][Source] workflow ${name} not found for ${this.id.description.toString()}`
      };
    }
    if (found.length > 1) {
      return {
        error: `[Mosaic][Source] multiple workflows with "${name}" found for ${this.id.description.toString()}`
      };
    }
    return { workflow: found[0] };
  }

  /** Inspect public save defaults without running the workflow action. */
  async prepareWorkflow(
    name: string,
    filePath: string,
    input: Omit<WorkflowDefaultsInput, 'route'>
  ): Promise<WorkflowDefaults> {
    const found = this.#findWorkflow(name);
    if ('error' in found) throw new Error(found.error);
    const { workflow } = found;
    return workflow.prepare
      ? workflow.prepare(this.#mergedOptions, workflow.options ?? {}, filePath, input)
      : { supportsCommitMessage: false };
  }

  /**
   * Runs workflow `name` and resolves once it has finished: `true` when
   * it ran, `false` (after reporting an ERROR) when it is missing,
   * ambiguous or failed. Never rejects.
   */
  async triggerWorkflow(
    sendWorkflowProgressMessage: SendSourceWorkflowMessage,
    name: string,
    filePath: string,
    data: unknown
  ): Promise<boolean> {
    const found = this.#findWorkflow(name);
    if ('error' in found) {
      sendWorkflowProgressMessage(found.error, 'ERROR');
      return false;
    }
    const triggeredWorkflow = found.workflow;
    let reportedFailure = false;
    const report: SendSourceWorkflowMessage = (message, status) => {
      if (status === 'ERROR') reportedFailure = true;
      sendWorkflowProgressMessage(message, status);
    };
    try {
      const result = await triggeredWorkflow.action(
        report,
        this.#mergedOptions,
        triggeredWorkflow.options,
        filePath,
        data
      );
      if (result === false && !reportedFailure) {
        report(`[Mosaic][Source] workflow ${name} did not complete`, 'ERROR');
      }
      return result !== false && !reportedFailure;
    } catch (error) {
      // Workflows run outside any request; an uncaught rejection here
      // would take down the whole server, and the caller would never
      // hear back. Report it as an ERROR instead.
      console.error(`[Mosaic][Source] workflow ${name} failed`, error);
      sendWorkflowProgressMessage(
        `[Mosaic][Source] workflow ${name} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'ERROR'
      );
      return false;
    }
  }

  trackPluginErrors(errors: PluginErrors, lifecycleMethod: string) {
    this.pluginErrors[`${lifecycleMethod}`] = errors;
  }
}
