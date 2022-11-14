import type { PluginModuleDefinition } from './PluginModuleDefinition';
import type { SerialiserModuleDefinition } from './SerialiserModuleDefinition';
import type { SourceModuleDefinition } from './SourceModuleDefinition';

export interface MosaicConfig {
  pageExtensions: Array<string>;
  ignorePages?: Array<string>;
  serialisers: Array<SerialiserModuleDefinition>;
  plugins: Array<PluginModuleDefinition>;
  sources: Array<SourceModuleDefinition>;
}
