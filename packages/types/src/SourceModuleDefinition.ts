import type { PluginModuleDefinition } from './PluginModuleDefinition';
import { SourceWorkflow } from './SourceWorkflow';

export type SourceModuleDefinition = PluginModuleDefinition & {
  namespace: string;
  cache?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workflows?: SourceWorkflow<any, any>[];
};
