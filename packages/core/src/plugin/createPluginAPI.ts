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

function createProxyBaseAPI<ConfigData>(): Plugin<Page, ConfigData> {
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

export default async function createPluginAPI<PluginInput, ConfigData = Record<string, unknown>>(
  plugins: PluginModuleDefinition[]
): Promise<Plugin<Page, ConfigData>> {
  const loadedPlugins: LoadedPlugin[] | LoadedSerialiser[] = await loadDefinitionModules(plugins);
  const baseObj = createProxyBaseAPI<ConfigData>();
  const baseSerialiserObj = createProxyBaseSerialiserAPI();

  return new Proxy(baseObj, {
    get(obj, propOrLifecycleName) {
      if (Object.prototype.hasOwnProperty.call(baseSerialiserObj, propOrLifecycleName)) {
        return async (pagePath, ...args: [string | Page, Record<string, unknown>]) => {
          let result;
          try {
            result = await serialiserRunner(
              {
                serialiserMethod: String(propOrLifecycleName),
                loadedPlugins: loadedPlugins as LoadedSerialiser[]
              },
              pagePath,
              ...args
            );
          } catch (e) {
            throw new Error(e);
          }
          return result;
        };
      }
      if (Object.prototype.hasOwnProperty.call(baseObj, propOrLifecycleName)) {
        return async (...args: [PluginInput, Record<string, unknown>]) => {
          let result;
          try {
            result = await pluginRunner(
              {
                loadedPlugins: loadedPlugins as LoadedPlugin[],
                lifecycleName: String(propOrLifecycleName)
              },
              ...args
            );
          } catch (e) {
            throw new Error(e);
          }
          return result;
        };
      }
      if (typeof obj[propOrLifecycleName] !== 'undefined') {
        return obj[propOrLifecycleName];
      }
      return undefined;
    }
  });
}
