import type { LoadedPlugin } from '@pull-docs/types/dist/Plugin';
import type { LoadedParser } from '@pull-docs/types/dist/Parser';
import type Plugin from '@pull-docs/types/dist/Plugin';
import type PluginModuleDefinition from '@pull-docs/types/dist/PluginModuleDefinition';
import type Parser from '@pull-docs/types/dist/Parser';
import type Page from '@pull-docs/types/dist/Page';

import loadDefinitionModules from './loadDefinitionModules';
import parserRunner from './parserRunner';
import pluginRunner from './pluginRunner';

function createProxyBaseParserAPI(): Parser {
  return {
    serialise() {
      throw new Error('This is just for the interface on the Proxy and should never be invoked.');
    },
    deserialise() {
      throw new Error('This is just for the interface on the Proxy and should never be invoked.');
    },
    deserialiseFromDisk() {
      throw new Error('This is just for the interface on the Proxy and should never be invoked.');
    }
  };
}

function createProxyBaseAPI<ConfigData>(): Plugin<ConfigData> {
  return {
    $afterSource() {
      throw new Error('This is just for the interface on the Proxy and should never be invoked.');
    },
    shouldUpdate() {
      throw new Error('This is just for the interface on the Proxy and should never be invoked.');
    },
    afterUpdate() {
      throw new Error('This is just for the interface on the Proxy and should never be invoked.');
    },
    $beforeSend() {
      throw new Error('This is just for the interface on the Proxy and should never be invoked.');
    }
  };
}

export default async function createPluginAPI<PluginInput, ConfigData = {}>(
  plugins: PluginModuleDefinition[]
): Promise<Plugin<ConfigData>> {
  const loadedPlugins: LoadedPlugin[] | LoadedParser[] = await loadDefinitionModules(plugins);
  const baseObj = createProxyBaseAPI<ConfigData>();
  const baseParserObj = createProxyBaseParserAPI();

  return new Proxy(baseObj, {
    // async apply(_obj, _this, args: [string, {}]) {
    //   // Only parsers have a signature that is a function with no API methods on it
    //   return await parserRunner({ loadedPlugins: loadedPlugins as LoadedParser[] }, ...args);
    // },
    get(obj, propOrLifecycleName) {
      if (baseParserObj.hasOwnProperty(propOrLifecycleName)) {
        return async (pagePath, ...args: [string | Page, {}]) =>
          await parserRunner(
            {
              parserMethod: String(propOrLifecycleName),
              loadedPlugins: loadedPlugins as LoadedParser[]
            },
            pagePath,
            ...args
          );
      }
      if (baseObj.hasOwnProperty(propOrLifecycleName)) {
        return async (...args: [PluginInput, {}]) =>
          await pluginRunner(
            {
              loadedPlugins: loadedPlugins as LoadedPlugin[],
              lifecycleName: String(propOrLifecycleName)
            },
            ...args
          );
      }
      if (typeof obj[propOrLifecycleName] !== 'undefined') {
        return obj[propOrLifecycleName];
      }
    }
  });
}
