import type SerialiserModuleDefinition from './SerialiserModuleDefinition';
import type PluginModuleDefinition from './PluginModuleDefinition';
import type SourceModuleDefinition from './SourceModuleDefinition';

type WorkerData<Options = {}> = {
  options: Options &
    Pick<PluginModuleDefinition, 'options'> &
    Pick<SourceModuleDefinition, 'options'> & {
      pageExtensions: string[];
    };
  name: string;
  namespace: string;
  pageExtensions: string[];
  ignorePages: string[];
  plugins: PluginModuleDefinition[];
  serialisers: SerialiserModuleDefinition[];
  modulePath: string;
};

export default WorkerData;
