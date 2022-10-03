import PluginModuleDefinition from './PluginModuleDefinition';
import SerialiserModuleDefinition from './SerialiserModuleDefinition';
import SourceModuleDefinition from './SourceModuleDefinition';

export interface PullDocsConfig {
  pageExtensions: Array<string>;
  ignorePages?: Array<string>;
  serialisers: Array<SerialiserModuleDefinition>;
  plugins: Array<PluginModuleDefinition>;
  sources: Array<SourceModuleDefinition>;
}
