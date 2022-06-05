import EventEmitter from 'events';
import { Volume } from 'memfs';
import { escapeRegExp, merge } from 'lodash';
import util from 'util';
import md5 from 'md5';

import type PluginModuleDefinition from '@pull-docs/types/dist/PluginModuleDefinition';
import type ParserModuleDefinition from '@pull-docs/types/dist/ParserModuleDefinition';
import type { IVolumeImmutable } from '@pull-docs/types/dist/Volume';
import type Parser from '@pull-docs/types/dist/Parser';
import type MutableData from '@pull-docs/types/dist/MutableData';
import type Plugin from '@pull-docs/types/dist/Plugin';
import type SourceModuleDefinition from '@pull-docs/types/dist/SourceModuleDefinition';

import { bindParser, bindPluginMethods } from './plugin';
import WorkerSubscription from './WorkerSubscription';
import { EVENT } from './WorkerSubscription';
import createConfig from './helpers/createConfig';
import MutableVolume from './filesystems/MutableVolume';
import FileSystem from './filesystems/FileSystem';

export default class Source {
  #emitter: EventEmitter = new EventEmitter();
  #modulePath: string;
  #plugins: PluginModuleDefinition[] = [];
  #parsers: ParserModuleDefinition[] = [];
  #worker: WorkerSubscription;
  #globalFileSystem: IVolumeImmutable;
  #pluginApi: Plugin;
  #parser: Parser;
  #mergedOptions: Record<string, unknown>;
  #config: MutableData<{}>;
  #pageExtensions;
  #pageTest;

  id: Symbol;
  filesystem: MutableVolume;

  constructor(
    { modulePath, name }: SourceModuleDefinition,
    mergedOptions: Record<string, unknown>,
    pageExtensions: string[],
    globalFileSystem: IVolumeImmutable
  ) {
    this.#modulePath = modulePath;
    this.#mergedOptions = mergedOptions;
    this.#globalFileSystem = globalFileSystem;
    this.id = Symbol(
      `${name}#${md5(util.inspect(this.#mergedOptions, { sorted: true })).substring(0, 8)}`
    );
    this.filesystem = new MutableVolume(new FileSystem(new Volume(), pageExtensions));
    this.#pageExtensions = pageExtensions;
    this.#pageTest = new RegExp(pageExtensions.map(escapeRegExp).join('|'));
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
    const shouldUpdateResult = await this.#pluginApi.shouldUpdate(updatedSourceFilesystem, {
      globalFilesystem: this.#globalFileSystem,
      pageExtensions: this.#pageExtensions,
      parser: this.#parser,
      config: this.#config.asReadOnly()
    });
    if (shouldUpdateResult === true) {
      this.filesystem.unseal();
      await this.#invokeAfterUpdate();
      this.filesystem.clearCache();
      this.filesystem.seal();
    }
  }

  async use(plugins: PluginModuleDefinition[], parsers: ParserModuleDefinition[]) {
    this.#plugins.push(...plugins);
    this.#parsers.push(...parsers);
  }

  async #invokeAfterUpdate() {
    await this.#pluginApi.afterUpdate(this.filesystem.asRestricted(), {
      globalFilesystem: this.#globalFileSystem,
      pageExtensions: this.#pageExtensions,
      parser: this.#parser,
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
      parsers: this.#parsers
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
    this.#parser = await bindParser(this.#parsers);
    this.#pluginApi = await bindPluginMethods(this.#plugins);
    this.#worker = this.#createWorker();
    this.#worker.on(EVENT.UPDATE, async ({ data: { pages, symlinks, data } }) => {
      try {
        this.filesystem.reset();
        this.filesystem.fromJSON(pages);
        // We need to re-apply symlinks in the main thread
        await this.filesystem.symlinksFromJSON(symlinks);

        // After each async operation, we should check if anything has caused the Source to close
        if (this.#worker.closed) {
          return;
        }

        this.#config = createConfig(data);

        await this.#invokeAfterUpdate();

        // After each async operation, we should check if anything has caused the Source to close
        if (this.#worker.closed) {
          return;
        }

        // Only add this hook right before we seal - so content only lazy loads after this point
        this.filesystem.addReadFileHook(async (pagePath, fileData) => {
          // If this is a 'page' - read the original file from disk and try to inject the content, in case it was lazy loaded
          if (this.#pageTest.test(pagePath)) {
            const currentPage = await this.#parser.deserialise(pagePath, fileData);
            if (currentPage.path) {
              const { content } = await this.#parser.deserialiseFromDisk(
                pagePath,
                currentPage.path
              );
              return await this.#parser.serialise(pagePath, merge({}, currentPage, { content }));
            }
          }
          return fileData;
        });
        this.filesystem.seal();
        this.filesystem.clearCache();

        this.#emitter.emit(EVENT.UPDATE);
      } catch (e) {
        console.warn(
          `[PullDocs] Exceptions during source update are currently set to terminate the parent source. Terminating '${String(
            this.id
          )}'. See error:`
        );
        console.error(e);
        this.stop();
      }
    });
  }
}
