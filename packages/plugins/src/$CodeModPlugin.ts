import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { escapeRegExp } from 'lodash';
import path from 'path';

function createPageTest(ignorePages, pageExtensions) {
  const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
  return file =>
    !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
}

interface CodeModPluginPage extends Page {
  frameOverrides?: Record<string, unknown>;
  sharedConfig?: Record<string, unknown>;
}

const $CodeModPlugin: PluginType<CodeModPluginPage> = {
  async $afterSource(pages, { ignorePages, pageExtensions }) {
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
