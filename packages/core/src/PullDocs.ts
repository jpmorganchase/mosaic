import type { IUnionFs } from 'unionfs';
import { Union } from 'unionfs';
import type { IFS } from 'unionfs/lib/fs';
import { Volume } from 'memfs';

import type {
  PluginModuleDefinition,
  SerialiserModuleDefinition,
  SourceModuleDefinition
} from '@jpmorganchase/mosaic-types';

import SourceManager from './SourceManager';

// TODO:
// Remove $ref /index resolution
import FileAccess from './filesystems/FileAccess';
import MutableVolume from './filesystems/MutableVolume';
import UnionFileAccess from './filesystems/UnionFileAccess';
import UnionVolume from './filesystems/UnionVolume';

export default class PullDocs {
  #sourceDefinitions: SourceModuleDefinition[];
  #sourceManager: SourceManager;
  #ufs = new Union() as IUnionFs & { fss: MutableVolume[] };
  #vfs: UnionVolume;

  /**
   *
   * @param config.sources Sources are observables that emit pages
   * @param config.plugins Plugins are modules with lifecycles methods for manipulating files and/or the virtual filesystem
   * @param config.serialisers  Serialisers are a form of plugin that tell PullDocs how to turn a file from/to a storable form for the filesystem - or back into a `Page` object
   * @param config.ignorePages Page names to exclude from lazy loading / `$ref`s / `$tag`s / serialisers and also any plugins that expect pages as input. Example input would be "ignore-me.xml"
   * @param config.pageExtensions Exts of files to treat as pages. Pages contain metadata and content, in any file format (as long as a serialiser exists to encode/decode them). They can be referenced via `$ref`s / `$tag`s and also support lazy loading
   */
  constructor(config: {
    ignorePages?: string[];
    plugins?: PluginModuleDefinition[];
    serialisers?: SerialiserModuleDefinition[];
    sources: SourceModuleDefinition[];
    pageExtensions: string[];
  }) {
    const sharedFilesystem = new MutableVolume(new FileAccess(new Volume()), '*');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.#ufs.use(sharedFilesystem as unknown as any);
    const {
      ignorePages = [],
      sources = [],
      plugins = [],
      serialisers = [],
      pageExtensions = ['.mdx']
    } = config;
    this.#sourceDefinitions = sources;
    this.#vfs = new UnionVolume(new UnionFileAccess(this.#ufs), '*');
    this.#sourceManager = new SourceManager(
      this.#vfs,
      sharedFilesystem,
      // Refs and aliases should be applied after all other plugins, so we add them manually with a negative priority
      plugins
        .concat(
          {
            modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/$TagPlugin'),
            options: {}
          },
          {
            modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/$CodeModPlugin'),
            options: {},
            // Make sure this happens as the very first plugin, so it can fix any page issues
            priority: Number.POSITIVE_INFINITY
          },
          {
            modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/$AliasPlugin'),
            options: {},
            priority: -1
          },
          {
            modulePath: require.resolve('@jpmorganchase/mosaic-plugins/dist/$RefPlugin'),
            options: {},
            priority: -1
          }
        )
        .sort(({ priority: priorityA = 0 }, { priority: priorityB = 0 }) => priorityB - priorityA),
      // Auto add JSON serialiser
      serialisers.concat({
        modulePath: require.resolve('@jpmorganchase/mosaic-serialisers/dist/json'),
        filter: /\.json$/,
        options: {}
      }),
      pageExtensions,
      ignorePages
    );
  }

  get filesystem() {
    return this.#vfs;
  }

  onSourceUpdate(callback) {
    return this.#sourceManager.onSourceUpdate(callback);
  }

  async start() {
    return Promise.all(this.#sourceDefinitions.map(source => this.#addSource(source)));
  }

  async stop() {
    return this.#sourceManager.destroyAll();
  }

  async saveContent<TData>(filePath: string, data: TData) {
    return this.#sourceManager.saveContent(filePath, data);
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
