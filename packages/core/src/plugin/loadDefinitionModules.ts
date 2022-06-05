import type PluginModuleDefinition from '@pull-docs/types/dist/PluginModuleDefinition';
import type ParserModuleDefinition from '@pull-docs/types/dist/ParserModuleDefinition';
import type Plugin from '@pull-docs/types/dist/Plugin';
import type { LoadedParser } from '@pull-docs/types/dist/Parser';
import type { LoadedPlugin } from '@pull-docs/types/dist/Plugin';

const loadedPlugins: { [key: string]: LoadedPlugin | LoadedParser } = {};

export default async function loadDefinitionModules(
  plugins: (PluginModuleDefinition | ParserModuleDefinition)[]
): Promise<LoadedPlugin[] | LoadedParser[]> {
  const results = [];

  try {
    for (const plugin of plugins) {
      const { modulePath }: { modulePath: string } = plugin;
      if (!loadedPlugins[modulePath]) {
        const {
          default: definitionExports
        }: {
          default: Partial<Plugin> | { __esModule: boolean; default: Partial<Plugin> };
        } = await import(modulePath);
        const pluginApi: Partial<Plugin> =
          '__esModule' in definitionExports && 'default' in definitionExports
            ? definitionExports.default
            : definitionExports;
        if (!pluginApi) {
          throw new Error(`Plugin '${modulePath}' did not have a default export.`);
        }

        loadedPlugins[modulePath] = createInvoker(plugin, pluginApi);
      }
      results.push(loadedPlugins[modulePath]);
    }
    return results;
  } catch (e) {
    throw new Error(`Could not load plugin modules due to error.
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
