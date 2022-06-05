import path from 'path';
import type PluginType from '@pull-docs/types/dist/Plugin';
import type Page from '@pull-docs/types/dist/Page';

/**
 * Sorts the pages in a folder alphabetically and then exports a JSON file (name: `options.filename`) with the
 * sidebar objects for each of those pages.
 */
const NextPrevPlugin: PluginType<
  {
    nextPrev: { [key: string]: string[] };
    refs: { [key: string]: { $$path: (number | string)[]; $$value: string }[] };
  },
  { filename: string }
> = {
  async $beforeSend(mutableFilesystem, { config, parser }, options) {
    for (const dirName in config.data.nextPrev) {
      const pages = config.data.nextPrev[dirName].slice(1).sort();
      pages.unshift(config.data.nextPrev[dirName][0]);
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          config.setRef(
            path.join(dirName, pages[i]),
            ['navigation', 'prev', 'title', '$ref'],
            `${path.join(dirName, pages[i - 1])}#/title`,
          );
          config.setRef(
            path.join(dirName, pages[i]),
            ['navigation', 'prev', 'route', '$ref'],
            `${path.join(dirName, pages[i - 1])}#/friendlyRoute`,
          );
        }
        if (i < pages.length - 1) {
          config.setRef(
            path.join(dirName, pages[i]),
            ['navigation', 'prev', 'title', '$ref'],
            `${path.join(dirName, pages[i + 1])}#/title`,
          );
          config.setRef(
            path.join(dirName, pages[i]),
            ['navigation', 'prev', 'route', '$ref'],
            `${path.join(dirName, pages[i + 1])}#/friendlyRoute`,
          );
        }
      }
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        config.setRef(
          path.join(dirName, options.filename),
          ['pages', i.toString(), 'title', '$ref'],
          `${path.join(dirName, page)}#/title`,
        );
        config.setRef(
          path.join(dirName, options.filename),
          ['pages', i.toString(), 'route', '$ref'],
          `${path.join(dirName, page)}#/friendlyRoute`,
        );
      }

      await mutableFilesystem.promises.writeFile(
        path.join(dirName, options.filename),
        '[]',
      );
    }
  },
  async $afterSource(pages: Page[], { config }) {
    const nextPrev = {};
    for (const page of pages.sort(
      ({ route: routeA }, { route: routeB }) => routeA.length - routeB.length
    )) {
      const dirName = path.dirname(page.route);
      nextPrev[dirName] = nextPrev[dirName] || [];
      if (/\/index(\.\w{1,4})?$/.test(page.route)) {
        nextPrev[dirName].unshift(path.basename(page.route));
      } else {
        nextPrev[dirName].push(path.basename(page.route));
      }
    }
    config.setData({ nextPrev });
    return pages;
  }
};

export default NextPrevPlugin;
