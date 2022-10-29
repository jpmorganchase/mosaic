import type { PluginModuleDefinition } from './PluginModuleDefinition';

export type SourceModuleDefinition = PluginModuleDefinition & {
  namespace: string;
  cache?: boolean;
};
