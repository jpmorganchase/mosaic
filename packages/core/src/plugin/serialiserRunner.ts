import type { LoadedSerialiser } from '@jpmorganchase/mosaic-types';
import path from 'node:path';

import PluginError from '../PluginError.js';

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
      // This check will stop nested errors from ending up with multiple 'Plugin X threw an exception' headers from
      // being prefixed to the messages
      if (e instanceof PluginError) {
        throw e;
      }
      throw new PluginError(
        `Serialiser '${serialiser.modulePath}' threw an exception calling \`serialiser.${serialiserMethod}\` on '${fullPath}'.
          
  Is this the correct serialiser to use for this file type? See error below:
  ${e.stack}`
      );
    }
  }
  throw new Error(`Could not find a suitable serialiser for file '${fullPath}'.`);
}
