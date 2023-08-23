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
  Serialiser,
  SerialiserModuleDefinition,
  SourceModuleDefinition,
  SourceSchedule,
  SourceWorkflow
} from '@jpmorganchase/mosaic-types';

import FileAccess from './filesystems/FileAccess.js';
import MutableVolume from './filesystems/MutableVolume.js';
import createConfig from './helpers/createConfig.js';
import { bindPluginMethods, bindSerialiser } from './plugin/index.js';
import WorkerSubscription, { EVENT } from './WorkerSubscription.js';

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
  pluginErrors: any = {};

  config: MutableData<Record<string, unknown>>;
  serialiser: Serialiser;
  namespace: string;
  id: symbol;
  filesystem: MutableVolume;

  constructor(
    { modulePath, namespace, schedule }: SourceModuleDefinition,
    mergedOptions: Record<string, unknown>,
    pageExtensions: string[],
    ignorePages: string[],
    globalFilesystem: IUnionVolume,
    workflows: SourceWorkflow[] = []
  ) {
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

  onStart(callback) {
    this.#emitter.once(EVENT.START, callback);

    return () => this.#emitter.off(EVENT.START, callback);
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
      this.#worker.stop();
    }
  }

  /**
   * Called when another source (not this one) has changed.
   * This source can then ask its plugins if they also want to clear their cache in response to the other source's change.
   */
  async requestCacheClear(updatedSourceFilesystem: IVolumeImmutable) {
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
        `Lifecycle phase 'shouldClearCache' for source '${this.id.description}' took ${timeTaken}ms to complete. The method is async, so this may not be an accurate measurement of execution time, but consider optimising this method if it is performing intensive operations.`
      );
    }
    if (shouldInvokeAfterUpdate === true) {
      this.filesystem.clearCache();
    }
  }

  async use(
    plugins: PluginModuleDefinition[] = [],
    serialisers: SerialiserModuleDefinition[] = []
  ) {
    if (this.namespace.startsWith('preview-')) {
      console.log('[Mosaic] Preview source detected, filtering plugins to use.');
      this.#plugins.push(...plugins.filter(plugin => !plugin.previewDisabled));
    } else {
      this.#plugins.push(...plugins);
    }
    this.#serialisers.push(...serialisers);
  }

  async invokeAfterUpdate(sharedFilesystem, globalConfig) {
    const initTime = new Date().getTime();
    await this.#pluginApi.afterUpdate(this.filesystem.asRestricted(), {
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
        `Lifecycle phase 'afterUpdate' for source '${this.id.description}' took ${
          timeTaken / 1000
        }s to complete. The method is async, so this may not be an accurate measurement of execution time, but consider optimising this method if it is performing intensive operations.`
      );
    }
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
    worker.once(EVENT.EXIT, () => {
      this.#emitter.emit(EVENT.EXIT);
      this.#emitter.removeAllListeners();
      // this.filesystem.reset();
      this.filesystem = null;
    });
    worker.once(EVENT.START, () => this.#emitter.emit(EVENT.START));
    return worker;
  }

  async start() {
    this.serialiser = await bindSerialiser(this.#serialisers);
    this.#pluginApi = await bindPluginMethods(this.#plugins, this.trackPluginErrors.bind(this));
    this.#worker = this.#createWorker();
    this.#worker.on(EVENT.UPDATE, async ({ data: { pages, symlinks, data } }) => {
      this.config = createConfig(data);
      this.#emitter.emit(EVENT.UPDATE, { pages, symlinks, data });
    });
    this.#worker.on(EVENT.TRACK, async ({ data: { errors, lifecycleMethod } }) => {
      this.pluginErrors[`${lifecycleMethod}`] = errors;
    });
  }

  async isOwner(filePath: string) {
    const isFileInSource = await this.filesystem.promises.exists(filePath);
    return isFileInSource;
  }

  async triggerWorkflow(name: string, filePath: string, data: unknown) {
    const foundWorkflows = this.#workflows.filter(workflow => workflow.name === name);

    if (foundWorkflows.length === 0) {
      return {
        error: `[Mosaic] Workflow ${name} not found for ${this.id.description.toString()}`
      };
    }

    if (foundWorkflows.length > 1) {
      return {
        error: `[Mosaic] Multiple workflows with "${name}" found for ${this.id.description.toString()}`
      };
    }

    const triggeredWorkflow = foundWorkflows[0];

    if (triggeredWorkflow) {
      return triggeredWorkflow.action(
        this.#mergedOptions,
        triggeredWorkflow.options,
        filePath,
        data
      );
    }
    return false;
  }

  async restart() {
    this.stop();
    await this.start();
  }

  trackPluginErrors(errors: PluginErrors, lifecycleMethod: string) {
    this.pluginErrors[`${lifecycleMethod}`] = errors;
  }
}
