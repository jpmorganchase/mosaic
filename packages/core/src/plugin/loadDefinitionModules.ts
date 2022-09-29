import type PluginModuleDefinition from '@pull-docs/types/dist/PluginModuleDefinition';
import type SerialiserModuleDefinition from '@pull-docs/types/dist/SerialiserModuleDefinition';
import type Plugin from '@pull-docs/types/dist/Plugin';
import type { LoadedSerialiser, Serialiser } from '@pull-docs/types/dist/Serialiser';
import type { LoadedPlugin } from '@pull-docs/types/dist/Plugin';

const loadedPluginsAndSerialisers: { [key: string]: LoadedPlugin | LoadedSerialiser } = {};

export default async function loadDefinitionModules(
  plugins: (PluginModuleDefinition | SerialiserModuleDefinition)[]
): Promise<LoadedPlugin[] | LoadedSerialiser[]> {
  const results = [];

  try {
    for (const plugin of plugins) {
      const { modulePath }: { modulePath: string } = plugin;
      if (!loadedPluginsAndSerialisers[modulePath]) {
        const {
          default: definitionExports
        }: {
          default: Partial<Plugin | Serialiser> | { __esModule: boolean; default: Partial<Plugin | Serialiser> };
        } = await import(modulePath);
        const pluginApi: Partial<Plugin | Serialiser> =
          '__esModule' in definitionExports && 'default' in definitionExports
            ? definitionExports.default
            : definitionExports;
        if (!pluginApi) {
          throw new Error(`Plugin or serialiser '${modulePath}' did not have a default export.`);
        }

        loadedPluginsAndSerialisers[modulePath] = createInvoker(plugin, pluginApi);
      }
      results.push(loadedPluginsAndSerialisers[modulePath]);
    }
    return results;
  } catch (e) {
    throw new Error(`Could not load plugin/serialiser modules due to error.
${e}`);
  }
}

function createInvoker(plugin, api) {
  return new Proxy(plugin, {
    get(obj, prop) {
      if (typeof obj[prop] !== 'undefined') {
        return obj[prop];
      }

      if (typeof api === 'function') {
        return api;
      }

      if (prop in api) {
        return api[prop];
      }
    }
  });
}
