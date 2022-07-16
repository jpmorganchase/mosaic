import type { LoadedPlugin } from '@pull-docs/types/dist/Plugin';
import type { LoadedSerialiser } from '@pull-docs/types/dist/Serialiser';
import type Plugin from '@pull-docs/types/dist/Plugin';
import type PluginModuleDefinition from '@pull-docs/types/dist/PluginModuleDefinition';
import type Serialiser from '@pull-docs/types/dist/Serialiser';
import type Page from '@pull-docs/types/dist/Page';

import loadDefinitionModules from './loadDefinitionModules';
import serialiserRunner from './serialiserRunner';
import pluginRunner from './pluginRunner';

function createProxyBaseSerialiserAPI(): Serialiser {
  return {
    serialise() {
      throw new Error('This is just for the interface on the Proxy and should never be invoked.');
    },
    deserialise() {
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
  const loadedPlugins: LoadedPlugin[] | LoadedSerialiser[] = await loadDefinitionModules(plugins);
  const baseObj = createProxyBaseAPI<ConfigData>();
  const baseSerialiserObj = createProxyBaseSerialiserAPI();

  return new Proxy(baseObj, {
    // async apply(_obj, _this, args: [string, {}]) {
    //   // Only serialisers have a signature that is a function with no API methods on it
    //   return await serialiserRunner({ loadedPlugins: loadedPlugins as LoadedSerialiser[] }, ...args);
    // },
    get(obj, propOrLifecycleName) {
      if (baseSerialiserObj.hasOwnProperty(propOrLifecycleName)) {
        return async (pagePath, ...args: [string | Page, {}]) =>
          await serialiserRunner(
            {
              serialiserMethod: String(propOrLifecycleName),
              loadedPlugins: loadedPlugins as LoadedSerialiser[]
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
