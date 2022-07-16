import type PluginModuleDefinition from './PluginModuleDefinition';

type SourceModuleDefinition = PluginModuleDefinition & { cache?: boolean };

export default SourceModuleDefinition;
