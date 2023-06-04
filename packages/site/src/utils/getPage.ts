import { cache } from 'react';
import path from 'path';
import nodeFetch from 'node-fetch';
import { compileMDX } from 'next-mdx-remote/rsc';
import { Card, Cards, Hero } from '@jpmorganchase/mosaic-components';
import { SiteState, useStore } from '@jpmorganchase/mosaic-store';

export const getPage = cache(async pathname => {
  const url = path.join('http://localhost:8080', pathname);
  console.log('get url', url);
  const res = await nodeFetch(url);
  const source = await res.text();
  const { content, frontmatter } = await compileMDX({
    source,
    components: { Card, Cards, Hero },
    options: { parseFrontmatter: true }
  });
  const serverState = { ...frontmatter, source } as SiteState;
  useStore.setState(serverState);

  return { content, frontmatter, source };
});
