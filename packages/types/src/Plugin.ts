import type Page from './Page';
import type MutableData from './MutableData';
import type PluginModuleDefinition from './PluginModuleDefinition';
import type { ImmutableData } from './MutableData';
import type { IVolumeImmutable, IVolumePartiallyMutable } from './Volume';
import type Serialiser from './Serialiser';

export type LoadedPlugin = Partial<Plugin> & PluginModuleDefinition;

/**
 * Plugins are lifecycle-based hooks that are called on every source at different stages.
 * Consumers will never need to invoke a lifecycle method; but for technical clarity - when a lifecycle method is called,
 * it will trigger `pluginRunner` which executes it on every source automatically.
 */
type Plugin<ConfigData = {}, PluginOptions = {}> = {
  /**
   * Plugin lifecycle method that triggers inside child processes.
   * The first lifecycle hook to trigger after receiving pages from a source. The pages can safely be mutated and will be reflected in the final
   * filesystem that gets generated.
   * @param pages Array of pages from the source
   * @param param.serialiser A matching `Serialiser` for serialising/deserialising pages when reading/writing to the filesystem
   * @param param.config A mutable object for sharing data with other lifecycle phases of all plugins for this source (including in the main thread) in this plugin
   * @param options The options passed in when declaring the plugin
   * @returns {Promise<Page[]>} Must re-return an array of `Page` objects, modified or not
   */
  $afterSource?(
    pages: Page[],
    {}: {
      serialiser: Serialiser;
      config: MutableData<ConfigData>;
      pageExtensions: string[];
    },
    options?: Pick<PluginModuleDefinition, 'options'> & PluginOptions
  ): Promise<Page[]>;
  /**
   * Plugin lifecycle method that triggers inside child processes.
   * Calls after a filesystem has been built up from the source pages.
   * @param mutableFilesystem Mutable virtual filesystem instance with all of this source's pages inside (and symlinks applied)
   * @param param.serialiser A matching `Serialiser` for serialising/deserialising pages when reading/writing to the filesystem
   * @param param.config A mutable object for sharing data with other lifecycle phases of all plugins for this source (including in the main thread) in this plugin
   * @param options The options passed in when declaring the plugin
   * @returns {void} No return expected
   */
  $beforeSend?(
    mutableFilesystem: IVolumePartiallyMutable,
    {}: {
      serialiser: Serialiser;
      pageExtensions: string[];
      config: MutableData<ConfigData>;
    },
    options?: Pick<PluginModuleDefinition, 'options'> & PluginOptions
  ): Promise<void>;
  /**
   * Plugin lifecycle method that triggers inside the main process.
   * Calls after the filesystem and symlinks have been reconstructed due to a change to the current source. This happens in the main thread.
   * This method also calls whenever another source has changed - if the `shouldUpdate` lifecycle returned `true`.
   * Pages will NOT be cached when read at this stage, to allow for reading content and writing a new copy of it without the cached version taking effect.
   * NOTE: Plugin methods that trigger inside the parent process should be async and highly optimised to avoid holding up the main thread.
   * @param mutableFilesystem Mutable filesystem instance with all of this source's pages inside (and symlinks re-applied)
   * @param param.serialiser A matching `Serialiser` for serialising/deserialising pages when reading/writing to the filesystem
   * @param param.config An immutable object for reading data from other lifecycle phases of all plugins for this source in the child process for this plugin
   * @param param.globalFilesystem Immutable union filesystem instance with all source's pages (and symlinks applied)
   * @param options The options passed in when declaring the plugin
   * @returns {void} No return expected
   */
  afterUpdate?(
    mutableFilesystem: IVolumePartiallyMutable,
    {}: {
      serialiser: Serialiser;
      config: ImmutableData<ConfigData>;
      globalFilesystem: IVolumeImmutable;
      pageExtensions: string[];
    },
    options?: Pick<PluginModuleDefinition, 'options'> & PluginOptions
  ): Promise<void>;
  /**
   * Plugin lifecycle method that triggers inside the main process everytime ANY source emits new pages.
   * This method should return a boolean that will indicate if this source should re-run the `afterUpdate` lifecycle.
   * Returning `undefined`, false or no value, will result in no `afterUpdate` call
   * @param updatedSourceFilesystem Immutable filesystem for the source that changed
   * @param param.config An immutable object for reading data from other lifecycle phases of all plugins for this source in the child process for this plugin
   * @param param.serialiser A matching `Serialiser` for serialising/deserialising pages when reading/writing to the filesystem
   * @param param.globalFilesystem Immutable union filesystem instance with all source's pages (and symlinks applied)
   * @param options The options passed in when declaring the plugin
   * @returns {Promise<object | string | undefined>} A boolean indicating whether `afterUpdate` should be called again for this source / plugin
   */
  shouldUpdate?(
    updatedSourceFilesystem: IVolumeImmutable,
    {}: {
      serialiser: Serialiser;
      config: ImmutableData<ConfigData>;
      globalFilesystem: IVolumeImmutable;
      pageExtensions: string[];
    },
    options?: Pick<PluginModuleDefinition, 'options'> & PluginOptions
  ): Promise<boolean>;
};

export type LifecycleMethod = keyof Plugin;

export default Plugin;
