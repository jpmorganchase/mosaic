import type { PageDescriptor } from '@jpmorganchase/mosaic-types';

import createContent from './createContent';

const createRootIndex = async (
  contentRoot: string,
  pagePath: string,
  route: string,
  additionalMetadata: Record<string, unknown>
): Promise<PageDescriptor> => {
  const routeIndexMatcher = new RegExp('.*/(.+?)/index.html$');
  const routeIndexMatches = pagePath.match(routeIndexMatcher);
  const version = routeIndexMatches?.[1] ? routeIndexMatches[1] : 'Unknown';
  const className = 'typedoc-root-page';
  const descriptor = await createContent(contentRoot, pagePath, route, className);
  const headingMatcher = new RegExp('<H1.*?>(.+?)</H1>');
  const headingMatches = descriptor?.content.match(headingMatcher);
  const title = headingMatches?.[1]
    ? headingMatches[1].match(/^({' '})*(.*?)({' '})*$/)[2]
    : 'Unknown';
  const content = headingMatches
    ? descriptor.content.replace(headingMatches[0], '')
    : descriptor.content;

  return {
    content,
    meta: {
      ...descriptor?.meta,
      data: {
        ...descriptor?.meta?.data,
        api: {
          name: title,
          version,
          ...additionalMetadata
        },
        pageType: 'root',
        title
      },
      sidebar: {
        exclude: false,
        label: version
      },
      title
    }
  };
};

export default createRootIndex;
