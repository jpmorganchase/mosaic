// import path from 'path';
// import { escapeRegExp } from 'lodash-es';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
// import createContent from './createContent.js'

interface AliasPluginPage extends Page {
  aliases?: string[];
}

/**
 * Plugin that scrapes `aliases` from page metadata and also applies all aliases stored in `config.data.aliases`
 * Other plugins can use `setAliases` to apply new aliases, as long as they call it before this plugin has reaches `$beforeSend`
 */
const TypeDocsPlugin: PluginType<AliasPluginPage> = {
  async $afterSource(pages) {
    const sourcePages = pages.map(page => {
      // console.log('typedocSource')
      // console.log(page.content)
      // let content = createContent(page.content)

      return {
        content: page.content,
        fullPath: page.fullPath,
        lastModified: page.lastModified
      };
    });

    return sourcePages;
  }
};

export default TypeDocsPlugin;
