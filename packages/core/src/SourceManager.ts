import type SourceModuleDefinition from '@pull-docs/types/dist/SourceModuleDefinition';
import type ParserModuleDefinition from '@pull-docs/types/dist/ParserModuleDefinition';
import type PluginModuleDefinition from '@pull-docs/types/dist/PluginModuleDefinition';
import type { IVolumeImmutable } from '@pull-docs/types/dist/Volume';

import Source from './Source';

export default class SourceManager {
  #sources: Map<Symbol, Source> = new Map();
  #plugins: PluginModuleDefinition[];
  #parsers: ParserModuleDefinition[];
  #handlers: Set<(filesystem: IVolumeImmutable, source: Source) => {}> = new Set();
  #globalFileSystem: IVolumeImmutable;
  #pageExtensions: string[];

  constructor(plugins = [], parsers = [], pageExtensions, globalFileSystem) {
    this.#plugins = plugins;
    this.#pageExtensions = pageExtensions;
    this.#parsers = parsers;
    this.#globalFileSystem = globalFileSystem;
  }

  #invokeUpdateCallbacks(filesystem: IVolumeImmutable, source: Source) {
    this.#handlers.forEach(callback => callback(filesystem, source));
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
      let started = false;

      const source = new Source(
        sourceDefinition,
        {
          ...sourceDefinition.options,
          ...options
        },
        this.#pageExtensions,
        this.#globalFileSystem
      );
      let initOrStartTime = new Date().getTime();

      this.#sources.set(source.id, source);

      source.use(this.#plugins, this.#parsers);

      await source.start();

      source.onUpdate(async () => {
        if (!started) {
          reject(
            new Error(
              `Source '${sourceDefinition.name}' received a message before it was initialised.`
            )
          );
        } else {
          if (initOrStartTime) {
            console.debug(
              `[PullDocs] Source '${source.id.description}' received first docs snapshot ${
                (new Date().getTime() - initOrStartTime) / 1000
              }s after starting.`
            );
            console.info(
              `[PullDocs] Source ${String(
                source.id
              )}'s filesystem size (in current state, with some content not yet loaded) is: ${(
                JSON.stringify(source.filesystem.toJSON()).length / 1000000
              ).toFixed(2)}mb`
            );
            initOrStartTime = null;
          } else {
            console.debug(`[PullDocs] Source '${source.id.description}' received updated docs`);
          }

          const immutableSourceFilesystem = source.filesystem.asReadOnly();
          // Notify other sealed sources that something has changed. If a source's filesystem hasn't been sealed yet - there's no point
          // in notifying it of another source changing, as it hasn't started/finished running `afterUpdate` yet anyway.
          // No need to do them sequentially - we can fire them all off at once and wait for them all to finish.
          await Promise.all(
            Array.from(this.#sources.values()).map(existingSource => {
              if (existingSource !== source && existingSource.filesystem.sealed) {
                return existingSource.requestUpdate(immutableSourceFilesystem);
              }
            })
          );

          this.#invokeUpdateCallbacks(source.filesystem.asReadOnly(), source);
        }
      });
      source.onError(error => {
        console.error(error);
        if (!started) {
          reject(error);
        }
      });
      source.onExit(() => {
        if (!started) {
          reject(
            new Error(`Source '${sourceDefinition.name}' silently exited before initialising.`)
          );
        }
        console.debug(`[PullDocs] Source '${source.id.description}' closed`);

        this.#sources.delete(source.id);
      });
      source.onStart(() => {
        started = true;
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
}
