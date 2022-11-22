import type { TDataOut } from 'memfs';

import type {
  IVolumeMutable,
  Page,
  Plugin,
  PluginModuleDefinition,
  Serialiser
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

export async function bindPluginMethods(plugins: PluginModuleDefinition[]): Promise<Plugin> {
  const pluginApi = await loadPlugins<Page[] | TDataOut | IVolumeMutable>(plugins);

  return {
    async $afterSource(pages, args) {
      let result;
      try {
        result = await pluginApi.$afterSource(pages, args);
      } catch (e) {
        throw new Error(e);
      }
      return result;
    },
    async shouldClearCache(lastAfterUpdateReturn, args) {
      let result;
      try {
        result = await pluginApi.shouldClearCache(lastAfterUpdateReturn, args);
      } catch (e) {
        throw new Error(e);
      }
      return result;
    },
    async afterUpdate(mutableFilesystem, args) {
      let result;
      try {
        result = await pluginApi.afterUpdate(mutableFilesystem, args);
      } catch (e) {
        throw new Error(e);
      }
      return result;
    },
    async $beforeSend(mutableFilesystem, args) {
      let result;
      try {
        result = await pluginApi.$beforeSend(mutableFilesystem, args);
      } catch (e) {
        throw new Error(e);
      }
      return result;
    },
    async saveContent(
      filePath: string,
      data: unknown,
      sourceOptions: Record<string, unknown>,
      args
    ) {
      let result;
      try {
        result = await pluginApi.saveContent(filePath, data, sourceOptions, args);
      } catch (e) {
        throw new Error(e);
      }
      return result;
    }
  };
}
