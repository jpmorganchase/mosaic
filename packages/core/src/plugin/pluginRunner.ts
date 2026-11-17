import path from 'node:path';
import type { LoadedPlugin, PluginErrors } from '@jpmorganchase/mosaic-types';

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
        continue;
      }

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
          `[Mosaic][Core] \`${lifecycleName}\` plugin should not return a value - this lifecycle phase expects mutation to occur directly on the filesystem instance. This will be ignored.`
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
        `[Mosaic][Core] '${pluginName}' threw an exception running \`${lifecycleName}\`${
          exception?.fullPath ? ` for '${exception.fullPath}'` : ''
        }`
      );
      const message = exception?.message ?? String(exception);
      console.error(`[Mosaic][Core] ${exception?.stack ?? message}`);

      // Error.message and Error.stack are not enumerable. Record plain
      // descriptors so worker JSON transport retains the original diagnostic.
      pluginErrors.push({
        name: exception?.name ?? 'PluginError',
        message,
        stack: exception?.stack,
        fullPath: exception?.fullPath,
        lifecycleMethod: lifecycleName,
        pluginModulePath: plugin.modulePath,
        pluginName
      });

      // process this lifecycle for the rest of the loaded plugins
      continue;
    }
  }

  return { result: transformedInput, errors: pluginErrors };
}
