import keyBy from 'lodash/keyBy';
import type { IUnionFs } from 'unionfs';
import { Union } from 'unionfs';
import type { IFS } from 'unionfs/lib/fs';

import type PluginModuleDefinition from '@pull-docs/types/dist/PluginModuleDefinition';
import type ParserModuleDefinition from '@pull-docs/types/dist/ParserModuleDefinition';
import type SourceModuleDefinition from '@pull-docs/types/dist/SourceModuleDefinition';

import SourceManager from './SourceManager';

// TODO:
// Circular dependency checks for afterReadFile
// Remove $ref /index resolution
import ImmutableVolume from './filesystems/ImmutableVolume';
import MutableVolume from './filesystems/MutableVolume';
import FileSystem from './filesystems/FileSystem';

export default class PullDocs {
  #sourceDefinitions: { [key: SourceModuleDefinition['name']]: SourceModuleDefinition };
  #sourceManager: SourceManager;
  #ufs = new Union() as IUnionFs & { fss: MutableVolume[] };
  #vfs: ImmutableVolume;

  /**
   *
   * @param config.sources Sources
   * @param config.plugins Plugins
   * @param config.parsers Parser
   * @param config.pageExtensions Exts of files to treat as pages. Pages must be JSON files that meet the `Page` file
   *                              format. Pages are run through parsers when read and can be referenced via `$ref`s
   */
  constructor(config: {
    plugins?: PluginModuleDefinition[];
    parsers?: ParserModuleDefinition[];
    sources: SourceModuleDefinition[];
    pageExtensions: string[];
  }) {
    const { sources = [], plugins = [], parsers = [], pageExtensions = ['.mdx', '.md'] } = config;
    this.#sourceDefinitions = keyBy(sources, 'name');
    this.#vfs = new ImmutableVolume(FileSystem.fromUnion(this.#ufs, pageExtensions));
    this.#sourceManager = new SourceManager(
      plugins
        .sort(({ priority: priorityA = 0 }, { priority: priorityB = 0 }) => priorityB - priorityA)
        // Refs and aliases must be applied after all other plugins, so we add them manually at the end
        .concat(
          {
            modulePath: require.resolve('@pull-docs/plugins/dist/AliasPlugin'),
            options: {}
          },
          {
            modulePath: require.resolve('@pull-docs/plugins/dist/RefPlugin'),
            options: {}
          }
        ),
        // Auto add JSON parser
      parsers.concat({
        modulePath: require.resolve('@pull-docs/parsers/dist/json'),
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

  async addSource(name: string, options: {}) {
    const sourceDefinition = this.#sourceDefinitions[name];

    if (!sourceDefinition) {
      throw new Error(`Source definition '${name}' could not be found.`);
    }

    const source = await this.#sourceManager.addSource(sourceDefinition, options);
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
