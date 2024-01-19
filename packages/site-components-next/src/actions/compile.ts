import { compileMDX } from 'next-mdx-remote/rsc';
import type { PluggableList } from 'unified';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import type { MDXComponents } from 'mdx/types';
import type { SiteState } from '@jpmorganchase/mosaic-loaders';

export type CompileOptions = {
  source: string;
  components: MDXComponents;
  data?: Partial<SiteState>;
  rehypePlugins?: PluggableList;
  remarkPlugins?: PluggableList;
  parseFrontmatter?: boolean;
};

export async function compile({
  source,
  data = {},
  components,
  rehypePlugins = [],
  remarkPlugins = [],
  parseFrontmatter = false
}: CompileOptions) {
  const { content } = await compileMDX({
    source,
    components,
    options: {
      scope: { meta: data },
      mdxOptions: {
        rehypePlugins: [rehypeSlug, ...rehypePlugins],
        remarkPlugins: [remarkGfm, ...remarkPlugins]
      },
      parseFrontmatter
    }
  });

  return content;
}

export type CompileAction = typeof compile;
