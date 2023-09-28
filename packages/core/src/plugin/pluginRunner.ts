import path from 'node:path';
import type { LoadedPlugin, PluginErrors } from '@jpmorganchase/mosaic-types';
import PluginError from '@jpmorganchase/mosaic-plugins/PluginError';

export default async function pluginRunner(
  { loadedPlugins, lifecycleName }: { loadedPlugins: LoadedPlugin[]; lifecycleName: string },
  input,
  ...args
) {
  let transformedInput = input;
  const pluginErrors: PluginErrors = [];

  for (const plugin of loadedPlugins) {
    try {
      if (typeof input === 'undefined') {
        throw new Error('Input was undefined.');
      }

      if (typeof plugin[lifecycleName] !== 'function') {
        // eslint-disable-next-line no-continue
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const result = await plugin[lifecycleName](
        lifecycleName === '$afterSource' ? transformedInput : input,
        ...args,
        plugin.options
      );

      if (
        result &&
        lifecycleName !== '$afterSource' &&
        lifecycleName !== 'shouldClearCache' &&
        lifecycleName !== 'shouldUpdateNamespaceSources'
      ) {
        console.warn(
          `[Mosaic] \`${lifecycleName}\` plugin should not return a value - this lifecycle phase expects mutation to occur directly on the filesystem instance. This will be ignored.`
        );
      }

      transformedInput = result;
      if (
        (lifecycleName === 'shouldClearCache' ||
          lifecycleName === 'shouldUpdateNamespaceSources') &&
        result === true
      ) {
        /** This lifecycle returns a boolean so if *any* plugin wants to clear the cache then we should do so */
        break;
      }
    } catch (exception) {
      const pluginName = path.posix.basename(
        plugin.modulePath,
        path.posix.extname(plugin.modulePath)
      );
      console.error(
        `[Mosaic][Plugin] '${pluginName}' threw an exception running \`${lifecycleName}\``
      );
      console.error(`[Mosaic][Plugin] ${exception.stack}`);

      if (exception instanceof PluginError) {
        exception.lifecycleMethod = lifecycleName;
        exception.pluginModulePath = plugin.modulePath;
        exception.pluginName = pluginName;
        pluginErrors.push(exception);
      } else {
        // create a new plugin error
        const pluginError = new PluginError(exception.message);
        pluginError.pluginModulePath = plugin.modulePath;
        pluginError.lifecycleMethod = lifecycleName;
        pluginError.pluginName = pluginName;
        pluginErrors.push(pluginError);
      }

      // process this lifecycle for the rest of the loaded plugins
      continue;
    }
  }

  return { result: transformedInput, errors: pluginErrors };
}
