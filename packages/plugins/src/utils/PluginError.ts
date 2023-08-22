export default class PluginError extends Error {
  fullPath: string;
  lifecycleMethod: string;
  pluginModulePath: string;
  pluginName: string;
  constructor(message: string, fullPath?: string) {
    super(message);
    this.name = 'PluginError';
    this.fullPath = fullPath;
    Object.setPrototypeOf(this, PluginError.prototype);
  }
}
