import type { TDataOut } from 'memfs/lib/encoding';

import type Page from '@pull-docs/types/dist/Page';
import type Serialiser from '@pull-docs/types/dist/Serialiser';
import type Plugin from '@pull-docs/types/dist/Plugin';
import type { IVolumeMutable } from '@pull-docs/types/dist/Volume';
import type PluginModuleDefinition from '@pull-docs/types/dist/PluginModuleDefinition';

import loadPlugins from './createPluginAPI';

export async function bindSerialiser(serialisers): Promise<Serialiser> {
  const pluginApi = (await loadPlugins<Page>(serialisers)) as Serialiser;

  return {
    async serialise(route, page) {
      return await pluginApi.serialise(route, page);
    },
    async deserialise(route, data) {
      return await pluginApi.deserialise(route, data);
    }
  };
}

export async function bindPluginMethods(plugins: PluginModuleDefinition[]): Promise<Plugin> {
  const pluginApi = await loadPlugins<Page[] | TDataOut | IVolumeMutable>(plugins);

  return {
    async $afterSource(pages, args) {
      return await pluginApi.$afterSource(pages, args);
    },
    async shouldUpdate(lastAfterUpdateReturn, args) {
      return await pluginApi.shouldUpdate(lastAfterUpdateReturn, args);
    },
    async afterUpdate(mutableFilesystem, args) {
      return await pluginApi.afterUpdate(mutableFilesystem, args);
    },
    async $beforeSend(mutableFilesystem, args) {
      await pluginApi.$beforeSend(mutableFilesystem, args);
    }
  };
}
