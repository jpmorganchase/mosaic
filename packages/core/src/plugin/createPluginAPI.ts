import type {
  LoadedPlugin,
  LoadedSerialiser,
  Page,
  Plugin,
  PluginModuleDefinition,
  Serialiser
} from '@jpmorganchase/mosaic-types';

import loadDefinitionModules from './loadDefinitionModules';
import pluginRunner from './pluginRunner';
import serialiserRunner from './serialiserRunner';

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
    shouldClearCache() {
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
