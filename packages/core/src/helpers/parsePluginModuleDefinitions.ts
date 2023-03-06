import { merge } from 'lodash-es';

import type { PluginModuleDefinition } from '@jpmorganchase/mosaic-types';

/**
 * Filters duplicate plugin module definitions, merging them
 * together with the user-defined definition (a.k.a. the last
 * one) taking precedence in cases where there is duplication.
 *
 * This is useful for when a plugin is defined in the standard
 * generator but then also overridden by the user's config.
 *
 * @param plugins an array of plugin module definitions
 * @returns an array of plugin module definitions with duplicates removed
 */
export default function parsePluginModuleDefinitions(
  plugins: PluginModuleDefinition[]
): PluginModuleDefinition[] {
  const pluginsByPath = plugins.reduce((acc, plugin) => {
    if (acc[plugin.modulePath]) {
      acc[plugin.modulePath] = merge(acc[plugin.modulePath], plugin);
      return acc;
    }
    acc[plugin.modulePath] = plugin;
    return acc;
  }, {});

  return Object.values(pluginsByPath);
}
