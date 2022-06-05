import type PluginType from '@pull-docs/types/dist/Plugin';
import type Page from '@pull-docs/types/dist/Page';

const CodeModPlugin: PluginType<{
  nextPrev: { [key: string]: string[] };
  refs: { [key: string]: { $$path: (number | string)[]; $$value: string }[] };
}> = {
  async $afterSource(pages: Page[], { config }) {
    for (const page of pages) {
      if (page.frameOverrides) {
        page.sharedConfig = { $ref: '#/frameOverrides' };
      }
    }
    return pages;
  }
};

export default CodeModPlugin;
