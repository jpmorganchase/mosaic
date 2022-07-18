import type PluginType from '@pull-docs/types/dist/Plugin';
import { parseString } from 'xml2js';

function parseXMLString(string) {
  return new Promise((resolve, reject) => {
    parseString(string, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });
  });
}

const SiteMapPlugin: PluginType<{ aliases: { [key: string]: Set<string> } }> = {
  // Merge this sitemap with the others, in the main process' global filesystem
  async afterUpdate(mutableFilesystem, { globalFilesystem, serialiser, pageExtensions, config }) {
    if (await globalFilesystem.promises.exists('/sitemap.xml')) {
      const globalSiteMap = await parseXMLString(
        String(await globalFilesystem.promises.readFile('/sitemap.xml'))
      );
      const sourceSiteMap = (await parseXMLString(
        String(await mutableFilesystem.promises.readFile('/sitemap.xml'))
      )) as { urlset: { url: string[] } };

      (globalSiteMap as { urlset: { url: string[] } }).urlset.url.push(...sourceSiteMap.urlset.url);
      // TODO: We need a way to write this back to the global VFS
      // await globalFilesystem.promises.writeFile('/sitemap.xml', '');
    }
  },
  // Create a sitemap for just this source, inside our own filesystem in the child process
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
