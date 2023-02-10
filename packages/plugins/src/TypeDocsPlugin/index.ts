// import path from 'path';
// import { escapeRegExp } from 'lodash-es';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';

// function createPageTest(ignorePages, pageExtensions) {
//   const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
//   const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
//   return file =>
//     !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
// }

interface AliasPluginPage extends Page {
  aliases?: string[];
}

/**
 * Plugin that scrapes `aliases` from page metadata and also applies all aliases stored in `config.data.aliases`
 * Other plugins can use `setAliases` to apply new aliases, as long as they call it before this plugin has reaches `$beforeSend`
 */
const TypeDocsPlugin: PluginType<AliasPluginPage> = {
  async $afterSource(pages) {
    //{ config, ignorePages, pageExtensions }
    console.log('***************typedocsPlugin');
    console.log(pages);

    // Group together all aliases defined in the frontmatter and store them in the alias config object

    return pages;
  }
};

export default TypeDocsPlugin;
