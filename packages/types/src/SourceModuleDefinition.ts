import type PluginModuleDefinition from './PluginModuleDefinition';

type SourceModuleDefinition = PluginModuleDefinition & { name: string; cache?: boolean };

export default SourceModuleDefinition;
