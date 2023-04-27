import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import path from 'path';

interface SiteMapPluginConfigData {
  sitemaps: Array<string[]>;
}

interface SiteMapPluginOptions {
  siteUrl: string;
}

const SiteMapPlugin: PluginType<
  Page,
  SiteMapPluginOptions,
  SiteMapPluginConfigData,
  SiteMapPluginConfigData
> = {
  // Merge together all of the individual sitemaps from each source
  async afterUpdate(_, { sharedFilesystem, globalConfig }, { siteUrl }) {
    if (!Array.isArray(globalConfig.data.sitemaps)) {
      return;
    }

    const urls = globalConfig.data.sitemaps.map(items =>
      items
        .map(
          item =>
            `\t<url>\n\t\t<loc>${new URL(
              path.posix.join(
                path.posix.dirname(item),
                path.posix.basename(item, path.posix.extname(item))
              ),
              siteUrl
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
