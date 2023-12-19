'use server';

import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { ComponentProps } from 'react';
import type { MDXProvider } from '@mdx-js/react';
import { mdxComponents } from '@jpmorganchase/mosaic-site-components-next';
import { SiteState } from '@jpmorganchase/mosaic-loaders';

const components = mdxComponents as unknown as ComponentProps<typeof MDXProvider>['components'];

export async function compile({
  source,
  data = {}
}: {
  source: string;
  data?: Partial<SiteState>;
}) {
  const { content } = await compileMDX({
    source,
    components,
    options: {
      scope: { meta: data },
      mdxOptions: {
        rehypePlugins: [rehypeSlug],
        remarkPlugins: [remarkGfm]
      },
      parseFrontmatter: false
    }
  });

  return content;
}
