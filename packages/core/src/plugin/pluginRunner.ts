import type { LoadedPlugin } from '@jpmorganchase/mosaic-types';

import PluginError from '../PluginError';

export default async function pluginRunner(
  { loadedPlugins, lifecycleName }: { loadedPlugins: LoadedPlugin[]; lifecycleName: string },
  input,
  ...args
) {
  let transformedInput = input;

  for (const plugin of loadedPlugins) {
    try {
      if (typeof input === 'undefined') {
        throw new Error('Input was undefined.');
      }

      if (typeof plugin[lifecycleName] !== 'function') {
        // eslint-disable-next-line no-continue
        continue;
      }

      // console.debug(
      //   `[PullDocs] Applying plugin method \`${lifecycleName}\`${lifecycleName.startsWith('$') ? ' (in a child worker)' : ''} for '${plugin.modulePath}'.`
      // );

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
        lifecycleName !== 'saveContent'
      ) {
        console.warn(
          `[PullDocs] \`${lifecycleName}\` plugin should not return a value - this lifecycle phase expects mutation to occur directly on the filesystem instance. This will be ignored.`
        );
      }

      if (lifecycleName === 'saveContent' && !result) {
        console.warn(
          `[PullDocs] \`${lifecycleName}\` plugin returned a falsy value - this result has been discarded.`
        );
        // eslint-disable-next-line no-continue
        continue;
      }

      transformedInput = result;
    } catch (e) {
      // This check will stop nested errors from ending up with multiple 'Plugin X threw an exception' headers from
      // being prefixed to the messages
      if (e instanceof PluginError) {
        throw e;
      }
      throw new PluginError(
        `Plugin '${plugin.modulePath}' threw an exception running \`${lifecycleName}\`. See below:
  ${e.stack}`
      );
    }
  }
  return transformedInput;
}
