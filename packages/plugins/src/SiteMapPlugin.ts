import type PluginType from '@pull-docs/types/dist/Plugin';

const SiteMapPlugin: PluginType<{ aliases: { [key: string]: Set<string> } }, { filename: string }> = {
  // Merge together all of the individual sitemaps from each source
  async afterUpdate(mutableFilesystem, { globalFilesystem, globalVolume, config }) {
    await globalVolume.promises.writeFile('/sitemap.xml', `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${(await globalFilesystem.promises.readFile('/.sitemap.json', {includeConflicts: true})).map(
      items =>
        JSON.parse(String(items)).map(item => `<url><loc>${String(
          item
        )}</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`).join('')
    )
        .join('')}
  </urlset>`);
  },
  // Create a sitemap for just this source, inside our own filesystem in the child process
  async $beforeSend(mutableFilesystem, { ignorePages }, options) {
    await mutableFilesystem.promises.writeFile(
      '/.sitemap.json',
      JSON.stringify(await mutableFilesystem.promises.glob('**', {
        onlyFiles: true,
        ignore: ignorePages.map(ignore => `**/${ignore}`),
        cwd: '/'
      }))
    );
  }
};

export default SiteMapPlugin;
