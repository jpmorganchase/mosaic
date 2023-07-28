import type {
  SerialiserModuleDefinition,
  PluginModuleDefinition,
  SourceModuleDefinition,
  SourceSchedule
} from './index.js';

export type WorkerData<Options = {}> = {
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
  schedule: SourceSchedule;
};
