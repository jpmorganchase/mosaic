import path from 'path';

import type Page from '@jpmorganchase/mosaic-types/dist/Page';
import type PluginType from '@jpmorganchase/mosaic-types/dist/Plugin';
import { escapeRegExp } from 'lodash';

/**
 * Plugin that scrapes `aliases` from page metadata and also applies all aliases stored in `config.data.aliases`
 * Other plugins can use `setAliases` to apply new aliases, as long as they call it before this plugin has reaches `$beforeSend`
 */
const $AliasPlugin: PluginType<{ aliases: { [key: string]: Set<string> } }> = {
  async $afterSource(pages: Page<{ aliases?: string[] }>[], { config, ignorePages, pageExtensions }, options) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

    // Group together all aliases defined in the frontmatter and store them in the alias config object
    for (const page of pages) {
      if (!isNonHiddenPage(page.fullPath)) {
        continue;
      }
      if (page.aliases) {
        config.setAliases(page.fullPath, page.aliases);
      }
      delete page.aliases;
    }
    return pages;
  },

  async $beforeSend(mutableFilesystem, { config }) {
    // Prevent any more aliases being set after this lifecycle has been called - as they won't take effect
    config.setAliases = () => {
      throw new Error('Cannot set aliases after `$AliasPlugin` has reached `$beforeSend` lifecycle phase.');
    };    if (!config.data.aliases) {
      return;
    }
    for (const fullPath in config.data.aliases) {
      for (const alias of config.data.aliases[fullPath]) {
        const aliasPath = path.resolve(path.dirname(fullPath), alias).toLowerCase();
        const aliasDir = path.dirname(aliasPath);
        if (!(await mutableFilesystem.promises.exists(aliasDir))) {
          await mutableFilesystem.promises.mkdir(aliasDir, {
            recursive: true
          });
        }
        if (!(await mutableFilesystem.promises.exists(aliasPath))) {
          await mutableFilesystem.promises.symlink(fullPath, aliasPath);
        } else {
          console.warn(`Alias '${aliasPath}' already exists. Is there a duplicate alias, or a page with the same name but different file extensions?`);
        }
      }
    }
  }
};

export default $AliasPlugin;

function createPageTest(ignorePages, pageExtensions) {
  const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
  return file => {
    return !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
  };
}
