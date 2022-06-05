import type ParserModuleDefinition from './ParserModuleDefinition';
import type PluginModuleDefinition from './PluginModuleDefinition';
import type SourceModuleDefinition from './SourceModuleDefinition';

type WorkerData<Options = {}> = {
  options: Options & Pick<PluginModuleDefinition, 'options'> & Pick<SourceModuleDefinition, 'options'> & {
    pageExtensions: string[]
  };
  name: string;
  pageExtensions: string[];
  plugins: PluginModuleDefinition[];
  parsers: ParserModuleDefinition[];
  modulePath: string;
};

export default WorkerData;
