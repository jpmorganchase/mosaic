import type PluginType from '@pull-docs/types/dist/Plugin';

const SiteMapPlugin: PluginType<{ aliases: { [key: string]: Set<string> } }> = {
  async $beforeSend(mutableFilesystem, { config }) {
    await mutableFilesystem.promises.writeFile(
      '/sitemap.xml',
      Buffer.from(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${Object.keys(mutableFilesystem.toJSON())
      .map(
        route =>
          `<url><loc>${escapeXML(
            route
          )}</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`
      )
      .join('')}
  </urlset>`)
    );
  }
};

function escapeXML(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default SiteMapPlugin;
