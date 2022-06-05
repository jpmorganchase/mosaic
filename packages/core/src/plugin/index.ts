import type { TDataOut } from 'memfs/lib/encoding';

import type Page from '@pull-docs/types/dist/Page';
import type Parser from '@pull-docs/types/dist/Parser';
import type Plugin from '@pull-docs/types/dist/Plugin';
import type { IVolumeMutable } from '@pull-docs/types/dist/Volume';
import type PluginModuleDefinition from '@pull-docs/types/dist/PluginModuleDefinition';

import loadPlugins from './createPluginAPI';

export async function bindParser(parsers): Promise<Parser> {
  const pluginApi = (await loadPlugins<Page>(parsers)) as Parser;

  return {
    async serialise(route, page) {
      return await pluginApi.serialise(route, page);
    },
    async deserialise(route, data) {
      return await pluginApi.deserialise(route, data);
    },
    async deserialiseFromDisk(route, pagePath) {
      return await pluginApi.deserialiseFromDisk(route, pagePath);
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
