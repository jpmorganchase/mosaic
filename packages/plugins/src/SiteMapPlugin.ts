import type { Plugin as PluginType } from '@jpmorganchase/mosaic-types';

const SiteMapPlugin: PluginType<{ sitemaps: string[][] }, {}> = {
  // Merge together all of the individual sitemaps from each source
  async afterUpdate(mutableFilesystem, { sharedFilesystem, globalConfig }) {
    if (!Array.isArray(globalConfig.data.sitemaps)) {
      return;
    }
    await sharedFilesystem.promises.writeFile(
      '/sitemap.xml',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        globalConfig.data.sitemaps
          .map(items =>
            items
              .map(
                item =>
                  `\t<url>\n\t\t<loc>${String(
                    item
                  )}</loc>\n\t\t<changefreq>weekly</changefreq>\n\t\t<priority>0.5</priority>\n\t</url>`
              )
              .join('\n')
          )
          .join('') +
        '\n</urlset>'
    );
  },
  // Store a sitemap for just this source
  async $beforeSend(mutableFilesystem, { config, ignorePages }, options) {
    config.setData({
      sitemaps: [
        (await mutableFilesystem.promises.glob('**', {
          onlyFiles: true,
          ignore: ignorePages.map(ignore => `**/${ignore}`),
          cwd: '/'
        })) as string[]
      ]
    });
  }
};

export default SiteMapPlugin;
