import type { IUnionFs } from 'unionfs';
import { Union } from 'unionfs';
import type { IFS } from 'unionfs/lib/fs';

import type PluginModuleDefinition from '@pull-docs/types/dist/PluginModuleDefinition';
import type SerialiserModuleDefinition from '@pull-docs/types/dist/SerialiserModuleDefinition';
import type SourceModuleDefinition from '@pull-docs/types/dist/SourceModuleDefinition';

import SourceManager from './SourceManager';

// TODO:
// Circular dependency checks for afterReadFile
// Remove $ref /index resolution
import ImmutableVolume from './filesystems/ImmutableVolume';
import MutableVolume from './filesystems/MutableVolume';
import FileSystem from './filesystems/FileSystem';

export default class PullDocs {
  #sourceDefinitions: SourceModuleDefinition[];
  #sourceManager: SourceManager;
  #ufs = new Union() as IUnionFs & { fss: MutableVolume[] };
  #vfs: ImmutableVolume;

  /**
   *
   * @param config.sources Sources
   * @param config.plugins Plugins
   * @param config.serialisers Serialiser
   * @param config.pageExtensions Exts of files to treat as pages. Pages must be JSON files that meet the `Page` file
   *                              format. Pages are run through serialisers when read and can be referenced via `$ref`s
   */
  constructor(config: {
    plugins?: PluginModuleDefinition[];
    serialisers?: SerialiserModuleDefinition[];
    sources: SourceModuleDefinition[];
    pageExtensions: string[];
  }) {
    const {
      sources = [],
      plugins = [],
      serialisers = [],
      pageExtensions = ['.mdx', '.md']
    } = config;
    this.#sourceDefinitions = sources;
    this.#vfs = new ImmutableVolume(FileSystem.fromUnion(this.#ufs, pageExtensions));
    this.#sourceManager = new SourceManager(
      // Refs and aliases should be applied after all other plugins, so we add them manually with a negative priority
      plugins
        .concat(
          {
            modulePath: require.resolve('@pull-docs/plugins/dist/AliasPlugin'),
            options: {},
            priority: -1
          },
          {
            modulePath: require.resolve('@pull-docs/plugins/dist/RefPlugin'),
            options: {},
            priority: -1
          }
        )
        .sort(({ priority: priorityA = 0 }, { priority: priorityB = 0 }) => priorityB - priorityA),
      // Auto add JSON serialiser
      serialisers.concat({
        modulePath: require.resolve('@pull-docs/serialisers/dist/json'),
        filter: /\.json$/,
        options: {}
      }),
      pageExtensions,
      this.#vfs
    );
  }

  get filesystem() {
    return this.#vfs;
  }

  onSourceUpdate(callback) {
    return this.#sourceManager.onSourceUpdate(callback);
  }

  async start() {
    return this.#sourceDefinitions.map(source => this.#addSource(source));
  }

  async stop() {
    return this.#sourceManager.destroyAll();
  }

  async #addSource(sourceDefinition) {
    const source = await this.#sourceManager.addSource(sourceDefinition, {});
    source.onError(error => {
      console.error(new Error(`Source '${source.id.description}' threw an exception. See below:`));
      console.error(error);
    });
    source.onExit(() => {
      this.#ufs.fss.splice(this.#ufs.fss.indexOf(source.filesystem), 1);

      if (this.#ufs.fss.length < 1) {
        console.debug("[PullDocs] All of my source have been terminated. That's sad :-(");
      }
    });

    this.#ufs.use(source.filesystem as unknown as IFS);

    return source;
  }
}
