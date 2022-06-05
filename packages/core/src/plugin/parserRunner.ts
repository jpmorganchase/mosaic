import type { LoadedParser } from '@pull-docs/types/dist/Parser';

import PluginError from '../PluginError';

export default async function parserRunner(
    { loadedPlugins, parserMethod }: { parserMethod: string; loadedPlugins: LoadedParser[] },
    route: string,
    ...args
  ) {
    if (typeof route !== 'string' || !/\/[^/]+\.\w{1,4}$/.test(route)) {
      throw new Error(`Invalid parser input. '${route}' provided but a path string (with a valid file extension) was expected.`);
    }
    for (const parser of loadedPlugins) {
      try {
        if (!parser.filter.test(String(route))) {
          // Parser failed the path filter test
          continue;
        }
        const result = await parser[parserMethod](route, ...args, parser.options);
        return result;
      } catch (e) {
        // This check will stop nested errors from ending up with multiple 'Plugin X threw an exception' headers from
        // being prefixed to the messages
        if (e instanceof PluginError) {
          throw e;
        }
        throw new PluginError(
          `Parser '${parser.modulePath}' threw an exception calling \`parser.${parserMethod}\` on '${route}'.
          
  Is this the correct parser to use for this file type? See error below:
  ${e.stack}`
        );
      }
    }
    throw new Error(`Could not find a suitable parser for file '${route}'.`);
  }
