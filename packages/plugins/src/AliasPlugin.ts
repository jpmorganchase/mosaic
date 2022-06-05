import path from 'path';

import type Page from '@pull-docs/types/dist/Page';
import type PluginType from '@pull-docs/types/dist/Plugin';

/**
 * Plugin that scrapes `aliases` from page metadata and also applies all aliases stored in `config.data.aliases`
 * Other plugins can use `setAliases` to apply new aliases, as long as they call it before this plugin has reaches `$beforeSend`
 */
const AliasPlugin: PluginType<{ aliases: { [key: string]: Set<string> } }> = {
  async $afterSource(pages: Page<{ aliases?: string[] }>[], { config }, options) {
    // Group together all aliases defined in the frontmatter and store them in the alias config object
    for (const page of pages) {
      if (page.aliases) {
        config.setAliases(page.route, page.aliases);
      }
    }
    return pages;
  },

  async $beforeSend(mutableFilesystem, { config }) {
    // Prevent any more aliases being set after this lifecycle has been called - as they won't take effect
    config.setAliases = () => {
      throw new Error('Cannot set aliases after `AliasPlugin` has reaches `$beforeSend` lifecycle phase.');
    };    if (!config.data.aliases) {
      return;
    }
    for (const route in config.data.aliases) {
      for (const alias of config.data.aliases[route]) {
        const aliasPath = path.resolve(path.dirname(route), alias).toLowerCase();
        const aliasDir = path.dirname(aliasPath);
        if (!(await mutableFilesystem.promises.exists(aliasDir))) {
          await mutableFilesystem.promises.mkdir(aliasDir, {
            recursive: true
          });
        }
        if (!(await mutableFilesystem.promises.exists(aliasPath))) {
          await mutableFilesystem.promises.symlink(route, aliasPath);
        }
      }
    }
  }
};

export default AliasPlugin;
