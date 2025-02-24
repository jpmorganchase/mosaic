import type {
  IVolumeMutable,
  Page,
  Plugin,
  PluginModuleDefinition,
  Serialiser,
  TrackPluginErrorCallback,
  TDataOut
} from '@jpmorganchase/mosaic-types';

import loadPlugins from './createPluginAPI.js';

export async function bindSerialiser(serialisers): Promise<Serialiser> {
  const pluginApi = (await loadPlugins<Page>(serialisers)) as Serialiser;

  return {
    async serialise(fullPath, page) {
      let result;
      try {
        result = await pluginApi.serialise(fullPath, page);
      } catch (e) {
        throw new Error(e);
      }
      return result;
    },
    async deserialise(fullPath, data) {
      let result;
      try {
        result = await pluginApi.deserialise(fullPath, data);
      } catch (e) {
        throw new Error(e);
      }
      return result;
    }
  };
}

export async function bindPluginMethods(
  plugins: PluginModuleDefinition[],
  track?: TrackPluginErrorCallback
): Promise<Plugin> {
  const pluginApi = await loadPlugins<Page[] | TDataOut | IVolumeMutable>(plugins, track);

  return {
    async $afterSource(pages, args) {
      const result = await pluginApi.$afterSource(pages, args);
      return result;
    },
    async shouldClearCache(lastAfterUpdateReturn, args) {
      const result = await pluginApi.shouldClearCache(lastAfterUpdateReturn, args);
      return result;
    },
    async afterUpdate(mutableFilesystem, args) {
      const result = await pluginApi.afterUpdate(mutableFilesystem, args);
      return result;
    },
    async $beforeSend(mutableFilesystem, args) {
      const result = await pluginApi.$beforeSend(mutableFilesystem, args);
      return result;
    },
    async shouldUpdateNamespaceSources(lastAfterUpdateReturn, args) {
      const result = await pluginApi.shouldUpdateNamespaceSources(lastAfterUpdateReturn, args);
      return result;
    },
    async afterNamespaceSourceUpdate(mutableFilesystem, args) {
      const result = await pluginApi.afterNamespaceSourceUpdate(mutableFilesystem, args);
      return result;
    }
  };
}
