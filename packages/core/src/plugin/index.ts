import type { TDataOut } from 'memfs/lib/encoding';

import type {
  IVolumeMutable,
  Page,
  Plugin,
  PluginModuleDefinition,
  Serialiser
} from '@jpmorganchase/mosaic-types';

import loadPlugins from './createPluginAPI';

export async function bindSerialiser(serialisers): Promise<Serialiser> {
  const pluginApi = (await loadPlugins<Page>(serialisers)) as Serialiser;

  return {
    async serialise(fullPath, page) {
      return await pluginApi.serialise(fullPath, page);
    },
    async deserialise(fullPath, data) {
      return await pluginApi.deserialise(fullPath, data);
    }
  };
}

export async function bindPluginMethods(plugins: PluginModuleDefinition[]): Promise<Plugin> {
  const pluginApi = await loadPlugins<Page[] | TDataOut | IVolumeMutable>(plugins);

  return {
    async $afterSource(pages, args) {
      return await pluginApi.$afterSource(pages, args);
    },
    async shouldClearCache(lastAfterUpdateReturn, args) {
      return await pluginApi.shouldClearCache(lastAfterUpdateReturn, args);
    },
    async afterUpdate(mutableFilesystem, args) {
      return await pluginApi.afterUpdate(mutableFilesystem, args);
    },
    async $beforeSend(mutableFilesystem, args) {
      await pluginApi.$beforeSend(mutableFilesystem, args);
    }
  };
}
