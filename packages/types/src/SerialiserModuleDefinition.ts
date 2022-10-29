import type { PluginModuleDefinition } from './PluginModuleDefinition';

export type SerialiserModuleDefinition = PluginModuleDefinition & {
  filter: RegExp;
};
