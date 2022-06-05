import type PluginType from '@pull-docs/types/dist/Plugin';
import type Page from '@pull-docs/types/dist/Page';
import path from 'path';

/**
 * Plugin that crawls the page hierarchy to find the closest `sharedConfig` from any parent index's page metadata.
 * It then exports a JSON file (name: `options.filename`) into each directory with the merged config for that level
 */
const SharedConfigPlugin: PluginType<
  {
    sharedConfig: { withoutConfig: string[]; indexesWithConfig: string[] };
    refs: { [key: string]: { $$path: string[]; $$value: string }[] };
  },
  { filename: string }
> = {
  async $beforeSend(mutableFilesystem, { config }, options) {
    const sortedIndexesWithConfig = config.data.sharedConfig.indexesWithConfig.sort(
      (routeA, routeB) => routeB.length - routeA.length
    );
    for (const configlessRoute of config.data.sharedConfig.withoutConfig) {
      let found = false;

      for (const configParentIndex of sortedIndexesWithConfig) {
        const configParentIndexDir = configParentIndex.replace(/\/index(\.[a-z]{1,4})?$/, '');
        if (configlessRoute.startsWith(configParentIndexDir)) {
          try {
            await mutableFilesystem.promises.writeFile(
              path.join(path.dirname(configlessRoute), options.filename),
              '{}'
            );
          } catch {}
          config.setRef(
            //configlessRoute,
            path.join(path.dirname(configlessRoute), options.filename),
            ['config', '$ref'],
            `${configParentIndexDir}/index#/sharedConfig`,
            
          );
          found = true;
          break;
        }
      }
      if (!found) {
        console.warn(`Could not find \`sharedConfig\` for '${configlessRoute}' to inherit from.`);
      }
    }
  },
  async $afterSource(pages: Page[], { config }) {
    const sharedConfig = {
      indexesWithConfig: [],
      withoutConfig: []
    };
    for (const page of pages.sort(
      ({ route: routeA }, { route: routeB }) => routeA.length - routeB.length
    )) {
      if (page.sharedConfig) {
        if (/\/index(\.[a-z]{1,4})?$/.test(page.route)) {
          sharedConfig.indexesWithConfig.push(page.route);
        }
      } else {
        sharedConfig.withoutConfig.push(page.route);
      }
    }
    config.setData({ sharedConfig });
    return pages;
  }
};

export default SharedConfigPlugin;
