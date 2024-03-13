import path from 'path';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import PluginError from './utils/PluginError.js';
import { createPageTest } from './utils/createPageTest.js';

interface AliasPluginPage extends Page {
  aliases?: string[];
}

/**
 * Plugin that scrapes `aliases` from page metadata and also applies all aliases stored in `config.data.aliases`
 * Other plugins can use `setAliases` to apply new aliases, as long as they call it before this plugin has reaches `$beforeSend`
 */
const $AliasPlugin: PluginType<AliasPluginPage> = {
  async $afterSource(pages, { config, ignorePages, pageExtensions }) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

    // Group together all aliases defined in the frontmatter and store them in the alias config object
    for (const page of pages) {
      try {
        if (!isNonHiddenPage(page.fullPath)) {
          continue;
        }
        if (page.aliases) {
          config.setAliases(page.fullPath, page.aliases);
        }
        delete page.aliases;
      } catch (e) {
        throw new PluginError(e.message, page.fullPath);
      }
    }
    return pages;
  },

  async $beforeSend(mutableFilesystem, { config }) {
    // Prevent any more aliases being set after this lifecycle has been called - as they won't take effect
    config.setAliases = () => {
      throw new Error(
        'Cannot set aliases after `$AliasPlugin` has reached `$beforeSend` lifecycle phase.'
      );
    };
    if (!config.data.aliases) {
      return;
    }
    for (const fullPath in config.data.aliases) {
      try {
        for (const alias of config.data.aliases[fullPath]) {
          const aliasPath = path.posix.resolve(path.dirname(fullPath), alias).toLowerCase();
          const aliasDir = path.dirname(aliasPath);
          if (!(await mutableFilesystem.promises.exists(aliasDir))) {
            await mutableFilesystem.promises.mkdir(aliasDir, {
              recursive: true
            });
          }
          if (!(await mutableFilesystem.promises.exists(aliasPath))) {
            await mutableFilesystem.promises.symlink(fullPath, aliasPath);
          } else {
            console.warn(
              `Alias '${aliasPath}' already exists. Is there a duplicate alias, or a page with the same name but different file extensions?`
            );
          }
        }
      } catch (e) {
        throw new PluginError(e.message, fullPath);
      }
    }
  }
};

export default $AliasPlugin;
