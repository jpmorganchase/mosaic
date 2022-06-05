import PluginModuleDefinition from './PluginModuleDefinition';

type ParserModuleDefinition = PluginModuleDefinition & {
  filter: RegExp;
};

export default ParserModuleDefinition;
