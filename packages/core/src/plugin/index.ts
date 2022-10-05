import type { TDataOut } from 'memfs/lib/encoding';

import type Page from '@jpmorganchase/mosaic-types/dist/Page';
import type Serialiser from '@jpmorganchase/mosaic-types/dist/Serialiser';
import type Plugin from '@jpmorganchase/mosaic-types/dist/Plugin';
import type { IVolumeMutable } from '@jpmorganchase/mosaic-types/dist/Volume';
import type PluginModuleDefinition from '@jpmorganchase/mosaic-types/dist/PluginModuleDefinition';

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
