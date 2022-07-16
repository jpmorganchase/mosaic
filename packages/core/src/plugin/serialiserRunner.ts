import type { LoadedSerialiser } from '@pull-docs/types/dist/Serialiser';

import PluginError from '../PluginError';

export default async function serialiserRunner(
    { loadedPlugins, serialiserMethod }: { serialiserMethod: string; loadedPlugins: LoadedSerialiser[] },
    route: string,
    ...args
  ) {
    if (typeof route !== 'string' || !/\/[^/]+\.\w{1,4}$/.test(route)) {
      throw new Error(`Invalid serialiser input. '${route}' provided but a path string (with a valid file extension) was expected.`);
    }
    for (const serialiser of loadedPlugins) {
      try {
        if (!serialiser.filter.test(String(route))) {
          // Serialiser failed the path filter test
          continue;
        }
        const result = await serialiser[serialiserMethod](route, ...args, serialiser.options);
        return result;
      } catch (e) {
        // This check will stop nested errors from ending up with multiple 'Plugin X threw an exception' headers from
        // being prefixed to the messages
        if (e instanceof PluginError) {
          throw e;
        }
        throw new PluginError(
          `Serialiser '${serialiser.modulePath}' threw an exception calling \`serialiser.${serialiserMethod}\` on '${route}'.
          
  Is this the correct serialiser to use for this file type? See error below:
  ${e.stack}`
        );
      }
    }
    throw new Error(`Could not find a suitable serialiser for file '${route}'.`);
  }
