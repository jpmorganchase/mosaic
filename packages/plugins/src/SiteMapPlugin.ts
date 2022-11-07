import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';

interface SiteMapPluginConfigData {
  sitemaps: Array<string[]>;
}

const SiteMapPlugin: PluginType<Page, unknown, SiteMapPluginConfigData, SiteMapPluginConfigData> = {
  // Merge together all of the individual sitemaps from each source
  async afterUpdate(_, { sharedFilesystem, globalConfig }) {
    if (!Array.isArray(globalConfig.data.sitemaps)) {
      return;
    }

    const urls = globalConfig.data.sitemaps.map(items =>
      items
        .map(
          item =>
            `\t<url>\n\t\t<loc>${String(
              item
            )}</loc>\n\t\t<changefreq>weekly</changefreq>\n\t\t<priority>0.5</priority>\n\t</url>`
        )
        .join('\n')
    );

    const urlSet = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n ${urls}\n\n</urlset>`;
    await sharedFilesystem.promises.writeFile('/sitemap.xml', urlSet);
  },
  // Store a sitemap for just this source
  async $beforeSend(mutableFilesystem, { config, ignorePages }) {
    config.setData({
      sitemaps: [
        (await mutableFilesystem.promises.glob('**', {
          onlyFiles: true,
          ignore: ignorePages.map(ignore => `**/${ignore}`),
          cwd: '/'
        })) as Array<string>
      ]
    });
  }
};

export default SiteMapPlugin;
