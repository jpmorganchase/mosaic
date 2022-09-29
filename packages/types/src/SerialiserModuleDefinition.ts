import PluginModuleDefinition from './PluginModuleDefinition';

type SerialiserModuleDefinition = PluginModuleDefinition & {
  filter: RegExp;
};

export default SerialiserModuleDefinition;
