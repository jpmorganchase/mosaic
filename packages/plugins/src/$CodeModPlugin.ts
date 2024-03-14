import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import PluginError from './utils/PluginError.js';
import { createPageTest } from './utils/createPageTest.js';

interface CodeModPluginPage extends Page {
  frameOverrides?: Record<string, unknown>;
  sharedConfig?: Record<string, unknown>;
}

const $CodeModPlugin: PluginType<CodeModPluginPage> = {
  async $afterSource(pages, { ignorePages, pageExtensions }) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

    for (const page of pages) {
      try {
        if (!isNonHiddenPage(page.fullPath)) {
          continue;
        }
        if (page.frameOverrides) {
          page.sharedConfig = page.frameOverrides;
          page.frameOverrides = { $ref: '#/sharedConfig' };
        }
      } catch (e) {
        throw new PluginError(e.message, page.fullPath);
      }
    }
    return pages;
  }
};

export default $CodeModPlugin;
