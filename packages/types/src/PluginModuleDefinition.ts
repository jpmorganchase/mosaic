export default interface PluginModuleDefinition {
  options: Record<string, unknown>;
  priority?: number;
  modulePath: string;
}
