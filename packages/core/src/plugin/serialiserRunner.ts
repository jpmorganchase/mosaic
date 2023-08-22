import type { LoadedSerialiser } from '@jpmorganchase/mosaic-types';
import path from 'node:path';
import PluginError from '@jpmorganchase/mosaic-plugins/PluginError';

const isPathWithExtension = (filePath: string) => {
  return typeof filePath === 'string' && path.extname(filePath).length > 1;
};

export default async function serialiserRunner(
  {
    loadedPlugins,
    serialiserMethod
  }: { serialiserMethod: string; loadedPlugins: LoadedSerialiser[] },
  fullPath: string,
  ...args
) {
  if (!isPathWithExtension(fullPath)) {
    throw new Error(
      `Invalid serialiser input. '${fullPath}' provided but a path string (with a valid file extension) was expected.`
    );
  }
  for (const serialiser of loadedPlugins) {
    try {
      if (!serialiser.filter.test(String(fullPath))) {
        // Serialiser failed the path filter test
        // eslint-disable-next-line no-continue
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const result = await serialiser[serialiserMethod](fullPath, ...args, serialiser.options);
      return result;
    } catch (e) {
      if (e instanceof PluginError) {
        e.lifecycleMethod = serialiserMethod;
        e.pluginModulePath = serialiser.modulePath;
        throw e;
      }

      // create a new plugin error
      const pluginError = new PluginError(e.message);
      pluginError.stack = e.stack;
      pluginError.pluginModulePath = serialiser.modulePath;
      pluginError.lifecycleMethod = serialiserMethod;
      throw pluginError;
    }
  }
  throw new Error(`Could not find a suitable serialiser for file '${fullPath}'.`);
}
