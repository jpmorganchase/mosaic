import path from 'path';
import Page from '@pull-docs/types/dist/Page';
import { createReleaseNote, createReleaseNotePreview } from './releaseNote';
import type { ConveyPage } from './index';

export function createPages(
  basePath: string,
  namespace: string,
  lastSyncedChangeTime: Date,
  conveyJSON: any
): Page[] {
  return conveyJSON.reduce((pages: Page<{}>[], jsonItem: ConveyPage) => {
    const { id, originalSubject, status, time } = jsonItem;

    const pageLastModifiedDate = new Date(time);
    if (status !== 'PUBLISHED' || pageLastModifiedDate <= lastSyncedChangeTime) {
      return pages;
    }
    const route = `/${path.relative(basePath, id)}`;
    const content = createReleaseNote(jsonItem);
    const preview = createReleaseNotePreview(jsonItem);
    pages.push({
      fullPath: `${route}.mdx`,
      route,
      content: content.join('\n'),
      meta: {
        description: originalSubject,
        lastModifiedDate: pageLastModifiedDate,
        layout: 'Newsletter',
        tags: ['release-note'],
        data: {
          date: pageLastModifiedDate,
          preview,
          ...jsonItem,
          originalLink: jsonItem.link,
          link: `/${namespace}${route}`
        },
        title: originalSubject
      }
    });
    return pages;
  }, []);
}
