import EventEmitter from 'events';
import { Volume } from 'memfs';
import { escapeRegExp, merge } from 'lodash';
import util from 'util';
import md5 from 'md5';
import path from 'path';

import type PluginModuleDefinition from '@pull-docs/types/dist/PluginModuleDefinition';
import type SerialiserModuleDefinition from '@pull-docs/types/dist/SerialiserModuleDefinition';
import type { IVolumeImmutable } from '@pull-docs/types/dist/Volume';
import type Serialiser from '@pull-docs/types/dist/Serialiser';
import type MutableData from '@pull-docs/types/dist/MutableData';
import type Plugin from '@pull-docs/types/dist/Plugin';
import type SourceModuleDefinition from '@pull-docs/types/dist/SourceModuleDefinition';

import { bindSerialiser, bindPluginMethods } from './plugin';
import WorkerSubscription from './WorkerSubscription';
import { EVENT } from './WorkerSubscription';
import createConfig from './helpers/createConfig';
import MutableVolume from './filesystems/MutableVolume';
import FileSystem from './filesystems/FileSystem';

export default class Source {
  #emitter: EventEmitter = new EventEmitter();
  #modulePath: string;
  #plugins: PluginModuleDefinition[] = [];
  #serialisers: SerialiserModuleDefinition[] = [];
  #worker: WorkerSubscription;
  #globalFileSystem: IVolumeImmutable;
  #pluginApi: Plugin;
  #mergedOptions: Record<string, unknown>;
  #config: MutableData<{}>;
  #pageExtensions: string[];
  
  serialiser: Serialiser;
  id: Symbol;
  filesystem: MutableVolume;

  constructor(
    { modulePath }: SourceModuleDefinition,
    mergedOptions: Record<string, unknown>,
    pageExtensions: string[],
    globalFileSystem: IVolumeImmutable
  ) {
    this.#modulePath = modulePath;
    this.#mergedOptions = mergedOptions;
    this.#globalFileSystem = globalFileSystem;
    this.id = Symbol(
      `${path.basename(modulePath)}#${md5(
        util.inspect(this.#mergedOptions, { sorted: true })
      ).substring(0, 8)}`
    );
    this.filesystem = new MutableVolume(new FileSystem(new Volume()));
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
    if (this.#worker?.closed) {
      throw new Error('Cannot stop source that has not started');
    }
    this.#worker.stop();
  }

  /**
   * Called when another source (not this one) has changed.
   * This source can then ask its plugins if they also want to update in response to the other change.
   */
  async requestUpdate(updatedSourceFilesystem: IVolumeImmutable) {
    const shouldInvokeAfterUpdate = await this.#pluginApi.shouldUpdate(updatedSourceFilesystem, {
      globalFilesystem: this.#globalFileSystem,
      pageExtensions: this.#pageExtensions,
      serialiser: this.serialiser,
      config: this.#config.asReadOnly()
    });
    if (shouldInvokeAfterUpdate === true) {
      this.filesystem.unfreeze();
      await this.invokeAfterUpdate();
      this.filesystem.clearCache();
      this.filesystem.freeze();
    }
  }

  async use(plugins: PluginModuleDefinition[], serialisers: SerialiserModuleDefinition[]) {
    this.#plugins.push(...plugins);
    this.#serialisers.push(...serialisers);
  }

  async invokeAfterUpdate() {
    await this.#pluginApi.afterUpdate(this.filesystem.asRestricted(), {
      globalFilesystem: this.#globalFileSystem,
      pageExtensions: this.#pageExtensions,
      serialiser: this.serialiser,
      config: this.#config.asReadOnly()
    });
  }

  #createWorker() {
    const worker = new WorkerSubscription({
      modulePath: this.#modulePath,
      name: this.id.description,
      options: this.#mergedOptions,
      pageExtensions: this.#pageExtensions,
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
      this.#config = createConfig(data);
      this.#emitter.emit(EVENT.UPDATE, { pages, symlinks });
    });
  }
}
