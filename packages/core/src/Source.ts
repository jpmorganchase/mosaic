import EventEmitter from 'events';
import { Volume } from 'memfs';
import util from 'util';
import md5 from 'md5';
import path from 'path';

import type PluginModuleDefinition from '@jpmorganchase/mosaic-types/dist/PluginModuleDefinition';
import type SerialiserModuleDefinition from '@jpmorganchase/mosaic-types/dist/SerialiserModuleDefinition';
import type { IUnionVolume, IVolumeImmutable } from '@jpmorganchase/mosaic-types/dist/Volume';
import type Serialiser from '@jpmorganchase/mosaic-types/dist/Serialiser';
import type MutableData from '@jpmorganchase/mosaic-types/dist/MutableData';
import type Plugin from '@jpmorganchase/mosaic-types/dist/Plugin';
import type SourceModuleDefinition from '@jpmorganchase/mosaic-types/dist/SourceModuleDefinition';

import { bindSerialiser, bindPluginMethods } from './plugin';
import WorkerSubscription from './WorkerSubscription';
import { EVENT } from './WorkerSubscription';
import createConfig from './helpers/createConfig';
import MutableVolume from './filesystems/MutableVolume';
import FileAccess from './filesystems/FileAccess';

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

  config: MutableData<{}>;
  serialiser: Serialiser;
  namespace: string;
  id: Symbol;
  filesystem: MutableVolume;

  constructor(
    { modulePath, namespace }: SourceModuleDefinition,
    mergedOptions: Record<string, unknown>,
    pageExtensions: string[],
    ignorePages: string[],
    globalFilesystem: IUnionVolume
  ) {
    this.#modulePath = modulePath;
    this.#mergedOptions = mergedOptions;
    this.#globalFilesystem = globalFilesystem;
    this.#ignorePages = ignorePages;
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
        config: this.config.asReadOnly()
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

  async use(plugins: PluginModuleDefinition[] = [], serialisers: SerialiserModuleDefinition[] = []) {
    this.#plugins.push(...plugins);
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
      config: this.config.asReadOnly()
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
      serialisers: this.#serialisers
    });
    worker.once(EVENT.ERROR, error => this.#emitter.emit(EVENT.ERROR, error));
    worker.once(EVENT.EXIT, () => {
      this.#emitter.emit(EVENT.EXIT);
      this.#emitter.removeAllListeners();
      //this.filesystem.reset();
      this.filesystem = null;
    });
    worker.once(EVENT.START, () => this.#emitter.emit(EVENT.START));
    return worker;
  }

  async start() {
    this.serialiser = await bindSerialiser(this.#serialisers);
    this.#pluginApi = await bindPluginMethods(this.#plugins);
    this.#worker = this.#createWorker();
    this.#worker.on(EVENT.UPDATE, async ({ data: { pages, symlinks, data } }) => {
      this.config = createConfig(data);
      this.#emitter.emit(EVENT.UPDATE, { pages, symlinks, data });
    });
  }
}
