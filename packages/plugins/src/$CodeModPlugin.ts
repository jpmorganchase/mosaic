import type PluginType from '@pull-docs/types/dist/Plugin';
import type Page from '@pull-docs/types/dist/Page';
import { escapeRegExp } from 'lodash';

const $CodeModPlugin: PluginType<{
  nextPrev: { [key: string]: string[] };
  refs: { [key: string]: { $$path: (number | string)[]; $$value: string }[] };
}> = {
  async $afterSource(pages: Page[], { pageExtensions }) {
    const pageTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);

    for (const page of pages) {
      if (!pageTest.test(page.route)) {
        continue;
      }
            if (page.frameOverrides) {
        page.sharedConfig = { $ref: '#/frameOverrides' };
      }
    }
    return pages;
  }
};

export default $CodeModPlugin;
