import type Page from '@pull-docs/types/dist/Page';
import type PluginType from '@pull-docs/types/dist/Plugin';

const SiteMapPlugin: PluginType<{ aliases: { [key: string]: Set<string> } }> = {
  async $afterSource(pages: Page<{ aliases?: string[] }>[], { config }, options) {
   return null;
  },

  async $beforeSend(mutableFilesystem, { config }) {
  }
};

export default SiteMapPlugin;
