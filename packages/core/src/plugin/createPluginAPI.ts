import type { LoadedPlugin } from '@jpmorganchase/mosaic-types/dist/Plugin';
import type { LoadedSerialiser } from '@jpmorganchase/mosaic-types/dist/Serialiser';
import type Plugin from '@jpmorganchase/mosaic-types/dist/Plugin';
import type PluginModuleDefinition from '@jpmorganchase/mosaic-types/dist/PluginModuleDefinition';
import type Serialiser from '@jpmorganchase/mosaic-types/dist/Serialiser';
import type Page from '@jpmorganchase/mosaic-types/dist/Page';

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
): Promise<Plugin<ConfigData>> {
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
