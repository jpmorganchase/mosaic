import type PluginType from '@jpmorganchase/mosaic-types/dist/Plugin';
import type Page from '@jpmorganchase/mosaic-types/dist/Page';
import { escapeRegExp } from 'lodash';
import path from 'path';

const $CodeModPlugin: PluginType<{
  nextPrev: { [key: string]: string[] };
  refs: { [key: string]: { $$path: (number | string)[]; $$value: string }[] };
}> = {
  async $afterSource(pages: Page[], { ignorePages, pageExtensions }) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

    for (const page of pages) {
      if (!isNonHiddenPage(page.fullPath)) {
        continue;
      }
      if (page.frameOverrides) {
        page.sharedConfig = page.frameOverrides;
        page.frameOverrides = { $ref: '#/sharedConfig' };
      }
    }
    return pages;
  }
};

export default $CodeModPlugin;

function createPageTest(ignorePages, pageExtensions) {
  const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
  return file => {
    return !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
  };
}
