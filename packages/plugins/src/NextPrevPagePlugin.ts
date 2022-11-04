import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { escapeRegExp } from 'lodash';

function createFileGlob(url, pageExtensions) {
  if (pageExtensions.length === 1) {
    return `${url}${pageExtensions[0]}`;
  }
  return `${url}{${pageExtensions.join(',')}}`;
}

function createSortFn(
  pageExtensions: string[],
  { sortBy: _sortBy, indexFirst }: NextPrevPluginOptions
) {
  const indexRegExp =
    indexFirst && new RegExp(`index${pageExtensions.map(escapeRegExp).join('|')}$`);

  // TODO: Switch out the algorithm here, based on `sortBy`
  return function sortFn(fullPathA, fullPathB) {
    // Always pin /index to the front
    if (indexFirst && indexRegExp.test(fullPathA)) {
      return -1;
    }
    return fullPathA.localeCompare(fullPathB);
  };
}

interface NextPrevPluginPage extends Page {
  nextPrev: { [key: string]: string[] };
  refs: { [key: string]: { $$path: (number | string)[]; $$value: string }[] };
}

interface NextPrevPluginOptions {
  indexFirst?: boolean;
  sortBy?: string;
}

/**
 * Sorts the pages in a folder alphabetically and then embeds a `navigation` property to the metadata with ordered
 * next/prev pages
 */
const NextPrevPlugin: PluginType<NextPrevPluginPage, NextPrevPluginOptions> = {
  async $beforeSend(
    mutableFilesystem,
    { config, pageExtensions, ignorePages },
    { indexFirst, sortBy }
  ) {
    const pageDirs = (await mutableFilesystem.promises.glob('**', {
      onlyDirectories: true,
      ignore: ignorePages.map(ignore => `**/${ignore}`),
      cwd: '/'
    })) as string[];
    for (const dirName of pageDirs) {
      const pages = (
        await mutableFilesystem.promises.glob(createFileGlob('*', pageExtensions), {
          onlyFiles: true,
          cwd: dirName,
          ignore: ignorePages
        })
      ).sort(createSortFn(pageExtensions, { indexFirst, sortBy })) as string[];
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          config.setRef(
            pages[i],
            ['navigation', 'prev', 'title', '$ref'],
            `${pages[i - 1]}#/title`
          );
          config.setRef(
            pages[i],
            ['navigation', 'prev', 'fullPath', '$ref'],
            `${pages[i - 1]}#/route`
          );
        }
        if (i < pages.length - 1) {
          config.setRef(
            pages[i],
            ['navigation', 'next', 'title', '$ref'],
            `${pages[i + 1]}#/title`
          );
          config.setRef(
            pages[i],
            ['navigation', 'next', 'fullPath', '$ref'],
            `${pages[i + 1]}#/route`
          );
        }
      }
    }
  }
};

export default NextPrevPlugin;
