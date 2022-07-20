import type PluginModuleDefinition from './PluginModuleDefinition';

type SourceModuleDefinition = PluginModuleDefinition & {
  namespace: string;
  cache?: boolean;
};

export default SourceModuleDefinition;
